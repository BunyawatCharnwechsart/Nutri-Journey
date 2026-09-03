import { describe, expect, it } from "vitest";

import {
  canUpdateMeasurement,
  daysUntilNextMeasurementUpdate,
  diffCalendarDays,
  getICTDateKey,
} from "@/lib/measurement-log";

const DAY = 86_400_000;

// 2026-09-02 00:00 UTC = 2026-09-02 07:00 ICT (same calendar day).
const BASE = Date.UTC(2026, 8, 2);

function key(daysOffset: number): string {
  return getICTDateKey(BASE + daysOffset * DAY);
}

describe("canUpdateMeasurement", () => {
  it("allows a brand-new user with no history", () => {
    expect(canUpdateMeasurement(BASE, null)).toBe(true);
  });

  it("blocks before 14 full calendar days have passed", () => {
    expect(canUpdateMeasurement(BASE, key(-1))).toBe(false); // 13 days elapsed
  });

  it("unlocks exactly on the 14th calendar day", () => {
    expect(canUpdateMeasurement(BASE, key(-14))).toBe(true);
  });

  it("stays unlocked past 14 days", () => {
    expect(canUpdateMeasurement(BASE, key(-20))).toBe(true);
  });
});

describe("daysUntilNextMeasurementUpdate", () => {
  it("returns 0 for a brand-new user", () => {
    expect(daysUntilNextMeasurementUpdate(BASE, null)).toBe(0);
  });

  it("counts down the remaining days", () => {
    expect(daysUntilNextMeasurementUpdate(BASE, key(-1))).toBe(13);
    expect(daysUntilNextMeasurementUpdate(BASE, key(-10))).toBe(4);
  });

  it("floors at 0 once due", () => {
    expect(daysUntilNextMeasurementUpdate(BASE, key(-14))).toBe(0);
    expect(daysUntilNextMeasurementUpdate(BASE, key(-30))).toBe(0);
  });
});

describe("date-key helpers (re-exported)", () => {
  it("formats ICT calendar day from a UTC instant", () => {
    expect(getICTDateKey(Date.UTC(2026, 7, 31, 20))).toBe("2026-09-01");
    expect(getICTDateKey(Date.UTC(2026, 7, 31, 16))).toBe("2026-08-31");
  });

  it("computes whole-day differences", () => {
    expect(diffCalendarDays("2026-08-18", "2026-09-02")).toBe(15);
    expect(diffCalendarDays(null, "2026-09-02")).toBe(0);
  });
});
