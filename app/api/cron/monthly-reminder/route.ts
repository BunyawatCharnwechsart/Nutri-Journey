import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  LineMessagingError,
  buildMonthlyReminderMessages,
  buildPhotoReminderMessages,
  getLineLiffUrl,
  sendPushMessage,
} from "@/lib/line-messaging";
import {
  dueMonthlyReminder,
  monthlyCheckinStatus,
  shouldSendPhotoReminder,
} from "@/lib/monthly-reminder";
import { toICTMonthKey } from "@/lib/timezone";
import { checkFriendship } from "@/lib/line-friendship";

export const runtime = "nodejs";

// ============================================================================
// GET|POST /api/cron/monthly-reminder (Authorization: Bearer <CRON_SECRET>)
//
// Called daily (Supabase pg_cron → pg_net HTTP POST, see
// supabase/scheduled_monthly_reminder.sql). For every user with LINE
// notifications enabled it checks whether the current ICT month has rolled
// over since the last successful push (`users.last_monthly_reminder_at`) and —
// if it has — pushes up to TWO separate LINE messages on the day it rolls over
// (the 1st):
//   * the monthly check-in — pushes ONLY the lines the user has not done this
//     month (weight / measurements, read from weight_logs/measurement_logs).
//     If both are already recorded the check-in is skipped entirely.
//     Controlled by `monthly_reminder_enabled`.
//   * the photo-progress reminder — a SEPARATE push controlled by the user's
//     `photo_reminder_enabled` toggle and only when they have photo history
//     but have not uploaded for the current month yet (see
//     shouldSendPhotoReminder / photoReminderDue).
//
// This replaces the old weekly weight (7 days) / biweekly measurement
// (14 days) reminders. Each user receives at most ONE batch per ICT month,
// on the day the month rolls over (the 1st). Running daily (instead of only
// on the 1st) makes the check self-healing: if the 1st is missed the next
// day's run catches up, and the month-key gate prevents duplicates.
//
// Guards (same pattern as the previous reminder crons):
//   * users.last_monthly_reminder_at updates only AFTER a successful push —
//     failures retry on the next run.
//   * users without oa_user_id or with notifications disabled are skipped.
//   * unreachable users (unfollowed/blocked) are skipped and friendship is
//     re-verified right before the send; a 404 flips line_unreachable=true.
//   * protected by CRON_SECRET — never exposed to the browser.
// ============================================================================

interface CronUser {
  user_id: string;
  line_user_id: string | null;
  // Not null guarantee: the query filters `.not("oa_user_id", "is", null)`.
  oa_user_id: string;
  line_unreachable: boolean | null;
  last_monthly_reminder_at: string | null;
  display_name: string | null;
  // NULL (= never answered) reads as ON — see shouldSendPhotoReminder.
  photo_reminder_enabled: boolean | null;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  // Secret ผ่าน header อย่างเดียว — ห้ามรับผ่าน query string เพราะจะติด
  // access log / proxy history (OWASP: secret ห้ามอยู่ใน URL)
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const supabase = createServiceClient();
  const nowMs = Date.now();

  const { data: users, error } = await supabase
    .from("users")
    .select(
      "user_id, line_user_id, oa_user_id, line_unreachable, last_monthly_reminder_at, display_name, photo_reminder_enabled"
    )
    // Effective opt-in for the monthly check-in (migration 0030):
    //   monthly_reminder_enabled = true   → explicit opt-in
    //   monthly_reminder_enabled IS NULL  → inherit line_notifications_enabled
    //   monthly_reminder_enabled = false  → explicit opt-out
    .or(
      "monthly_reminder_enabled.eq.true,and(line_notifications_enabled.eq.true,monthly_reminder_enabled.is.null)"
    )
    .eq("line_unreachable", false)
    .not("oa_user_id", "is", null);

  if (error) {
    console.error("[Monthly reminder] query failed", error);
    return apiError("ไม่สามารถดึงข้อมูลผู้ใช้ได้", 500, "INTERNAL_ERROR");
  }

  let sent = 0;
  let skippedUnreachable = 0;
  const friendshipCheckFailures = new Set<string>();

  // First pass: only users whose month has rolled over since the last push.
  const dueUsers = ((users ?? []) as CronUser[]).filter((user) =>
    dueMonthlyReminder(nowMs, {
      lastReminderAt: user.last_monthly_reminder_at,
    })
  );

  if (dueUsers.length === 0) {
    return apiSuccess({ checked: users?.length ?? 0, sent: 0, skippedUnreachable: 0 });
  }

  // Collect the ICT month keys of each due user's progress photos in ONE query.
  // photoDue = has history but not yet this month (see photoReminderDue).
  const currentMonthKey = toICTMonthKey(new Date(nowMs));
  const { data: photoRows, error: photoError } = await supabase
    .from("progress_photos")
    .select("user_id, recorded_month")
    .in(
      "user_id",
      dueUsers.map((user) => user.user_id)
    );

  if (photoError) {
    console.error("[Monthly reminder] photo query failed", photoError);
    return apiError("ไม่สามารถดึงข้อมูลรูปถ่ายได้", 500, "INTERNAL_ERROR");
  }

