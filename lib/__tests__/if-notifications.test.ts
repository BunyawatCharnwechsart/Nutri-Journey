import { describe, expect, it } from "vitest";

import { duePhaseNotification } from "@/lib/if-notifications";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Short cadence for tests so we don't need to reason in real 10 min / 3 h.
const INTERVAL = 10 * MINUTE;
const WINDOW = 3 * HOUR;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

// A session that started fasting at t=0 with pattern 16:8
// (fasting 960 min, eating 480 min).
const BASE = {
  fasting_start_time: new Date(0).toISOString(),
  fasting_end_time: null,
  fasting_end_notified_at: null,
  eating_start_time: null,
  eating_end_time: null,
  eating_end_notified_at: null,
  if_pattern: "16:8",
};

const FASTING_END = 16 * HOUR; // 16:8 target for fasting
const EATING_END = 16 * HOUR + 8 * HOUR; // 8h eating after fasting ends

describe("duePhaseNotification — fasting phase: first reminder", () => {
  it("returns none before the planned end", () => {
    expect(duePhaseNotification(10 * HOUR, BASE, { reminderIntervalMs: INTERVAL })).toEqual({
      kind: "none",
    });
  });

  it("sends exactly at/after the planned end (16h)", () => {
    expect(
      duePhaseNotification(FASTING_END, BASE, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "send", phase: "fasting" });
    expect(
      duePhaseNotification(17 * HOUR, BASE, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "send", phase: "fasting" });
  });

  it("sends a first reminder even when already long overdue (single late nudge)", () => {
    expect(
      duePhaseNotification(30 * HOUR, BASE, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "send", phase: "fasting" });
  });

  it("does not send again within the repeat interval", () => {
    const notified = iso(FASTING_END);
    expect(
      duePhaseNotification(FASTING_END + 5 * MINUTE, { ...BASE, fasting_end_notified_at: notified }, {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "none" });
  });

  it("returns none when there is no fasting start", () => {
    expect(
      duePhaseNotification(20 * HOUR, { ...BASE, fasting_start_time: null }, {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "none" });
  });
});

describe("duePhaseNotification — fasting phase: repeat reminders", () => {
  const running = (lastNotifiedMs: number) => ({
    ...BASE,
    fasting_end_notified_at: iso(lastNotifiedMs),
  });

  it("re-sends once the 10-minute interval has passed while still fasting", () => {
    expect(
      duePhaseNotification(FASTING_END + 10 * MINUTE, running(FASTING_END), {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "send", phase: "fasting" });
  });

  it("keeps re-sending while inside the reminder window", () => {
    const lastAt = FASTING_END + 20 * MINUTE;
    expect(
      duePhaseNotification(FASTING_END + 30 * MINUTE, running(lastAt), {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "send", phase: "fasting" });
  });

  it("stops once the reminder window (3h) has elapsed, even if still fasting", () => {
    const notifiedInsideWindow = iso(FASTING_END + 2 * HOUR + 50 * MINUTE);
    // 3h exactly after the target — inside the window, so the cadence still fires.
    expect(
      duePhaseNotification(FASTING_END + WINDOW, running(FASTING_END + 2 * HOUR + 50 * MINUTE), {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "send", phase: "fasting" });
    // Over the window boundary — silent from now on.
    expect(
      duePhaseNotification(FASTING_END + WINDOW + 1 * MINUTE, {
        ...BASE,
        fasting_end_notified_at: notifiedInsideWindow,
      }, {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "none" });
  });

  it("does not repeat for a very old overdue session after its single first nudge", () => {
    // The phase hit its target 14h ago; a first reminder was sent at the target
    // time, and now we are far outside the window → no more pings.
    expect(
      duePhaseNotification(30 * HOUR, running(FASTING_END), {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "none" });
  });

  it("does not send once the user stopped fasting", () => {
    const stopped = {
      ...BASE,
      fasting_end_time: iso(15 * HOUR),
      eating_start_time: iso(15 * HOUR),
    };
    expect(
      duePhaseNotification(FASTING_END + 10 * MINUTE, stopped, {
        reminderIntervalMs: INTERVAL,
      })
    ).toEqual({ kind: "none" });
  });
});

describe("duePhaseNotification — eating phase", () => {
  const EATING = {
    ...BASE,
    fasting_end_time: iso(FASTING_END),
    eating_start_time: iso(FASTING_END),
  };

  it("sends after the eating window (8h) ends", () => {
    expect(
      duePhaseNotification(EATING_END - 1 * HOUR, EATING, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "none" });
    expect(
      duePhaseNotification(EATING_END, EATING, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "send", phase: "eating" });
  });

  it("re-sends every 10 minutes while still eating and inside the window", () => {
    expect(
      duePhaseNotification(EATING_END + 10 * MINUTE, {
        ...EATING,
        eating_end_notified_at: iso(EATING_END),
      }, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "send", phase: "eating" });
    expect(
      duePhaseNotification(EATING_END + WINDOW + 1 * MINUTE, {
        ...EATING,
        eating_end_notified_at: iso(EATING_END + 40 * MINUTE),
      }, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "none" });
  });

  it("does not send when eating already finished", () => {
    expect(
      duePhaseNotification(25 * HOUR, {
        ...EATING,
        eating_end_time: iso(22 * HOUR),
      }, { reminderIntervalMs: INTERVAL })
    ).toEqual({ kind: "none" });
  });
});