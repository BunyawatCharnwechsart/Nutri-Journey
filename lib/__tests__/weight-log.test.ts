import { describe, expect, it } from "vitest";

import {
  canUpdateWeight,
  daysUntilNextUpdate,
  diffCalendarDays,
  getICTDateKey,
  getRecentWeightLogWindow,
  getYearToDateWindow,
  nextMonthlyUpdateLabel,
} from "@/lib/weight-log";

// 2026-09-02 00:00 UTC = 2026-09-02 07:00 ICT (same calendar day).
const BASE = Date.UTC(2026, 8, 2);

describe("canUpdateWeight (once per ICT month)", () => {
  it("allows a brand-new user with no history", () => {
    expect(canUpdateWeight(BASE, null)).toBe(true);
  });

  it("blocks a second entry in the same ICT month", () => {
    expect(canUpdateWeight(BASE, "2026-09-01")).toBe(false);
    expect(canUpdateWeight(BASE, "2026-09-15")).toBe(false);
    expect(canUpdateWeight(BASE, "2026-09-30")).toBe(false);
  });

  it("unlocks once the last entry is in an earlier month", () => {
    expect(canUpdateWeight(BASE, "2026-08-31")).toBe(true);
    expect(canUpdateWeight(BASE, "2026-08-01")).toBe(true);
    expect(canUpdateWeight(BASE, "2025-12-31")).toBe(true);
  });

  it("respects the ICT month boundary (17:00 UTC = next day)", () => {
    // 2026-08-31 16:59:59Z is still August ICT → same month as the entry.
    const augEnd = Date.UTC(2026, 7, 31, 16, 59, 59);
    expect(canUpdateWeight(augEnd, "2026-08-31")).toBe(false);
    // 2026-08-31 17:00:00Z is already September ICT → month rolled over.
    const sepStart = Date.UTC(2026, 7, 31, 17, 0, 0);
    expect(canUpdateWeight(sepStart, "2026-08-31")).toBe(true);
  });
});

describe("daysUntilNextUpdate", () => {
  it("returns 0 for a brand-new user", () => {
    expect(daysUntilNextUpdate(BASE, null)).toBe(0);
  });

  it("counts calendar days until the next month's 1st when locked", () => {
    // BASE = Sep 2 ICT; next allowed day is Oct 1 ICT → 29 days.
    expect(daysUntilNextUpdate(BASE, "2026-09-01")).toBe(29);
    expect(daysUntilNextUpdate(BASE, "2026-09-15")).toBe(29);
  });

  it("returns 0 as soon as the month has rolled over", () => {
    expect(daysUntilNextUpdate(BASE, "2026-08-31")).toBe(0);
    expect(daysUntilNextUpdate(BASE, "2026-07-01")).toBe(0);
  });

  it("rounds a near-midnight boundary up to a single day", () => {
    // Sep 30 23:30 ICT (Sep 30 16:30Z), locked this month → Oct 1 is tomorrow.
    const sep30Late = Date.UTC(2026, 8, 30, 16, 30, 0);
    expect(daysUntilNextUpdate(sep30Late, "2026-09-01")).toBe(1);
  });
});

describe("nextMonthlyUpdateLabel", () => {
  it("returns null when the user may update now", () => {
    expect(nextMonthlyUpdateLabel(BASE, null)).toBe(null);
    expect(nextMonthlyUpdateLabel(BASE, "2026-08-31")).toBe(null);
  });

  it("labels the next month's 1st when locked", () => {
    expect(nextMonthlyUpdateLabel(BASE, "2026-09-01")).toBe("1 ต.ค.");
    expect(nextMonthlyUpdateLabel(BASE, "2026-09-30")).toBe("1 ต.ค.");
  });

  it("rolls to January after December", () => {
    const dec = Date.UTC(2026, 11, 10);
    expect(nextMonthlyUpdateLabel(dec, "2026-12-01")).toBe("1 ม.ค.");
  });
});

describe("date-key helpers", () => {
  it("formats ICT calendar day from a UTC instant", () => {
    // 2026-08-31 20:00 UTC = 2026-09-01 03:00 ICT → next day!
    expect(getICTDateKey(Date.UTC(2026, 7, 31, 20))).toBe("2026-09-01");
    expect(getICTDateKey(Date.UTC(2026, 7, 31, 16))).toBe("2026-08-31");
  });

  it("computes whole-day differences", () => {
    expect(diffCalendarDays("2026-08-18", "2026-09-02")).toBe(15);
    expect(diffCalendarDays("2026-09-02", "2026-08-18")).toBe(-15);
    expect(diffCalendarDays(null, "2026-09-02")).toBe(0);
  });
});

describe("getRecentWeightLogWindow", () => {
  it("uses today (ICT) as the inclusive `to` bound", () => {
    const window = getRecentWeightLogWindow(Date.UTC(2026, 8, 5), 3);
    expect(window.toKey).toBe("2026-09-05");
  });

  it("shifts `from` back by the requested number of months", () => {
    expect(getRecentWeightLogWindow(Date.UTC(2026, 8, 5), 3).fromKey).toBe(
      "2026-06-05"
    );
    expect(getRecentWeightLogWindow(Date.UTC(2026, 8, 5), 1).fromKey).toBe(
      "2026-08-05"
    );
  });

  it("crosses year boundaries", () => {
    expect(getRecentWeightLogWindow(Date.UTC(2026, 0, 15), 3).fromKey).toBe(
      "2025-10-15"
    );
  });

  it("clamps to the last day of a shorter target month", () => {
    // 2026-05-31 minus 3 months = February 2026 (28 days, not a leap year).
    expect(getRecentWeightLogWindow(Date.UTC(2026, 4, 31), 3).fromKey).toBe(
      "2026-02-28"
    );
  });

  it("treats invalid input as a single-day window", () => {
    const window = getRecentWeightLogWindow(Date.UTC(2026, 8, 5), 0);
    expect(window).toEqual({ fromKey: "2026-09-05", toKey: "2026-09-05" });
  });
});

describe("getYearToDateWindow", () => {
  it("starts from January 1 of the current year and ends today (ICT)", () => {
    const window = getYearToDateWindow(Date.UTC(2026, 8, 6));
    expect(window).toEqual({ fromKey: "2026-01-01", toKey: "2026-09-06" });
  });

  it("keeps January 1 when the current day is early January", () => {
    const window = getYearToDateWindow(Date.UTC(2026, 0, 3));
    expect(window).toEqual({ fromKey: "2026-01-01", toKey: "2026-01-03" });
  });

  it("crosses into the new year's calendar window", () => {
    expect(getYearToDateWindow(Date.UTC(2026, 11, 31)).fromKey).toBe(
      "2026-01-01"
    );
    expect(getYearToDateWindow(Date.UTC(2027, 0, 2)).fromKey).toBe(
      "2027-01-01"
    );
  });
});