  const monthsByUser = new Map<string, Set<string>>();
  for (const row of photoRows ?? []) {
    const set = monthsByUser.get(row.user_id) ?? new Set<string>();
    set.add(row.recorded_month);
    monthsByUser.set(row.user_id, set);
  }

  // Which of the due users have ALREADY logged their weight / measurements
  // this ICT month? Only the missing items are reminded (option A behavior).
  // recorded_on is a DATE ("yyyy-MM-dd"); the month is its first 7 chars
  // (same idiom as lib/weight-log.ts). The gte filter just trims the fetch;
  // the startsWith check guards the month boundary.
  const monthStart = `${currentMonthKey}-01`;
  const dueIds = dueUsers.map((user) => user.user_id);

  const [weightResult, measurementResult] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("user_id, recorded_on")
      .gte("recorded_on", monthStart)
      .in("user_id", dueIds),
    supabase
      .from("measurement_logs")
      .select("user_id, recorded_on")
      .gte("recorded_on", monthStart)
      .in("user_id", dueIds),
  ]);

  for (const [name, result] of [
    ["weight", weightResult],
    ["measurement", measurementResult],
  ] as const) {
    if (result.error) {
      console.error(`[Monthly reminder] ${name} query failed`, result.error);
      return apiError("ไม่สามารถดึงข้อมูลบันทึกได้", 500, "INTERNAL_ERROR");
    }
  }

  const weightDoneByUser = new Set<string>();
  for (const row of weightResult.data ?? []) {
    if ((row.recorded_on as string)?.startsWith(currentMonthKey)) {
      weightDoneByUser.add(row.user_id);
    }
  }

  const measurementDoneByUser = new Set<string>();
  for (const row of measurementResult.data ?? []) {
    if ((row.recorded_on as string)?.startsWith(currentMonthKey)) {
      measurementDoneByUser.add(row.user_id);
    }
  }

  for (const user of dueUsers) {
    // The photo push is an independent reminder: the user's own toggle AND
    // "has history but not this month yet" both have to be true.
    const sendPhoto = shouldSendPhotoReminder({
      photoReminderEnabled: user.photo_reminder_enabled,
      currentMonthKey,
      recordedMonthKeys: Array.from(monthsByUser.get(user.user_id) ?? []),
    });

    // The check-in only asks for what this user has NOT logged this month.
    const checkin = monthlyCheckinStatus({
      weightUpdatedThisMonth: weightDoneByUser.has(user.user_id),
      measurementUpdatedThisMonth: measurementDoneByUser.has(user.user_id),
    });

    // Only push to users who are genuinely friends of the OA. A 404
    // (unfriended/blocked) marks the user unreachable until a fresh `follow`
    // webhook or a successful line link.
    if (!friendshipCheckFailures.has(user.oa_user_id)) {
      const friendship = await checkFriendship(user.oa_user_id);
      if (friendship !== "friend") {
        if (friendship === "not_friend") {
          await supabase
            .from("users")
            .update({ line_unreachable: true })
            .eq("line_user_id", user.line_user_id);
          skippedUnreachable += 1;
        } else {
          // Server-side failure (e.g. 401/403) — try again next run.
          console.warn(
            `[Monthly reminder] friendship check failed for ${user.oa_user_id}`
          );
          friendshipCheckFailures.add(user.oa_user_id);
        }
        continue;
      }
    }

    let liffUrl: string;
    try {
      liffUrl = getLineLiffUrl();
    } catch {
      continue;
    }

    // Push the check-in message (only the missing lines) and, when due, the
    // separate photo reminder. A user who already logged BOTH this month needs
    // no check-in push at all — intendedCount stays zero and we mark it done.
    const intendedCount =
      (checkin.needsCheckin ? 1 : 0) + (sendPhoto ? 1 : 0);
    let pushedCount = 0;
    try {
      if (checkin.needsCheckin) {
        await sendPushMessage(
          user.oa_user_id,
          buildMonthlyReminderMessages(liffUrl, user.display_name, {
            weightDue: checkin.weightDue,
            measurementDue: checkin.measurementDue,
          })
        );
        pushedCount += 1;
      }

      if (sendPhoto) {
        await sendPushMessage(
          user.oa_user_id,
          buildPhotoReminderMessages(liffUrl, user.display_name)
        );
        pushedCount += 1;
      }
    } catch (pushError) {
      console.error(
        `[Monthly reminder] push to ${user.oa_user_id} failed:`,
        pushError instanceof LineMessagingError
          ? pushError.message
          : pushError
      );
    }

    // Mark reminded when every intended push went out — including the case
    // where NOTHING was pending (the user already did everything → mark so the
    // daily run stops re-checking this month). On a partial failure the next
    // daily run retries the whole batch (a repeat push is preferable to
    // silently dropping a reminder).
    if (pushedCount === intendedCount) {
      const { error: markError } = await supabase
        .from("users")
        .update({ last_monthly_reminder_at: new Date().toISOString() })
        .eq("user_id", user.user_id);

      if (markError) {
        console.error("[Monthly reminder] mark failed", markError);
        continue;
      }

      sent += 1;
    }
  }

  return apiSuccess({
    checked: users?.length ?? 0,
    sent,
    skippedUnreachable,
  });
}