import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  LineMessagingError,
  buildPhaseEndMessages,
  getLineLiffUrl,
  sendPushMessage,
} from "@/lib/line-messaging";
import { duePhaseNotification } from "@/lib/if-notifications";

export const runtime = "nodejs";

// ============================================================================
// GET /api/cron/if-notifications?secret=... (or Authorization: Bearer ...)
//
// Called periodically (supabase pg_cron → pg_net, e.g. every 5 minutes). It
// looks at every ACTIVE IF session, computes the planned end of the current
// phase from if_pattern (16:8 => 16h fasting, 8h eating), and pushes a LINE
// message to the user's OA account once the phase has finished its time.
//
// Guards against duplicates:
//   * dedupe row `*_end_notified_at` is set only after a successful push.
//   * a phase the user already stopped is skipped (they acted, no reminder).
//   * users without a linked OA account (oa_user_id) are skipped.
//
// Protected by CRON_SECRET — never exposed to the browser. pg_cron is
// configured separately in Supabase with the header/query shown in the setup
// notes, so a random caller cannot trigger expensive pushes.
// ============================================================================

interface CronSession {
  id: string;
  fasting_start_time: string | null;
  fasting_end_time: string | null;
  fasting_end_notified_at: string | null;
  eating_start_time: string | null;
  eating_end_time: string | null;
  eating_end_notified_at: string | null;
  if_pattern: string | null;
  users?:
    | { oa_user_id: string | null }
    | { oa_user_id: string | null }[]
    | null;
}

function getOaUserId(users: CronSession["users"]): string | null {
  if (!users) {
    return null;
  }
  if (Array.isArray(users)) {
    return users[0]?.oa_user_id ?? null;
  }
  return users.oa_user_id ?? null;
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
       users ( oa_user_id )`
    )
    .eq("status", "active");

  if (error) {
    console.error("[IF notifications] query failed", error);
    return apiError("ไม่สามารถดึงข้อมูลเซสชันได้", 500, "INTERNAL_ERROR");
  }

  let sent = 0;
  let skippedLinking = 0;

  for (const session of sessions ?? []) {
    const oaUserId = getOaUserId(session.users);
    if (!oaUserId) {
      skippedLinking += 1;
      continue;
    }

    const decision = duePhaseNotification(nowMs, session);
    if (decision.kind !== "send") {
      continue;
    }

    let liffUrl: string;
    try {
      liffUrl = getLineLiffUrl();
    } catch {
      continue;
    }

    try {
      await sendPushMessage(
        oaUserId,
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
      // e.g. LINE returned 400 because the user has not added the OA as a
      // friend. Do not mark as notified → the next run will try again later.
      console.error(
        `[IF notifications] push to ${oaUserId} failed:`,
        pushError instanceof LineMessagingError
          ? pushError.message
          : pushError
      );
    }
  }

  return apiSuccess({ checked: sessions?.length ?? 0, sent, skippedLinking });
}