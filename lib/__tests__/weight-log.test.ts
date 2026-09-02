import { describe, expect, it } from "vitest";

import {
  canUpdateWeight,
  daysUntilNextUpdate,
  diffCalendarDays,
  getICTDateKey,
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

  it("blocks before 15 full calendar days have passed", () => {
    expect(canUpdateWeight(BASE, key(-1))).toBe(false); // 14 days elapsed
  });

  it("unlocks exactly on the 15th calendar day", () => {
    expect(canUpdateWeight(BASE, key(-15))).toBe(true);
  });

  it("stays unlocked past 15 days", () => {
    expect(canUpdateWeight(BASE, key(-20))).toBe(true);
  });
});

describe("daysUntilNextUpdate", () => {
  it("returns 0 for a brand-new user", () => {
    expect(daysUntilNextUpdate(BASE, null)).toBe(0);
  });

  it("counts down the remaining days", () => {
    expect(daysUntilNextUpdate(BASE, key(-1))).toBe(14);
    expect(daysUntilNextUpdate(BASE, key(-10))).toBe(5);
  });

  it("floors at 0 once due", () => {
    expect(daysUntilNextUpdate(BASE, key(-15))).toBe(0);
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