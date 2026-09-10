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