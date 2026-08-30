import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  LineMessagingError,
  buildPhaseEndMessages,
  getLineLiffUrl,
  sendPushMessage,
} from "@/lib/line-messaging";
import { duePhaseNotification } from "@/lib/if-notifications";
import { checkFriendship } from "@/lib/line-friendship";

export const runtime = "nodejs";

// ============================================================================
// GET|POST /api/cron/if-notifications?secret=... (or Authorization: Bearer ...)
//
// Called periodically (supabase pg_cron → pg_net sends an HTTP POST every 1
// minute; a manual GET with the same secret also works for testing). It
// looks at every ACTIVE IF session, computes the planned end of the current
// phase from if_pattern (16:8 => 16h fasting, 8h eating), and pushes a LINE
// message to the user's OA account once the phase has finished its time.
//
// Reminders repeat while the phase is still running: `*_end_notified_at` holds
// the *last* successful send time and `duePhaseNotification` re-arms it every
// PHASE_REMINDER_INTERVAL_MS (10 min) as long as the phase end is still inside
// PHASE_REMINDER_WINDOW_MS (3 h). A phase the user already stopped is skipped
// (they acted, no reminder).
//
// Guards:
//   * `*_end_notified_at` is updated only after a successful push; on failure
//     the next run simply retries.
//   * users without an oa_user_id or with notifications disabled are skipped.
//   * unreachable users (unfollowed/blocked) are skipped, and — the 2a guard —
//     friendship is re-verified with GET /v2/bot/profile/{id} right before the
//     send. A 404 flips line_unreachable=true so we do not hammer LINE again.
//
// Protected by CRON_SECRET — never exposed to the browser. pg_cron is
// configured separately in Supabase with the header/query shown in the setup
// notes, so a random caller cannot trigger expensive pushes.
// ============================================================================

interface CronUser {
  line_user_id: string | null;
  oa_user_id: string | null;
  line_notifications_enabled: boolean | null;
  line_unreachable: boolean | null;
}

interface CronSession {
  id: string;
  fasting_start_time: string | null;
  fasting_end_time: string | null;
  fasting_end_notified_at: string | null;
  eating_start_time: string | null;
  eating_end_time: string | null;
  eating_end_notified_at: string | null;
  if_pattern: string | null;
  users?: CronUser | CronUser[] | null;
}

function getCronUser(users: CronSession["users"]): CronUser | null {
  if (!users) {
    return null;
  }
  return Array.isArray(users) ? (users[0] ?? null) : users;
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

  const { data: sessions, error } = await supabase
    .from("if_sessions")
    .select(
      `id, fasting_start_time, fasting_end_time, fasting_end_notified_at,
       eating_start_time, eating_end_time, eating_end_notified_at, if_pattern,
       users ( line_user_id, oa_user_id, line_notifications_enabled, line_unreachable )`
    )
    .eq("status", "active");

  if (error) {
    console.error("[IF notifications] query failed", error);
    return apiError("ไม่สามารถดึงข้อมูลเซสชันได้", 500, "INTERNAL_ERROR");
  }

  let sent = 0;
  let skippedUnlinked = 0;
  let skippedUnreachable = 0;
  const friendshipCheckFailures = new Set<string>();

  for (const session of sessions ?? []) {
    const user = getCronUser(session.users);
    if (!user?.oa_user_id) {
      skippedUnlinked += 1;
      continue;
    }
    if (user.line_notifications_enabled === false) {
      skippedUnlinked += 1;
      continue;
    }

    const decision = duePhaseNotification(nowMs, session);
    if (decision.kind !== "send") {
      continue;
    }

    // 2a guard: only push to users who are genuinely friends of the OA.
    // A 404 (unfriended/blocked/wrong id) marks the user unreachable until a
    // fresh `follow` webhook or a successful POST /api/v1/line/link.
    if (user.line_unreachable) {
      skippedUnreachable += 1;
      continue;
    }
    const friendshipKey = user.line_user_id ?? user.oa_user_id;
    if (!friendshipCheckFailures.has(friendshipKey)) {
      const friendship = await checkFriendship(user.oa_user_id);
      if (friendship !== "friend") {
        if (friendship === "not_friend") {
          await supabase
            .from("users")
            .update({ line_unreachable: true })
            .eq("line_user_id", user.line_user_id);
          skippedUnreachable += 1;
        } else {
          // Server-side failure (e.g. 401/403) — do not burn push quota now;
          // try again next run.
          console.warn(
            `[IF notifications] friendship check failed for ${user.oa_user_id}`
          );
          friendshipCheckFailures.add(friendshipKey);
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
        buildPhaseEndMessages(decision.phase, liffUrl)
      );

      const notifiedColumn =
        decision.phase === "fasting"
          ? "fasting_end_notified_at"
          : "eating_end_notified_at";

      const { error: markError } = await supabase
        .from("if_sessions")
        .update({ [notifiedColumn]: new Date().toISOString() })
        .eq("id", session.id);

      if (markError) {
        console.error("[IF notifications] mark failed", markError);
        continue;
      }

      sent += 1;
    } catch (pushError) {
      // e.g. LINE rejected the push. Do not mark as notified → the next run
      // will try again later.
      console.error(
        `[IF notifications] push to ${user.oa_user_id} failed:`,
        pushError instanceof LineMessagingError
          ? pushError.message
          : pushError
      );
    }
  }

  return apiSuccess({
    checked: sessions?.length ?? 0,
    sent,
    skippedUnlinked,
    skippedUnreachable,
  });
}