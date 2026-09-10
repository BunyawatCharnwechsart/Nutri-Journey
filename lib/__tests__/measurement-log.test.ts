import { describe, expect, it } from "vitest";

import {
  canUpdateMeasurement,
  daysUntilNextMeasurementUpdate,
  diffCalendarDays,
  getICTDateKey,
  nextMonthlyUpdateLabel,
} from "@/lib/measurement-log";

// 2026-09-02 00:00 UTC = 2026-09-02 07:00 ICT (same calendar day).
const BASE = Date.UTC(2026, 8, 2);

describe("canUpdateMeasurement (once per ICT month)", () => {
  it("allows a brand-new user with no history", () => {
    expect(canUpdateMeasurement(BASE, null)).toBe(true);
  });

  it("blocks a second entry in the same ICT month", () => {
    expect(canUpdateMeasurement(BASE, "2026-09-01")).toBe(false);
    expect(canUpdateMeasurement(BASE, "2026-09-15")).toBe(false);
    expect(canUpdateMeasurement(BASE, "2026-09-30")).toBe(false);
  });

  it("unlocks once the last entry is in an earlier month", () => {
    expect(canUpdateMeasurement(BASE, "2026-08-31")).toBe(true);
    expect(canUpdateMeasurement(BASE, "2026-08-01")).toBe(true);
    expect(canUpdateMeasurement(BASE, "2025-12-31")).toBe(true);
  });

  it("respects the ICT month boundary (17:00 UTC = next day)", () => {
    const augEnd = Date.UTC(2026, 7, 31, 16, 59, 59);
    expect(canUpdateMeasurement(augEnd, "2026-08-31")).toBe(false);
    const sepStart = Date.UTC(2026, 7, 31, 17, 0, 0);
    expect(canUpdateMeasurement(sepStart, "2026-08-31")).toBe(true);
  });
});

describe("daysUntilNextMeasurementUpdate", () => {
  it("returns 0 for a brand-new user", () => {
    expect(daysUntilNextMeasurementUpdate(BASE, null)).toBe(0);
  });

  it("counts calendar days until the next month's 1st when locked", () => {
    // BASE = Sep 2 ICT; next allowed day is Oct 1 ICT → 29 days.
    expect(daysUntilNextMeasurementUpdate(BASE, "2026-09-01")).toBe(29);
    expect(daysUntilNextMeasurementUpdate(BASE, "2026-09-15")).toBe(29);
  });

  it("returns 0 as soon as the month has rolled over", () => {
    expect(daysUntilNextMeasurementUpdate(BASE, "2026-08-31")).toBe(0);
    expect(daysUntilNextMeasurementUpdate(BASE, "2026-07-01")).toBe(0);
  });
});

describe("nextMonthlyUpdateLabel (re-exported)", () => {
  it("returns null when the user may update now", () => {
    expect(nextMonthlyUpdateLabel(BASE, null)).toBe(null);
    expect(nextMonthlyUpdateLabel(BASE, "2026-08-31")).toBe(null);
  });

  it("labels the next month's 1st when locked", () => {
    expect(nextMonthlyUpdateLabel(BASE, "2026-09-01")).toBe("1 ต.ค.");
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