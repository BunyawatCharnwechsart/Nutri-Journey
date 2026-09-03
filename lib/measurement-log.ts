// Shared ICT date helpers are re-exported from lib/weight-log to avoid
// duplicating parsing logic.
import {
  diffCalendarDays,
  getICTDateKey,
} from "@/lib/weight-log";

export { diffCalendarDays, getICTDateKey };

// ============================================================================
// Pure measurement-update gate logic.
//
// The user may only record new measurements once every 14 days, counted by ICT
// calendar day since their LAST recorded entry (measurement_logs.recorded_on).
// A brand-new user with no history is always allowed to start.
//
// All helpers are pure (no I/O) so they are easy to unit test; the cron and
// the API routes feed DB values in here and act on the boolean result.
// ============================================================================

/** How many calendar days must pass before the user may update their measurements. */
export const MEASUREMENT_UPDATE_INTERVAL_DAYS = 14;

/**
 * Whether the user may record new measurements right now.
 *
 * Allowed when there is no recorded entry yet (`null` → brand-new user), or
 * when at least `days` calendar days have passed since their last entry.
 */
export function canUpdateMeasurement(
  nowMs: number,
  lastRecordedDate: string | null,
  days: number = MEASUREMENT_UPDATE_INTERVAL_DAYS
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
export function daysUntilNextMeasurementUpdate(
  nowMs: number,
  lastRecordedDate: string | null,
  days: number = MEASUREMENT_UPDATE_INTERVAL_DAYS
): number {
  if (!lastRecordedDate) {
    return 0;
  }
  const elapsed = diffCalendarDays(lastRecordedDate, getICTDateKey(nowMs));
  return Math.max(0, days - elapsed);
}
