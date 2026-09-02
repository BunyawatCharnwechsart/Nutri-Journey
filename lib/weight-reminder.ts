import {
  diffCalendarDays,
  getICTDateKey,
  WEIGHT_UPDATE_INTERVAL_DAYS,
} from "@/lib/weight-log";

// ============================================================================
// Decide whether the daily "update your weight" LINE cron should push right
// now. Pure logic — the cron route feeds DB rows in here and gets a boolean.
//
// Cadence:
//   * the FIRST reminder fires as soon as 15 days (by ICT calendar day) have
//     passed since the user's last recorded weight (weight_logs.recorded_on).
//   * if the user still has not recorded a new weight, the reminder repeats
//     every 15 days (measured from the last successful push).
//   * recording a new weight "resets" the timer: the 15-day clock always
//     counts from the newest recorded_on.
//   * users with no history at all (never recorded) are skipped — there is no
//     anchor to measure from.
// ============================================================================

/** Push cadence while the user keeps missing their update. */
export const WEIGHT_REMINDER_INTERVAL_MS = 15 * 24 * 60 * 60 * 1000;

interface WeightReminderInput {
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
 * Returns true when the weight-update reminder should be pushed for this user.
 */
export function dueWeightReminder(
  nowMs: number,
  input: WeightReminderInput
): boolean {
  if (!input.lastRecordedDate) {
    return false; // never recorded → no anchor to measure from
  }

  const elapsedDays = diffCalendarDays(input.lastRecordedDate, getICTDateKey(nowMs));
  if (elapsedDays < WEIGHT_UPDATE_INTERVAL_DAYS) {
    return false; // not 15 days past their last entry yet
  }

  const lastReminderMs = parseIsoMs(input.lastReminderAt);
  if (lastReminderMs === null) {
    return true; // first reminder — always send when overdue
  }

  // Re-remind only after the full interval has elapsed since the last push.
  // A brand-new logged entry (lastReminderAt older than the new anchor) makes
  // this condition true naturally once 15 days from the NEW entry have passed.
  return nowMs - lastReminderMs >= WEIGHT_REMINDER_INTERVAL_MS;
}