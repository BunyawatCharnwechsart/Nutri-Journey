import "server-only";

import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Account linking between the LIFF (login) channel and the LINE OA (Messaging
// API) channel.
//
// The user id from the login idToken (`users.line_user_id`) and the user id
// on the OA channel (`users.oa_user_id`) are NOT the same value. To be able
// to push messages we must bind the two once:
//
//   1. The app creates a random, single-use code via POST /api/v1/line/link.
//   2. The app sends `[NJ-LINK] <code>` into the OA chat using liff.sendMessages.
//   3. Our webhook receives that message with the OA-scoped userId, looks up
//      the code, and writes `users.oa_user_id`.
//   4. The cron job can then push notifications to that userId.
// ============================================================================

export const LINK_CODE_PREFIX = "[NJ-LINK]";

/** Codes expire after 10 minutes; too short frustrates users, too long helps attackers. */
const LINK_CODE_TTL_MS = 10 * 60 * 1000;
const LINK_CODE_REGEX = /^[a-f0-9]{24}$/;

/**
 * Pulls a link code out of a text message. Returns null when the text is not
 * a link message or the code does not look like one of ours.
 */
export function parseLinkCode(text: string): string | null {
  if (!text) {
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed.startsWith(LINK_CODE_PREFIX)) {
    return null;
  }
  const code = trimmed.slice(LINK_CODE_PREFIX.length).trim();
  return LINK_CODE_REGEX.test(code) ? code : null;
}

/** Creates a fresh, expiring link code for a user, replacing any old unused one. */
export async function createLinkCode(
  db: SupabaseClient,
  userId: string
): Promise<string> {
  // Old unused codes of this user are dead weight — clean them up.
  const { error: cleanupError } = await db
    .from("line_link_codes")
    .delete()
    .eq("user_id", userId)
    .is("used_at", null);

  if (cleanupError) {
    throw new Error("Failed to reset previous link code");
  }

  const code = randomBytes(12).toString("hex");

  const { error } = await db.from("line_link_codes").insert({
    user_id: userId,
    code,
    expires_at: new Date(Date.now() + LINK_CODE_TTL_MS).toISOString(),
  });

  if (error) {
    throw new Error("Failed to create link code");
  }

  return code;
}

/**
 * Binds an OA userId to the app user that owns a link code.
 *
 * Returns the app user_id when the link succeeds, or null when the code is
 * unknown, already used, expired, or already bound to another user.
 */
export async function consumeLinkCode(
  db: SupabaseClient,
  code: string,
  oaUserId: string
): Promise<string | null> {
  const { data: row, error } = await db
    .from("line_link_codes")
    .select("id, user_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (error || !row) {
    return null;
  }
  if (row.used_at) {
    return null;
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }

  // Safety: an OA account already linked to another app user must not be
  // re-bound here. (The unique index on users.oa_user_id is the final guard.)
  const { data: existing } = await db
    .from("users")
    .select("user_id")
    .eq("oa_user_id", oaUserId)
    .maybeSingle();

  if (existing && existing.user_id !== row.user_id) {
    return null;
  }

  const { error: bindError } = await db
    .from("users")
    .update({ oa_user_id: oaUserId })
    .eq("user_id", row.user_id);

  // 23505 = unique violation: another request bound the same OA account
  // first. Treat the race as "cannot link" rather than overriding it.
  if (bindError) {
    if (bindError.code === "23505") {
      return null;
    }
    throw new Error("Failed to bind LINE OA account");
  }

  await db
    .from("line_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  return row.user_id;
}

/** True when the user has a bound OA account id (so we can push messages). */
export async function isLineLinked(
  db: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await db
    .from("users")
    .select("oa_user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data?.oa_user_id);
}