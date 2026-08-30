import { describe, expect, it } from "vitest";

import { isProfileComplete } from "@/lib/profile";

describe("isProfileComplete", () => {
  const fullProfile = {
    gender: "male",
    birth_date: "2000-01-01",
    height: 175,
    weight: 70,
    activity_level: "moderate",
    waist_in: 29.5,
    hip_in: 37,
    chest_in: 34.5,
    goal: "weight_loss",
    target_weight: 65,
  };

  it("returns false for a null/undefined profile", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });

  it("returns true when every field is filled", () => {
    expect(isProfileComplete(fullProfile)).toBe(true);
  });

  it("returns false when a measurement is missing", () => {
    expect(
      isProfileComplete({
        ...fullProfile,
        waist_in: null,
      })
    ).toBe(false);
  });

  it("returns false when the goal is missing", () => {
    expect(
      isProfileComplete({
        ...fullProfile,
        goal: null,
      })
    ).toBe(false);
  });

  it("returns false when the target weight is missing", () => {
    expect(
      isProfileComplete({
        ...fullProfile,
        target_weight: null,
      })
    ).toBe(false);
  });
});