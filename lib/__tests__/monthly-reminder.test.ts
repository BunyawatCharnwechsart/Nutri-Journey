import { describe, expect, it } from "vitest";

import {
  dueMonthlyReminder,
  getMonthlyReminderDateKeys,
} from "@/lib/monthly-reminder";

// 2026-09-02 00:00 UTC = 2026-09-02 07:00 ICT (same calendar day).
const BASE = Date.UTC(2026, 8, 2);

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

const ALL_MISSING = ["weight", "measurements", "photo"];
const NOTHING_MISSING: string[] = [];

describe("getMonthlyReminderDateKeys", () => {
  it("returns inclusive day bounds of the current ICT month", () => {
    const keys = getMonthlyReminderDateKeys(BASE); // September 2026 ICT
    expect(keys).toEqual({
      monthStart: "2026-09-01",
      nextMonthStart: "2026-10-01",
    });
  });

  it("wraps to the next year in December", () => {
    const now = Date.UTC(2026, 11, 15); // December 2026
    expect(getMonthlyReminderDateKeys(now)).toEqual({
      monthStart: "2026-12-01",
      nextMonthStart: "2027-01-01",
    });
  });

  it("uses the ICT month, not UTC — 17:00 UTC on the last day is next month", () => {
    // 2026-08-31 17:00:00 UTC = 2026-09-01 00:00 ICT → already September.
    const now = Date.UTC(2026, 7, 31, 17, 0, 0);
    expect(getMonthlyReminderDateKeys(now).monthStart).toBe("2026-09-01");
  });
});

describe("dueMonthlyReminder", () => {
  it("fires on the 1st of the month even when everything is recorded", () => {
    const first = Date.UTC(2026, 8, 1);
    expect(
      dueMonthlyReminder(first, {
        lastReminderAt: iso(Date.UTC(2026, 7, 31)), // last month
        missingItems: NOTHING_MISSING,
      })
    ).toBe(true);
  });

  it("fires on the 1st even for a brand-new user who never got a reminder", () => {
    const first = Date.UTC(2026, 8, 1);
    expect(
      dueMonthlyReminder(first, {
        lastReminderAt: null,
        missingItems: NOTHING_MISSING,
      })
    ).toBe(true);
  });

  it("never fires twice in the same ICT day — even on the 1st", () => {
    const first = Date.UTC(2026, 8, 1);
    const already = {
      // 00:00 UTC Sep 1 = 07:00 ICT Sep 1 → same ICT day as `first`.
      lastReminderAt: iso(Date.UTC(2026, 8, 1)),
      missingItems: ALL_MISSING,
    };
    expect(dueMonthlyReminder(first, already)).toBe(false);
  });

  it("repeats daily on non-1st days while something is still missing", () => {
    expect(
      dueMonthlyReminder(BASE, { lastReminderAt: null, missingItems: ALL_MISSING })
    ).toBe(true);
    expect(
      dueMonthlyReminder(BASE, {
        lastReminderAt: iso(Date.UTC(2026, 8, 2)),
        missingItems: ALL_MISSING,
      })
    ).toBe(false); // already told today
    expect(
      dueMonthlyReminder(Date.UTC(2026, 8, 3), {
        lastReminderAt: iso(Date.UTC(2026, 8, 2)), // told yesterday
        missingItems: ALL_MISSING,
      })
    ).toBe(true); // next day → due again
  });

  it("stops nagging once every item is recorded (non-1st day)", () => {
    expect(
      dueMonthlyReminder(BASE, {
        lastReminderAt: null,
        missingItems: NOTHING_MISSING,
      })
    ).toBe(false);
    expect(
      dueMonthlyReminder(Date.UTC(2026, 8, 15), {
        lastReminderAt: iso(Date.UTC(2026, 8, 2)),
        missingItems: NOTHING_MISSING,
      })
    ).toBe(false);
  });

  it("re-arms on the 1st of the following month", () => {
    const octFirst = Date.UTC(2026, 9, 1);
    expect(
      dueMonthlyReminder(octFirst, {
        lastReminderAt: iso(Date.UTC(2026, 8, 30)),
        missingItems: NOTHING_MISSING, // even if recorded last month
      })
    ).toBe(true);
  });

  it("respects the ICT day boundary (17:00 UTC is the next ICT day)", () => {
    // 2026-09-01 16:59:59Z = Sep 1 ICT → same day as `first` → skip.
    const first = Date.UTC(2026, 8, 1);
    expect(
      dueMonthlyReminder(first, {
        lastReminderAt: iso(Date.UTC(2026, 8, 1, 16, 59, 59)),
        missingItems: ALL_MISSING,
      })
    ).toBe(false);

    // But 2026-08-31 17:00:00Z is already Sep 1 ICT → different day → only
    // blocked when "today" is actually skipped; here it is a fresh day.
    const sepFirstIcT = Date.UTC(2026, 8, 31, 17, 1, 0);
    expect(
      dueMonthlyReminder(sepFirstIcT, {
        lastReminderAt: iso(Date.UTC(2026, 8, 31, 16, 59, 59)), // Aug 31 ICT
        missingItems: ALL_MISSING,
      })
    ).toBe(true);
  });
});