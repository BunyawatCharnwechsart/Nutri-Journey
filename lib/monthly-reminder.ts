import { toICTMonthKey } from "@/lib/timezone";

// ============================================================================
// Decide whether the monthly "update your weight & measurements" LINE cron
// should push right now. Pure logic — the cron route feeds users.last_reminder
// in here and gets a boolean.
//
// Cadence:
//   * the reminder fires at most ONCE per ICT calendar month, on the day the
//     month rolls over (the 1st). The cron runs daily and this gate simply
//     compares the ICT month-key of "now" against the month-key of the last
//     successful push (users.last_monthly_reminder_at).
//   * recording weight/measurements does NOT reset the timer — the reminder
//     is a fixed monthly check-in regardless of activity.
//   * a null lastReminderAt means the user has never received one → always
//     due, so new users get their first monthly check-in on the next run.
// ============================================================================

export interface MonthlyReminderInput {
  /** Last time this reminder was pushed (ISO timestamp), or null if never. */
  lastReminderAt: string | null;
}

function toMonthKey(iso: string | null): string | null {
  const ms = new Date(iso ?? "").getTime();
  return Number.isNaN(ms) ? null : toICTMonthKey(new Date(ms));
}

/**
 * Returns true when the monthly update reminder should be pushed for this user.
 */
export function dueMonthlyReminder(
  nowMs: number,
  input: MonthlyReminderInput
): boolean {
  const currentMonthKey = toICTMonthKey(new Date(nowMs));
  return toMonthKey(input.lastReminderAt) !== currentMonthKey;
}

/**
 * Decides whether the photo line should be appended to the monthly message.
 *
 * Rule (no nagging users who never started):
 *   * no progress-photo history at all      → false (never encourages a habit
 *     that has not begun).
 *   * already uploaded in the current month → false (they did it).
 *   * has history but NOT this month        → true  (a gentle "did you take
 *     this month's photos yet?").
 *
 * `recordedMonthKeys` are the ICT month keys of the user's progress_photos
 * rows (e.g. "2026-09"). Pure so it can be unit tested.
 */
export function photoReminderDue(
  currentMonthKey: string,
  recordedMonthKeys: readonly string[]
): boolean {
  if (recordedMonthKeys.length === 0) {
    return false;
  }
  return !recordedMonthKeys.includes(currentMonthKey);
}

/**
 * Whether the separate photo-reminder push should be sent this month.
 *
 * Combines the user's own switch (`photoReminderEnabled`) with the write-up
 * rule from `photoReminderDue`:
 *
 *   * user toggled the photo reminder off           → false (their choice)
 *   * no progress-photo history at all              → false (no nagging)
 *   * already uploaded in the current month         → false (they did it)
 *   * enabled AND has history but NOT this month    → true
 *
 * `photoReminderEnabled` is the raw DB value: null (= never answered, 0031
 * keeps the old behavior) and true are "on", only an explicit false is "off".
 * Pure so it can be unit tested.
 */
export function shouldSendPhotoReminder(input: {
  photoReminderEnabled: boolean | null | undefined;
  currentMonthKey: string;
  recordedMonthKeys: readonly string[];
}): boolean {
  const enabled = input.photoReminderEnabled !== false;
  return enabled && photoReminderDue(input.currentMonthKey, input.recordedMonthKeys);
}

export interface MonthlyCheckinStatus {
  /** User has NOT logged their weight this ICT month yet. */
  weightDue: boolean;
  /** User has NOT logged their measurements this ICT month yet. */
  measurementDue: boolean;
  /** True when at least one line is still missing → the check-in push is needed. */
  needsCheckin: boolean;
}

/**
 * Decides which lines the monthly check-in message must ask for.
 *
 * The cron feeds in what it actually found in `weight_logs` /
 * `measurement_logs` for the current ICT month: anything already recorded is
 * dropped from the reminder (no nagging about completed items). When both are
 * already done no check-in push is sent at all — the photo reminder (if any)
 * is unaffected. Pure so it can be unit tested.
 */
export function monthlyCheckinStatus(input: {
  weightUpdatedThisMonth: boolean;
  measurementUpdatedThisMonth: boolean;
}): MonthlyCheckinStatus {
  const weightDue = !input.weightUpdatedThisMonth;
  const measurementDue = !input.measurementUpdatedThisMonth;
  return {
    weightDue,
    measurementDue,
    needsCheckin: weightDue || measurementDue,
  };
}