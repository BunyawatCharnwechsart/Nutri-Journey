import { describe, expect, it } from "vitest";

import { dueWeightReminder } from "@/lib/weight-reminder";

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

describe("dueWeightReminder", () => {
  it("skips users who never recorded a weight", () => {
    expect(dueWeightReminder(BASE, { lastRecordedDate: null, lastReminderAt: null })).toBe(false);
  });

  it("does not fire before 15 days have passed", () => {
    expect(
      dueWeightReminder(BASE, { lastRecordedDate: recorded(10), lastReminderAt: null })
    ).toBe(false);
    expect(
      dueWeightReminder(BASE, { lastRecordedDate: recorded(14), lastReminderAt: null })
    ).toBe(false);
  });

  it("fires the first reminder once 15 days have passed", () => {
    expect(
      dueWeightReminder(BASE, { lastRecordedDate: recorded(15), lastReminderAt: null })
    ).toBe(true);
    expect(
      dueWeightReminder(BASE, { lastRecordedDate: recorded(20), lastReminderAt: null })
    ).toBe(true);
  });

  it("does not re-fire before one full interval since the last push", () => {
    const input = {
      lastRecordedDate: recorded(16),
      lastReminderAt: iso(BASE - 10 * DAY),
    };
    expect(dueWeightReminder(BASE, input)).toBe(false);
  });

  it("re-fires every 15 days while the user keeps missing the update", () => {
    const input = {
      lastRecordedDate: recorded(30),
      lastReminderAt: iso(BASE - 15 * DAY),
    };
    expect(dueWeightReminder(BASE, input)).toBe(true);
  });

  it("a fresh weight entry wins even after earlier reminders", () => {
    // Logged 15 days ago, but the clock must count from the NEW entry, so a
    // very old reminder does not trigger while the anchor is fresh.
    const input = {
      lastRecordedDate: recorded(5),
      lastReminderAt: iso(BASE - 30 * DAY),
    };
    expect(dueWeightReminder(BASE, input)).toBe(false);
  });

  it("a new entry re-arms the reminder after 15 more days", () => {
    const input = {
      lastRecordedDate: recorded(15),
      lastReminderAt: recorded(15) + "T00:00:00.000Z", // older than the anchor
    };
    expect(dueWeightReminder(BASE, input)).toBe(true);
  });
});