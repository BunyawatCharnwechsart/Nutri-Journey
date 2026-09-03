import { describe, expect, it } from "vitest";

import {
  healthProfileSchema,
  ifStartSchema,
  loginSchema,
  measurementLogSchema,
  sessionIdSchema,
} from "@/lib/validation";

describe("loginSchema", () => {
  it("accepts a non-empty idToken", () => {
    expect(loginSchema.parse({ idToken: "line-id-token" })).toEqual({
      idToken: "line-id-token",
    });
  });

  it("rejects an empty idToken", () => {
    expect(() => loginSchema.parse({ idToken: "" })).toThrow();
  });
});

describe("ifStartSchema", () => {
  it("accepts a valid pattern", () => {
    expect(ifStartSchema.parse({ ifPattern: "16:8" })).toEqual({
      ifPattern: "16:8",
    });
  });

  it("rejects an unknown pattern", () => {
    expect(() => ifStartSchema.parse({ ifPattern: "1:1" })).toThrow();
  });
});

describe("sessionIdSchema", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a valid UUID", () => {
    expect(sessionIdSchema.parse({ sessionId: uuid }).sessionId).toBe(uuid);
  });

  it("rejects a non-UUID string", () => {
    expect(() => sessionIdSchema.parse({ sessionId: "not-a-uuid" })).toThrow();
  });
});

describe("healthProfileSchema", () => {
  const fullProfile = {
    gender: "male",
    birthDate: "2000-01-01",
    heightCm: "175",
    weightKg: "70",
    activityLevel: "moderate",
    waistIn: "29.5",
    hipIn: "37",
    chestIn: "34.5",
    goal: "weight_loss",
    targetWeightKg: "65",
  };

  it("accepts a valid profile and coerces numeric strings", () => {
    const result = healthProfileSchema.parse(fullProfile);
    expect(result.heightCm).toBe(175);
    expect(result.weightKg).toBe(70);
    expect(result.waistIn).toBe(29.5);
    expect(result.chestIn).toBe(34.5);
    expect(result.goal).toBe("weight_loss");
    expect(result.targetWeightKg).toBe(65);
  });

  it("rejects a future birth date", () => {
    expect(() =>
      healthProfileSchema.parse({
        ...fullProfile,
        birthDate: "2999-01-01",
      })
    ).toThrow();
  });

  it("rejects out-of-range height", () => {
    expect(() =>
      healthProfileSchema.parse({
        ...fullProfile,
        heightCm: "10",
      })
    ).toThrow();
  });

  it("rejects a missing (blank) measurement", () => {
    expect(() =>
      healthProfileSchema.parse({
        ...fullProfile,
        waistIn: "",
      })
    ).toThrow();
  });

  it("rejects a measurement outside the inch range", () => {
    expect(() =>
      healthProfileSchema.parse({
        ...fullProfile,
        hipIn: "200",
      })
    ).toThrow();
  });

  it("rejects a missing goal", () => {
    const withoutGoal: Record<string, unknown> = { ...fullProfile };
    delete withoutGoal.goal;
    expect(() => healthProfileSchema.parse(withoutGoal)).toThrow();
  });

  it("rejects a missing target weight", () => {
    const withoutTarget: Record<string, unknown> = { ...fullProfile };
    delete withoutTarget.targetWeightKg;
    expect(() => healthProfileSchema.parse(withoutTarget)).toThrow();
  });
});

describe("measurementLogSchema", () => {
  it("accepts a full set of measurements", () => {
    const result = measurementLogSchema.parse({
      waistIn: "29.5",
      hipIn: "37",
      chestIn: "34.5",
    });
    expect(result.waistIn).toBe(29.5);
    expect(result.hipIn).toBe(37);
    expect(result.chestIn).toBe(34.5);
  });

  it("accepts a partial update (only the waist)", () => {
    const result = measurementLogSchema.parse({ waistIn: "21" });
    expect(result.waistIn).toBe(21);
    expect(result.hipIn).toBeUndefined();
    expect(result.chestIn).toBeUndefined();
  });

  it("rejects an empty object (nothing to update)", () => {
    expect(() => measurementLogSchema.parse({})).toThrow();
  });

  it("treats an empty-string field as not provided", () => {
    const result = measurementLogSchema.parse({ waistIn: "", hipIn: "30" });
    expect(result.waistIn).toBeUndefined();
    expect(result.hipIn).toBe(30);
  });

  it("rejects a measurement outside the inch range", () => {
    expect(() => measurementLogSchema.parse({ waistIn: "200" })).toThrow();
  });
});