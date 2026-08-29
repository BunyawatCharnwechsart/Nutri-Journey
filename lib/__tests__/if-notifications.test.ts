import { describe, expect, it } from "vitest";

import { duePhaseNotification } from "@/lib/if-notifications";
import { parseLinkCode } from "@/lib/line-link";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

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

describe("duePhaseNotification — fasting phase", () => {
  it("returns none before the planned end", () => {
    expect(duePhaseNotification(10 * HOUR, BASE)).toEqual({ kind: "none" });
  });

  it("sends exactly at/after the planned end (16h)", () => {
    expect(duePhaseNotification(16 * HOUR, BASE)).toEqual({
      kind: "send",
      phase: "fasting",
    });
    expect(duePhaseNotification(17 * HOUR, BASE)).toEqual({
      kind: "send",
      phase: "fasting",
    });
  });

  it("does not send again once already notified", () => {
    expect(
      duePhaseNotification(17 * HOUR, {
        ...BASE,
        fasting_end_notified_at: new Date(17 * HOUR).toISOString(),
      })
    ).toEqual({ kind: "none" });
  });

  it("does not send once the user stopped fasting", () => {
    expect(
      duePhaseNotification(18 * HOUR, {
        ...BASE,
        fasting_end_time: new Date(15 * HOUR).toISOString(),
        eating_start_time: new Date(15 * HOUR).toISOString(),
      })
    ).toEqual({ kind: "none" });
  });

  it("returns none when there is no fasting start", () => {
    expect(
      duePhaseNotification(20 * HOUR, { ...BASE, fasting_start_time: null })
    ).toEqual({ kind: "none" });
  });
});

describe("duePhaseNotification — eating phase", () => {
  const EATING = {
    ...BASE,
    fasting_end_time: new Date(16 * HOUR).toISOString(),
    eating_start_time: new Date(16 * HOUR).toISOString(),
  };

  it("sends after the eating window (8h) ends", () => {
    expect(duePhaseNotification(23 * HOUR, EATING)).toEqual({
      kind: "none",
    });
    expect(duePhaseNotification(24 * HOUR, EATING)).toEqual({
      kind: "send",
      phase: "eating",
    });
  });

  it("does not send when eating already finished", () => {
    expect(
      duePhaseNotification(25 * HOUR, {
        ...EATING,
        eating_end_time: new Date(22 * HOUR).toISOString(),
      })
    ).toEqual({ kind: "none" });
  });
});

describe("parseLinkCode", () => {
  it("extracts a valid 24-hex code with the prefix", () => {
    expect(parseLinkCode("[NJ-LINK] a1b2c3d4e5f6a7b8c9d0e1f2")).toBe(
      "a1b2c3d4e5f6a7b8c9d0e1f2"
    );
  });

  it("returns null for anything else", () => {
    expect(parseLinkCode("สวัสดี")).toBeNull();
    expect(parseLinkCode("[NJ-LINK] not-a-code")).toBeNull();
    expect(parseLinkCode("")).toBeNull();
  });
});