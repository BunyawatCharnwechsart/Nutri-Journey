import {
  diffCalendarDays,
  getICTDateKey,
  MEASUREMENT_UPDATE_INTERVAL_DAYS,
} from "@/lib/measurement-log";

// ============================================================================
// Decide whether the "update your measurements" LINE cron should push right
// now. Pure logic — the cron route feeds DB rows in here and gets a boolean.
//
// Cadence:
//   * the FIRST reminder fires as soon as 14 days (by ICT calendar day) have
//     passed since the user's last recorded measurements
//     (measurement_logs.recorded_on).
//   * if the user still has not recorded new measurements, the reminder
//     repeats every 14 days (measured from the last successful push).
//   * recording new measurements "resets" the timer: the 14-day clock always
//     counts from the newest recorded_on.
//   * users with no history at all (never recorded) are skipped — there is no
//     anchor to measure from.
// ============================================================================

/** Push cadence while the user keeps missing their update. */
export const MEASUREMENT_REMINDER_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

interface MeasurementReminderInput {
  /** The user's latest recorded_on ("yyyy-MM-dd" in ICT), or null if none. */
  lastRecordedDate: string | null;
  /** Last time this reminder was pushed (ISO timestamp), or null if never. */
  lastReminderAt: string | null;
}

function parseIsoMs(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Returns true when the measurement-update reminder should be pushed for this
 * user.
 */
export function dueMeasurementReminder(
  nowMs: number,
  input: MeasurementReminderInput
): boolean {
  if (!input.lastRecordedDate) {
    return false; // never recorded → no anchor to measure from
  }

  const elapsedDays = diffCalendarDays(
    input.lastRecordedDate,
    getICTDateKey(nowMs)
  );
  if (elapsedDays < MEASUREMENT_UPDATE_INTERVAL_DAYS) {
    return false; // not 14 days past their last entry yet
  }

  const lastReminderMs = parseIsoMs(input.lastReminderAt);
  if (lastReminderMs === null) {
    return true; // first reminder — always send when overdue
  }

  // Re-remind only after the full interval has elapsed since the last push.
  // A brand-new logged entry (lastReminderAt older than the new anchor) makes
  // this condition true naturally once 14 days from the NEW entry have passed.
  return nowMs - lastReminderMs >= MEASUREMENT_REMINDER_INTERVAL_MS;
}
