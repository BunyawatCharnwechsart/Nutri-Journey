import { describe, expect, it } from "vitest";

import { dueMeasurementReminder } from "@/lib/measurement-reminder";

const DAY = 86_400_000;

// 2026-09-02 00:00 UTC = 2026-09-02 07:00 ICT (same calendar day).
const BASE = Date.UTC(2026, 8, 2);

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** lastRecordedDate as an ICT date key `daysOffset` days before BASE. */
function recorded(daysOffset: number): string {
  return `${new Date(BASE - daysOffset * DAY).toISOString().slice(0, 10)}`;
}

describe("dueMeasurementReminder", () => {
  it("skips users who never recorded measurements", () => {
    expect(
      dueMeasurementReminder(BASE, { lastRecordedDate: null, lastReminderAt: null })
    ).toBe(false);
  });

  it("does not fire before 14 days have passed", () => {
    expect(
      dueMeasurementReminder(BASE, { lastRecordedDate: recorded(10), lastReminderAt: null })
    ).toBe(false);
    expect(
      dueMeasurementReminder(BASE, { lastRecordedDate: recorded(13), lastReminderAt: null })
    ).toBe(false);
  });

  it("fires the first reminder once 14 days have passed", () => {
    expect(
      dueMeasurementReminder(BASE, { lastRecordedDate: recorded(14), lastReminderAt: null })
    ).toBe(true);
    expect(
      dueMeasurementReminder(BASE, { lastRecordedDate: recorded(20), lastReminderAt: null })
    ).toBe(true);
  });

  it("does not re-fire before one full interval since the last push", () => {
    const input = {
      lastRecordedDate: recorded(15),
      lastReminderAt: iso(BASE - 3 * DAY),
    };
    expect(dueMeasurementReminder(BASE, input)).toBe(false);
  });

  it("re-fires every 14 days while the user keeps missing the update", () => {
    const input = {
      lastRecordedDate: recorded(30),
      lastReminderAt: iso(BASE - 14 * DAY),
    };
    expect(dueMeasurementReminder(BASE, input)).toBe(true);
  });

  it("a fresh measurement entry wins even after earlier reminders", () => {
    // Logged 5 days ago, so a very old reminder does not trigger while the
    // anchor is fresh.
    const input = {
      lastRecordedDate: recorded(5),
      lastReminderAt: iso(BASE - 30 * DAY),
    };
    expect(dueMeasurementReminder(BASE, input)).toBe(false);
  });

  it("a new entry re-arms the reminder after 14 more days", () => {
    const input = {
      lastRecordedDate: recorded(14),
      lastReminderAt: recorded(14) + "T00:00:00.000Z", // older than the anchor
    };
    expect(dueMeasurementReminder(BASE, input)).toBe(true);
  });
});
