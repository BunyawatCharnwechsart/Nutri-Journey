import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  LineMessagingError,
  buildMonthlyReminderMessages,
  getLineLiffUrl,
  sendPushMessage,
} from "@/lib/line-messaging";
import {
  type MonthlyReminderItem,
  dueMonthlyReminder,
  getMonthlyReminderDateKeys,
} from "@/lib/monthly-reminder";
import { checkFriendship } from "@/lib/line-friendship";

export const runtime = "nodejs";

// ============================================================================
// GET|POST /api/cron/monthly-reminder (Authorization: Bearer <CRON_SECRET>)
//
// Called daily at 01:00 UTC = 08:00 ICT (Supabase pg_cron → pg_net HTTP POST,
// see supabase/scheduled_monthly_reminder.sql). For every user with LINE
// notifications enabled it checks what the user has ALREADY recorded in the
// current ICT month — weight (weight_logs), measurements (measurement_logs)
// and a body photo (progress_photos) — then pushes a single LINE message that
// lists EXACTLY which of those three are still missing.
//
// Send gate (lib/monthly-reminder.ts dueMonthlyReminder):
//   * on the 1st of the current month it ALWAYS pushes (the monthly check-in),
//     even when everything is already recorded.
//   * on later days it pushes ONLY while something is still missing — so the
//     reminder repeats at most once per ICT day (gated by
//     users.last_monthly_reminder_at) until the user has updated everything.
//
// Guards (same pattern as the IF-notification cron):
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
      "user_id, line_user_id, oa_user_id, line_unreachable, last_monthly_reminder_at, display_name"
    )
    .eq("line_notifications_enabled", true)
    .eq("line_unreachable", false)
    .not("oa_user_id", "is", null);

  if (error) {
    console.error("[Monthly reminder] user query failed", error);
    return apiError("ไม่สามารถดึงข้อมูลผู้ใช้ได้", 500, "INTERNAL_ERROR");
  }

  // ---- What has each user already recorded in the current ICT month? ----
  // Batch-load each table once for the whole month instead of querying per
  // user — monthly volumes are tiny and the pattern stays readable.
  // "Recorded" = at least one row this month:
  //   * weight:       weight_logs.recorded_on  (a day in the current month)
  //   * measurements: measurement_logs.recorded_on
  //   * body photo:   progress_photos.recorded_month (first day of the month)
  const { monthStart, nextMonthStart } = getMonthlyReminderDateKeys(nowMs);

  const [weightRes, measurementRes, photoRes] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("user_id")
      .gte("recorded_on", monthStart)
      .lt("recorded_on", nextMonthStart),
    supabase
      .from("measurement_logs")
      .select("user_id")
      .gte("recorded_on", monthStart)
      .lt("recorded_on", nextMonthStart),
    supabase
      .from("progress_photos")
      .select("user_id")
      .eq("recorded_month", monthStart),
  ]);

  if (weightRes.error || measurementRes.error || photoRes.error) {
    console.error("[Monthly reminder] update-history query failed", {
      weight: weightRes.error?.message,
      measurements: measurementRes.error?.message,
      photos: photoRes.error?.message,
    });
    return apiError(
      "ไม่สามารถตรวจสอบข้อมูลการอัปเดตได้",
      500,
      "INTERNAL_ERROR"
    );
  }

  const weightRecorded = new Set((weightRes.data ?? []).map((row) => row.user_id));
  const measurementRecorded = new Set(
    (measurementRes.data ?? []).map((row) => row.user_id)
  );
  const photoRecorded = new Set((photoRes.data ?? []).map((row) => row.user_id));

  let sent = 0;
  let skippedUnreachable = 0;
  const friendshipCheckFailures = new Set<string>();

  for (const user of (users ?? []) as CronUser[]) {
    // Which of the three items is still missing for THIS user this month?
    const missingItems: MonthlyReminderItem[] = [];
    if (!weightRecorded.has(user.user_id)) {
      missingItems.push("weight");
    }
    if (!measurementRecorded.has(user.user_id)) {
      missingItems.push("measurements");
    }
    if (!photoRecorded.has(user.user_id)) {
      missingItems.push("photo");
    }

    if (
      !dueMonthlyReminder(nowMs, {
        lastReminderAt: user.last_monthly_reminder_at,
        missingItems,
      })
    ) {
      continue;
    }

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

    try {
      await sendPushMessage(
        user.oa_user_id,
        buildMonthlyReminderMessages(liffUrl, user.display_name, missingItems)
      );

      const { error: markError } = await supabase
        .from("users")
        .update({ last_monthly_reminder_at: new Date().toISOString() })
        .eq("user_id", user.user_id);

      if (markError) {
        console.error("[Monthly reminder] mark failed", markError);
        continue;
      }

      sent += 1;
    } catch (pushError) {
      // Do not mark as reminded → the next run retries.
      console.error(
        `[Monthly reminder] push to ${user.oa_user_id} failed:`,
        pushError instanceof LineMessagingError
          ? pushError.message
          : pushError
      );
    }
  }

  return apiSuccess({
    checked: users?.length ?? 0,
    sent,
    skippedUnreachable,
  });
}