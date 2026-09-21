import { describe, expect, it } from "vitest";

import {
  dueMonthlyReminder,
  monthlyCheckinStatus,
  photoReminderDue,
  shouldSendPhotoReminder,
} from "@/lib/monthly-reminder";

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

describe("photoReminderDue", () => {
  const SEP = "2026-09";

  it("never nags a user with no photo history", () => {
    expect(photoReminderDue(SEP, [])).toBe(false);
  });

  it("skips when the user already uploaded this month", () => {
    expect(photoReminderDue(SEP, [SEP])).toBe(false);
    expect(photoReminderDue(SEP, ["2026-08", SEP])).toBe(false);
  });

  it("nags when the user has history but not this month yet", () => {
    expect(photoReminderDue(SEP, ["2026-08"])).toBe(true);
    expect(photoReminderDue(SEP, ["2026-07", "2026-08"])).toBe(true);
  });

  it("distinguishes past vs future month keys strictly", () => {
    // A future month key is not "this month" → treated as pending upload.
    expect(photoReminderDue(SEP, ["2026-10"])).toBe(true);
  });
});

describe("shouldSendPhotoReminder", () => {
  const SEP = "2026-09";
  const base = {
    currentMonthKey: SEP,
  };

  it("never sends when the user toggled the photo reminder off", () => {
    expect(
      shouldSendPhotoReminder({
        ...base,
        photoReminderEnabled: false,
        recordedMonthKeys: ["2026-08"],
      })
    ).toBe(false);
  });

  it("treats NULL (unanswered) as ON, keeping pre-0031 behavior", () => {
    expect(
      shouldSendPhotoReminder({
        ...base,
        photoReminderEnabled: null,
        recordedMonthKeys: ["2026-08"],
      })
    ).toBe(true);
    expect(
      shouldSendPhotoReminder({
        ...base,
        photoReminderEnabled: undefined,
        recordedMonthKeys: ["2026-08"],
      })
    ).toBe(true);
  });

  it("sends when enabled and history exists but not this month", () => {
    expect(
      shouldSendPhotoReminder({
        ...base,
        photoReminderEnabled: true,
        recordedMonthKeys: ["2026-08"],
      })
    ).toBe(true);
  });

  it("never nags a user with no photo history", () => {
    expect(
      shouldSendPhotoReminder({
        ...base,
        photoReminderEnabled: true,
        recordedMonthKeys: [],
      })
    ).toBe(false);
  });

  it("skips when the user already uploaded this month", () => {
    expect(
      shouldSendPhotoReminder({
        ...base,
        photoReminderEnabled: true,
        recordedMonthKeys: [SEP],
      })
    ).toBe(false);
  });
});

describe("monthlyCheckinStatus", () => {
  it("needs both lines when nothing was logged this month", () => {
    const status = monthlyCheckinStatus({
      weightUpdatedThisMonth: false,
      measurementUpdatedThisMonth: false,
    });
    expect(status).toEqual({
      weightDue: true,
      measurementDue: true,
      needsCheckin: true,
    });
  });

  it("reminds only weight when measurements were already logged", () => {
    const status = monthlyCheckinStatus({
      weightUpdatedThisMonth: false,
      measurementUpdatedThisMonth: true,
    });
    expect(status).toEqual({
      weightDue: true,
      measurementDue: false,
      needsCheckin: true,
    });
  });

  it("reminds only measurements when weight was already logged", () => {
    const status = monthlyCheckinStatus({
      weightUpdatedThisMonth: true,
      measurementUpdatedThisMonth: false,
    });
    expect(status).toEqual({
      weightDue: false,
      measurementDue: true,
      needsCheckin: true,
    });
  });

  it("needs no check-in push when both are already logged", () => {
    const status = monthlyCheckinStatus({
      weightUpdatedThisMonth: true,
      measurementUpdatedThisMonth: true,
    });
    expect(status).toEqual({
      weightDue: false,
      measurementDue: false,
      needsCheckin: false,
    });
  });
});