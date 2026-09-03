import { toICT } from "@/lib/timezone";

// ============================================================================
// Pure weight-update gate logic.
//
// The user may only record a new weight once every 7 days, counted by ICT
// calendar day since their LAST recorded entry (weight_logs.recorded_on).
// A brand-new user with no history is always allowed to start.
//
// All helpers are pure (no I/O) so they are easy to unit test; the cron and
// the API routes feed DB values in here and act on the boolean result.
// ============================================================================

/** How many calendar days must pass before the user may update their weight. */
export const WEIGHT_UPDATE_INTERVAL_DAYS = 7;

/** Returns the current day as "yyyy-MM-dd" in Asia/Bangkok (ICT). */
export function getICTDateKey(ms: number): string {
  const d = toICT(new Date(ms));
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

/** Whole calendar days between two "yyyy-MM-dd" keys (b - a, empty → null). */
export function diffCalendarDays(
  fromKey: string | null,
  toKey: string | null
): number {
  if (!fromKey || !toKey) {
    return 0;
  }
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) {
    return 0;
  }
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }
  const [, yearStr, monthStr, dayStr] = match;
  const date = new Date(
    Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Whether the user may record a new weight right now.
 *
 * Allowed when there is no recorded entry yet (`null` → brand-new user), or
 * when at least `days` calendar days have passed since their last entry.
 */
export function canUpdateWeight(
  nowMs: number,
  lastRecordedDate: string | null,
  days: number = WEIGHT_UPDATE_INTERVAL_DAYS
): boolean {
  if (!lastRecordedDate) {
    return true;
  }
  const elapsed = diffCalendarDays(lastRecordedDate, getICTDateKey(nowMs));
  return elapsed >= days;
}

/**
 * Whole calendar days until the next allowed update (0 when already allowed).
 */
export function daysUntilNextUpdate(
  nowMs: number,
  lastRecordedDate: string | null,
  days: number = WEIGHT_UPDATE_INTERVAL_DAYS
): number {
  if (!lastRecordedDate) {
    return 0;
  }
  const elapsed = diffCalendarDays(lastRecordedDate, getICTDateKey(nowMs));
  return Math.max(0, days - elapsed);
}