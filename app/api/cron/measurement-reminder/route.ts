import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  LineMessagingError,
  buildMeasurementReminderMessages,
  getLineLiffUrl,
  sendPushMessage,
} from "@/lib/line-messaging";
import { dueMeasurementReminder } from "@/lib/measurement-reminder";
import { checkFriendship } from "@/lib/line-friendship";

export const runtime = "nodejs";

// ============================================================================
// GET|POST /api/cron/measurement-reminder?secret=... (or Authorization: Bearer ...)
//
// Called periodically (Supabase pg_cron → pg_net HTTP POST, see
// supabase/scheduled_measurement_reminder.sql). For every user with LINE
// notifications enabled it checks whether they are due to record new
// measurements (14 days since the last measurement_logs entry) and — if they
// have not been reminded recently — pushes a LINE message to their OA.
//
// Reminder cadence (`lib/measurement-reminder.ts`):
//   * first reminder fires once 14 calendar days have passed since the last
//     recorded measurements.
//   * if the user still has not logged, it repeats every 14 days (measured
//     from the last successful push).
//   * logging new measurements resets the clock.
//
// Guards (same as the weight-reminder cron):
//   * users.last_measurement_reminder_at updates only AFTER a successful push —
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
  last_measurement_reminder_at: string | null;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) {
    return true;
  }

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
      "user_id, line_user_id, oa_user_id, line_unreachable, last_measurement_reminder_at"
    )
    .eq("line_notifications_enabled", true)
    .eq("line_unreachable", false)
    .not("oa_user_id", "is", null);

  if (error) {
    console.error("[Measurement reminder] query failed", error);
    return apiError("ไม่สามารถดึงข้อมูลผู้ใช้ได้", 500, "INTERNAL_ERROR");
  }

  // Latest recorded_on per user, one query (ordered so the first row per user
  // is their most recent entry). Skip when there are no eligible users.
  const { data: logs } =
    users && users.length > 0
      ? await supabase
          .from("measurement_logs")
          .select("user_id, recorded_on")
          .in(
            "user_id",
            users.map((user) => user.user_id)
          )
          .order("recorded_on", { ascending: false })
      : { data: null };

  const lastRecordedByUser = new Map<string, string | null>();
  for (const log of logs ?? []) {
    if (!lastRecordedByUser.has(log.user_id)) {
      lastRecordedByUser.set(log.user_id, log.recorded_on);
    }
  }

  let sent = 0;
  let skippedUnreachable = 0;
  const friendshipCheckFailures = new Set<string>();

  for (const user of (users ?? []) as CronUser[]) {
    const lastRecordedDate = lastRecordedByUser.get(user.user_id) ?? null;

    if (
      !dueMeasurementReminder(nowMs, {
        lastRecordedDate,
        lastReminderAt: user.last_measurement_reminder_at,
      })
    ) {
      continue;
    }

    // Only push to users who are genuinely friends of the OA.
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
            `[Measurement reminder] friendship check failed for ${user.oa_user_id}`
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
        buildMeasurementReminderMessages(liffUrl)
      );

      const { error: markError } = await supabase
        .from("users")
        .update({ last_measurement_reminder_at: new Date().toISOString() })
        .eq("user_id", user.user_id);

      if (markError) {
        console.error("[Measurement reminder] mark failed", markError);
        continue;
      }

      sent += 1;
    } catch (pushError) {
      // Do not mark as reminded → the next run retries.
      console.error(
        `[Measurement reminder] push to ${user.oa_user_id} failed:`,
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
