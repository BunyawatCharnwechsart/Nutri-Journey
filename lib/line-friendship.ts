import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { LineMessagingError } from "@/lib/line-messaging";

// ============================================================================
// LINE OA friendship checks (Messaging API channel).
//
// Pushing a message to a user who is NOT a friend of the OA is wasted work
// (and, for a blocked user, LINE even answers 200 while silently dropping the
// message). Before pushing, the cron verifies friendship with
// `GET /v2/bot/profile/{userId}`:
//
//   * 200            → the user is a friend.
//   * 404            → not a friend / blocked / the user id does not exist on
//                      this channel (e.g. a different provider). Stop pushing.
//   * any other code → LINE is misbehaving; treat as a temporary failure.
//
// The user id passed in is the SAME id LINE uses on both the login and the OA
// channel (same provider), which is why users.oa_user_id === users.line_user_id.
//
// Friendship answers are cached in users.line_friend / checked timestamp so
// the dashboard does not call LINE on every load. Multiple users share the
// cache via their own row (no global state).
// ============================================================================

const PROFILE_URL = "https://api.line.me/v2/bot/profile";

/** How long a cached friendship answer is trusted before re-checking. */
export const FRIENDSHIP_CACHE_TTL_MS = 5 * 60 * 1000;

export type FriendshipStatus = "friend" | "not_friend" | "check_failed";

/**
 * True when the cached friendship answer has expired (or was never written),
 * meaning we should ask LINE again. Pure so it is easy to unit test.
 */
export function shouldRefreshFriendship(
  lastCheckedAt: string | null,
  now: number = Date.now(),
  ttlMs: number = FRIENDSHIP_CACHE_TTL_MS
): boolean {
  if (!lastCheckedAt) {
    return true;
  }
  const lastChecked = new Date(lastCheckedAt).getTime();
  if (Number.isNaN(lastChecked)) {
    return true;
  }
  return now - lastChecked >= ttlMs;
}

/**
 * Maps a `GET /v2/bot/profile/{userId}` response to our own status vocabulary.
 * Pure so it is easy to unit test.
 */
export function classifyProfileStatus(status: number): FriendshipStatus {
  if (status === 200) {
    return "friend";
  }
  if (status === 404) {
    return "not_friend";
  }
  return "check_failed";
}

/** Checks whether the user has added the LINE OA as a friend. */
export async function checkFriendship(
  lineUserId: string
): Promise<FriendshipStatus> {
  if (!lineUserId) {
    return "not_friend";
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new LineMessagingError("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }

  const res = await fetch(`${PROFILE_URL}/${lineUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return classifyProfileStatus(res.status);
}

export interface FriendshipCacheResult {
  /** true = friend, false = not a friend, null = the check failed. */
  friend: boolean | null;
  /** True when the answer is fresh (just checked or within the TTL). */
  fresh: boolean;
}

/**
 * Reads a user's friendship answer, re-checking with LINE when the cache is
 * empty or older than FRIENDSHIP_CACHE_TTL_MS. `force` skips the cache so the
 * "เพิ่มเพื่อนแล้ว กดตรวจสอบ" button always hits LINE.
 *
 * Results are persisted to users.line_friend / line_friendship_checked_at and
 * mirrored onto line_unreachable so the cron stops pushing to non-friends.
 * On a transient failure the timestamp is still refreshed (to avoid hammering
 * LINE) but the previous answer is kept.
 */
export async function getFriendshipCached(
  db: SupabaseClient,
  userId: string,
  force = false
): Promise<FriendshipCacheResult> {
  const { data } = await db
    .from("users")
    .select("line_user_id, line_friend, line_friendship_checked_at")
    .eq("user_id", userId)
    .maybeSingle();

  const knownFriend =
    data?.line_friend === true
      ? true
      : data?.line_friend === false
        ? false
        : null;
  const checkedAt = data?.line_friendship_checked_at ?? null;

  // A cached, still-fresh answer (and not forced) is good enough.
  if (
    !force &&
    knownFriend !== null &&
    !shouldRefreshFriendship(checkedAt)
  ) {
    return { friend: knownFriend, fresh: true };
  }

  const lineUserId = data?.line_user_id ?? "";
  if (!lineUserId) {
    return { friend: null, fresh: false };
  }

  let status: FriendshipStatus;
  try {
    status = await checkFriendship(lineUserId);
  } catch {
    console.error("[LINE friendship] check failed for", userId);
    // Keep the previous answer and schedule a retry by refreshing the timer.
    await db
      .from("users")
      .update({ line_friendship_checked_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { friend: knownFriend, fresh: false };
  }

  // Whether the call itself failed or not, record that we asked — this
  // throttles retries to one every TTL even while LINE is misbehaving.
  const now = new Date().toISOString();
  if (status === "friend" || status === "not_friend") {
    await db
      .from("users")
      .update({
        line_friend: status === "friend",
        line_friendship_checked_at: now,
        line_unreachable: status === "not_friend",
      })
      .eq("user_id", userId);
    return { friend: status === "friend", fresh: true };
  }

  await db
    .from("users")
    .update({ line_friendship_checked_at: now })
    .eq("user_id", userId);
  return { friend: knownFriend, fresh: false };
}