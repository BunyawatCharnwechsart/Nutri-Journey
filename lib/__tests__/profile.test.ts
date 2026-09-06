import { describe, expect, it } from "vitest";

import { calculateBmi, getBmiCategory, isProfileComplete } from "@/lib/profile";

describe("isProfileComplete", () => {
  const fullProfile = {
    gender: "male",
    birth_date: "2000-01-01",
    height: 175,
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

  it("returns true without a weight field (weight lives in weight_logs)", () => {
    expect(
      isProfileComplete({ ...fullProfile, weight: null })
    ).toBe(true);
  });

  it("returns false when a field is an empty string", () => {
    expect(
      isProfileComplete({
        ...fullProfile,
        height: "",
      })
    ).toBe(false);
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

describe("calculateBmi", () => {
  it("computes BMI rounded to one decimal", () => {
    expect(calculateBmi(70, 175)).toBe(22.9);
  });

  it("returns null when weight or height is missing", () => {
    expect(calculateBmi(null, 175)).toBeNull();
    expect(calculateBmi(70, null)).toBeNull();
    expect(calculateBmi(null, null)).toBeNull();
  });
});

describe("getBmiCategory", () => {
  it("maps thresholds to Thai BMI categories", () => {
    expect(getBmiCategory(18.4)).toBe("น้ำหนักน้อย");
    expect(getBmiCategory(22)).toBe("ปกติ");
    expect(getBmiCategory(24)).toBe("น้ำหนักเกิน");
    expect(getBmiCategory(29)).toBe("อ้วน ระดับ 1");
    expect(getBmiCategory(30)).toBe("อ้วน ระดับ 2 (อันตราย)");
  });

  it("returns a dash for null", () => {
    expect(getBmiCategory(null)).toBe("—");
  });
});