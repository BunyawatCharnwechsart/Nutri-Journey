import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// LINE notification readiness (Messaging API / OA channel).
//
// LINE user ids are scoped by provider: channels that belong to the same
// provider give the SAME user the SAME `U...` id. Our LIFF login channel and
// the OA (Messaging API) channel share a provider, so:
//
//     users.oa_user_id === users.line_user_id       (bound at login)
//
// No one-time-code handshake is needed anymore. The only thing a user must do
// to start receiving pushes is add the OA as a friend; `follow`/`unfollow`
// webhook events plus a `GET /v2/bot/profile/{id}` check keep the DB state in
// sync. See lib/line-friendship.ts.
// ============================================================================

export interface LineLinkState {
  linked: boolean;
  unreachable: boolean;
}

/**
 * True when the user is fully ready to receive LINE push notifications:
 * has an OA id, has not turned notifications off, and is not marked
 * unreachable (unfriended/blocked — the cron still checks friendship before
 * each send as a final gate).
 */
export async function isLineLinked(
  db: SupabaseClient,
  userId: string
): Promise<boolean> {
  const state = await getLineLinkState(db, userId);
  return state.linked;
}

/** Reads the raw readiness state so the UI can explain why it is not linked. */
export async function getLineLinkState(
  db: SupabaseClient,
  userId: string
): Promise<LineLinkState> {
  const { data } = await db
    .from("users")
    .select("oa_user_id, line_notifications_enabled, line_unreachable")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    linked: Boolean(
      data?.oa_user_id && data.line_notifications_enabled !== false
    ),
    unreachable: Boolean(data?.line_unreachable === true),
  };
}