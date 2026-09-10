import { toICT, toICTMonthKey } from "@/lib/timezone";

// ============================================================================
// Pure weight-update gate logic.
//
// The user may record a new weight ONCE per ICT calendar month — counted by
// the month of their LAST recorded entry (weight_logs.recorded_on). The gate
// is date-flexible (any day of the month), which matches the monthly LINE
// reminder on the 1st. A brand-new user with no history is always allowed.
//
// All helpers are pure (no I/O) so they are easy to unit test; the cron and
// the API routes feed DB values in here and act on the boolean result.
// ============================================================================

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

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

/** "yyyy-MM" of the ICT month that follows `monthKey`. */
function nextMonthKey(monthKey: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return toICTMonthKey(new Date(Date.UTC(year, month, 1))); // index = month → next month
}

/**
 * Whether the user may record a new weight right now.
 *
 * Allowed when there is no recorded entry yet (`null` → brand-new user), or
 * when their last entry falls in an earlier ICT month than the current one
 * (at most one entry per ICT calendar month).
 */
export function canUpdateWeight(
  nowMs: number,
  lastRecordedDate: string | null
): boolean {
  if (!lastRecordedDate) {
    return true;
  }
  return lastRecordedDate.slice(0, 7) !== toICTMonthKey(new Date(nowMs));
}

/**
 * Whole calendar days until the next allowed update (0 when already allowed).
 */
export function daysUntilNextUpdate(
  nowMs: number,
  lastRecordedDate: string | null
): number {
  if (!lastRecordedDate || canUpdateWeight(nowMs, lastRecordedDate)) {
    return 0;
  }
  const nextFirstKey = nextMonthKey(toICTMonthKey(new Date(nowMs))) + "-01";
  const nextFirstMs = parseDateKey(nextFirstKey)?.getTime() ?? 0;
  return Math.max(1, Math.ceil((nextFirstMs - nowMs) / 86_400_000));
}

/**
 * Short label for the NEXT allowed update day, e.g. "1 ก.ย." — used by the
 * locked state of the "อัปเดตน้ำหนัก" button. Returns null when the user may
 * update right now (the button should show instead of the label).
 */
export function nextMonthlyUpdateLabel(
  nowMs: number,
  lastRecordedDate: string | null
): string | null {
  if (!lastRecordedDate || canUpdateWeight(nowMs, lastRecordedDate)) {
    return null;
  }
  const nextFirstKey = nextMonthKey(toICTMonthKey(new Date(nowMs))) + "-01";
  const month = Number(nextFirstKey.slice(5, 7));
  return `1 ${THAI_MONTHS_SHORT[month - 1] ?? ""}`.trim();
}

/**
 * Inclusive ICT date-key window covering the current calendar year from
 * January 1 up to today. Used by the stats "1 ปี" view, which shows the
 * year-to-date data (ม.ค.–ปัจจุบัน) instead of a rolling 12-month window.
 */
export function getYearToDateWindow(
  nowMs: number
): { fromKey: string; toKey: string } {
  const toKey = getICTDateKey(nowMs);
  const year = Number(toKey.slice(0, 4));
  const fromKey = getICTDateKey(Date.UTC(year, 0, 1));
  return { fromKey, toKey };
}