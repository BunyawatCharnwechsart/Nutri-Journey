import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  LineMessagingError,
  buildMonthlyReminderMessages,
  getLineLiffUrl,
  sendPushMessage,
} from "@/lib/line-messaging";
import { dueMonthlyReminder } from "@/lib/monthly-reminder";
import { checkFriendship } from "@/lib/line-friendship";

export const runtime = "nodejs";

// ============================================================================
// GET|POST /api/cron/monthly-reminder (Authorization: Bearer <CRON_SECRET>)
//
// Called daily (Supabase pg_cron → pg_net HTTP POST, see
// supabase/scheduled_monthly_reminder.sql). For every user with LINE
// notifications enabled it checks whether the current ICT month has rolled
// over since the last successful push (`users.last_monthly_reminder_at`) and —
// if it has — pushes a single LINE message reminding them to update both
// weight and measurements.
//
// This replaces the old weekly weight (7 days) / biweekly measurement
// (14 days) reminders. Each user receives at most ONE message per ICT month,
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
    console.error("[Monthly reminder] query failed", error);
    return apiError("ไม่สามารถดึงข้อมูลผู้ใช้ได้", 500, "INTERNAL_ERROR");
  }

  let sent = 0;
  let skippedUnreachable = 0;
  const friendshipCheckFailures = new Set<string>();

  for (const user of (users ?? []) as CronUser[]) {
    if (
      !dueMonthlyReminder(nowMs, {
        lastReminderAt: user.last_monthly_reminder_at,
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
        buildMonthlyReminderMessages(liffUrl, user.display_name)
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