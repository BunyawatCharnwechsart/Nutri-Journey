import { describe, expect, it } from "vitest";

import {
  canUpdateWeight,
  daysUntilNextUpdate,
  diffCalendarDays,
  getICTDateKey,
  getRecentWeightLogWindow,
} from "@/lib/weight-log";

const DAY = 86_400_000;

// 2026-09-02 00:00 UTC = 2026-09-02 07:00 ICT (same calendar day).
const BASE = Date.UTC(2026, 8, 2);

function key(daysOffset: number): string {
  return getICTDateKey(BASE + daysOffset * DAY);
}

describe("canUpdateWeight", () => {
  it("allows a brand-new user with no history", () => {
    expect(canUpdateWeight(BASE, null)).toBe(true);
  });

  it("blocks before 7 full calendar days have passed", () => {
    expect(canUpdateWeight(BASE, key(-1))).toBe(false); // 6 days elapsed
  });

  it("unlocks exactly on the 7th calendar day", () => {
    expect(canUpdateWeight(BASE, key(-7))).toBe(true);
  });

  it("stays unlocked past 7 days", () => {
    expect(canUpdateWeight(BASE, key(-20))).toBe(true);
  });
});

describe("daysUntilNextUpdate", () => {
  it("returns 0 for a brand-new user", () => {
    expect(daysUntilNextUpdate(BASE, null)).toBe(0);
  });

  it("counts down the remaining days", () => {
    expect(daysUntilNextUpdate(BASE, key(-1))).toBe(6);
    expect(daysUntilNextUpdate(BASE, key(-10))).toBe(0);
  });

  it("floors at 0 once due", () => {
    expect(daysUntilNextUpdate(BASE, key(-7))).toBe(0);
    expect(daysUntilNextUpdate(BASE, key(-30))).toBe(0);
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