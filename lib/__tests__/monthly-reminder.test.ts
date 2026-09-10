import { describe, expect, it } from "vitest";

import { dueMonthlyReminder } from "@/lib/monthly-reminder";

// 2026-09-02 00:00 UTC = 2026-09-02 07:00 ICT (same calendar day).
const BASE = Date.UTC(2026, 8, 2);

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

describe("dueMonthlyReminder", () => {
  it("is due for users who never received a reminder (null)", () => {
    expect(dueMonthlyReminder(BASE, { lastReminderAt: null })).toBe(true);
  });

  it("is not due again later in the same ICT month", () => {
    const input = {
      // 2026-09-01 00:00 UTC = 2026-09-01 07:00 ICT.
      lastReminderAt: iso(Date.UTC(2026, 8, 1)),
    };
    expect(dueMonthlyReminder(BASE, input)).toBe(false);
    expect(dueMonthlyReminder(Date.UTC(2026, 8, 30), input)).toBe(false);
  });

  it("is due when the last push was in the previous month", () => {
    const input = {
      lastReminderAt: iso(Date.UTC(2026, 7, 20)), // August 2026
    };
    expect(dueMonthlyReminder(BASE, input)).toBe(true);
  });

  it("respects the ICT month boundary (17:00 UTC = next ICT day)", () => {
    // 2026-08-31 16:59:59Z is still August in ICT → next run is due.
    const beforeBoundary = { lastReminderAt: iso(Date.UTC(2026, 7, 31, 16, 59, 59)) };
    expect(dueMonthlyReminder(BASE, beforeBoundary)).toBe(true);

    // 2026-08-31 17:00:00Z is already September in ICT → same month as BASE.
    const atBoundary = { lastReminderAt: iso(Date.UTC(2026, 7, 31, 17, 0, 0)) };
    expect(dueMonthlyReminder(BASE, atBoundary)).toBe(false);
  });

  it("fires exactly once on the day the month rolls over", () => {
    // Oct 1 00:00 UTC = Oct 1 07:00 ICT. Last push in September → due now.
    const now = Date.UTC(2026, 9, 1);
    const input = { lastReminderAt: iso(Date.UTC(2026, 8, 30)) };
    expect(dueMonthlyReminder(now, input)).toBe(true);

    // After that push, the same month never fires again.
    const marked = { lastReminderAt: iso(Date.UTC(2026, 9, 1)) };
    expect(dueMonthlyReminder(Date.UTC(2026, 9, 30), marked)).toBe(false);
  });

  it("is due for a brand-new user who joined mid-month", () => {
    const now = Date.UTC(2026, 8, 15);
    expect(dueMonthlyReminder(now, { lastReminderAt: null })).toBe(true);
  });
});