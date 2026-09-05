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

/**
 * Inclusive ICT date-key window covering the last `months` calendar months up
 * to today. Used by the weight history API to bound a line-chart query.
 *
 * Both bounds are inclusive. When the target month is shorter than the current
 * day (e.g. May 31 → February), the `from` bound clamps to the last day of
 * that month rather than rolling into the next month.
 */
export function getRecentWeightLogWindow(
  nowMs: number,
  months: number
): { fromKey: string; toKey: string } {
  const toKey = getICTDateKey(nowMs);
  const toDate = parseDateKey(toKey);

  if (!toDate || !Number.isFinite(months) || months <= 0) {
    return { fromKey: toKey, toKey };
  }

  const monthCount = Math.floor(months);
  const fromMonthDate = new Date(
    Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() - monthCount, 1)
  );
  const lastDay = new Date(
    Date.UTC(
      fromMonthDate.getUTCFullYear(),
      fromMonthDate.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  const fromDay = Math.min(toDate.getUTCDate(), lastDay);
  const fromKey = getICTDateKey(
    Date.UTC(
      fromMonthDate.getUTCFullYear(),
      fromMonthDate.getUTCMonth(),
      fromDay
    )
  );

  return { fromKey, toKey };
}

/**
 * Inclusive ICT date-key window covering one calendar quarter of `year`
 * (quarter 1-based: 1 = ม.ค.-มี.ค., 4 = ต.ค.-ธ.ค.). Used by the stats
 * "3 เดือน" view, which lets the user pick a quarter instead of a rolling
 * window.
 */
export function getQuarterWindow(
  year: number,
  quarter: number
): { fromKey: string; toKey: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;

  const fromKey = getICTDateKey(Date.UTC(year, startMonth - 1, 1));
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  const toKey = getICTDateKey(Date.UTC(year, endMonth - 1, lastDay));

  return { fromKey, toKey };
}

/** Current calendar quarter (1..4) and year in ICT — default for the tab. */
export function getICTCurrentQuarter(
  nowMs: number
): { year: number; quarter: number } {
  const key = getICTDateKey(nowMs);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return { year, quarter: Math.ceil(month / 3) };
}