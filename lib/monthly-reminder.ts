import { getICTDay, toICTDateKey, toICTMonthKey } from "@/lib/timezone";

// ============================================================================
// Decide whether the monthly "update your weight, measurements & body photo"
// LINE cron should push right now. Pure logic — the cron route feeds the user's
// last-send timestamp and the current month's missing items in here and gets a
// boolean.
//
// Cadence:
//   * on the 1st of every ICT month it ALWAYS fires (the monthly check-in),
//     even when the user has already recorded everything.
//   * on any other day it fires ONLY while something is still missing — so the
//     reminder repeats once a day (never twice in the same ICT day) until the
//     user has updated weight, measurements and a body photo for the month.
//   * the push time is 08:00 ICT (01:00 UTC), see
//     supabase/scheduled_monthly_reminder.sql.
// ============================================================================

/** The three things the reminder tracks each ICT month. */
export type MonthlyReminderItem = "weight" | "measurements" | "photo";

export interface MonthlyReminderDateKeys {
  /** "yyyy-MM-01" — first day of the current ICT month. */
  monthStart: string;
  /** "yyyy-MM-01" — first day of the NEXT ICT month (exclusive upper bound). */
  nextMonthStart: string;
}

export interface MonthlyReminderInput {
  /** Last time this reminder was pushed (ISO timestamp), or null if never. */
  lastReminderAt: string | null;
  /** Items the user has NOT recorded yet this month. */
  missingItems: MonthlyReminderItem[];
}

/**
 * Inclusive range keys (as "yyyy-MM-01" strings) of the current ICT month.
 * Used to filter the weight/measurement/photo tables with a simple
 * `recorded_on >= monthStart AND recorded_on < nextMonthStart` (and, for
 * progress_photos, `recorded_month = monthStart`).
 */
export function getMonthlyReminderDateKeys(nowMs: number): MonthlyReminderDateKeys {
  const monthKey = toICTMonthKey(new Date(nowMs)); // "yyyy-MM"
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7)); // 1-12
  const pad2 = (value: number) => String(value).padStart(2, "0");

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    monthStart: `${monthKey}-01`,
    nextMonthStart: `${nextYear}-${pad2(nextMonth)}-01`,
  };
}

/**
 * Returns true when the monthly update reminder should be pushed for this user
 * right now.
 */
export function dueMonthlyReminder(
  nowMs: number,
  input: MonthlyReminderInput
): boolean {
  const now = new Date(nowMs);
  const todayKey = toICTDateKey(now);

  // Never nag twice in the same ICT day — last_monthly_reminder_at records the
  // last successful push and is compared by ICT day, not by exact time.
  const lastKey = input.lastReminderAt
    ? toICTDateKey(new Date(input.lastReminderAt))
    : null;
  if (lastKey === todayKey) {
    return false;
  }

  // The 1st of the month is an unconditional monthly check-in.
  if (getICTDay(now) === 1) {
    return true;
  }

  // Otherwise repeat daily only while some item is still missing.
  return input.missingItems.length > 0;
}