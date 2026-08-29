import "server-only";

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
// ============================================================================

const PROFILE_URL = "https://api.line.me/v2/bot/profile";

export type FriendshipStatus = "friend" | "not_friend" | "check_failed";

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