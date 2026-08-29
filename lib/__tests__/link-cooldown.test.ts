import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTO_LINK_COOLDOWN_MS,
  shouldAutoAttempt,
} from "@/lib/link-cooldown";

describe("shouldAutoAttempt", () => {
  it("allows an attempt when there was no previous attempt", () => {
    const now = 1_000_000;
    expect(shouldAutoAttempt(null, now)).toBe(true);
  });

  it("blocks attempts inside the cooldown window", () => {
    const now = 1_000_000;
    expect(shouldAutoAttempt(now - 1, now)).toBe(false);
    expect(
      shouldAutoAttempt(now - DEFAULT_AUTO_LINK_COOLDOWN_MS, now)
    ).toBe(true);
  });

  it("allows an attempt exactly at the end of the cooldown", () => {
    const now = 1_000_000;
    expect(
      shouldAutoAttempt(now - DEFAULT_AUTO_LINK_COOLDOWN_MS, now)
    ).toBe(true);
  });

  it("rejects an invalid current time", () => {
    expect(shouldAutoAttempt(1, Number.NaN)).toBe(false);
    expect(shouldAutoAttempt(1, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("rejects a negative cooldown", () => {
    expect(shouldAutoAttempt(0, 100, -5)).toBe(false);
  });
});