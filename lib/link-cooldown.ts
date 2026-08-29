// ============================================================================
// Cooldown guard for the automatic "link LINE notification" attempts.
//
// The client tries to link the user's LINE OA account automatically when they
// open the app. Without a guard the app would push a fresh [NJ-LINK] code into
// the OA chat on every visit, which is spammy. This module stores a timestamp
// of the last auto attempt (localStorage) and only allows another attempt once
// the cooldown window has elapsed.
//
// The decision logic is pure (`shouldAutoAttempt`) so it is easy to unit test.
// localStorage reads/writes are isolated in small helpers.
// ============================================================================

export const DEFAULT_AUTO_LINK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 day

export const LOCAL_STORAGE_KEY = "nj_line_auto_attempt_at";

/**
 * Returns true when an auto attempt should run now.
 *
 * @param lastAttemptAtMs timestamp of the previous attempt (null = never)
 * @param nowMs          current time
 * @param cooldownMs     minimum gap between attempts
 */
export function shouldAutoAttempt(
  lastAttemptAtMs: number | null,
  nowMs: number,
  cooldownMs: number = DEFAULT_AUTO_LINK_COOLDOWN_MS
): boolean {
  if (!Number.isFinite(nowMs) || cooldownMs < 0) {
    return false;
  }
  if (lastAttemptAtMs === null || !Number.isFinite(lastAttemptAtMs)) {
    return true;
  }
  return nowMs - lastAttemptAtMs >= cooldownMs;
}

/** Reads the last auto-attempt timestamp from localStorage (null when absent). */
export function readLastAttempt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Records an auto-attempt timestamp so the next one waits for the cooldown. */
export function writeLastAttempt(nowMs: number = Date.now()): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCAL_STORAGE_KEY, String(nowMs));
}