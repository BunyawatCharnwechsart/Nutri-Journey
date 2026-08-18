import { describe, expect, it } from "vitest";

import {
  healthProfileSchema,
  ifStartSchema,
  loginSchema,
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
  it("accepts a valid profile and coerces numeric strings", () => {
    const result = healthProfileSchema.parse({
      gender: "male",
      birthDate: "2000-01-01",
      heightCm: "175",
      weightKg: "70",
      activityLevel: "moderate",
    });
    expect(result.heightCm).toBe(175);
    expect(result.weightKg).toBe(70);
  });

  it("rejects a future birth date", () => {
    expect(() =>
      healthProfileSchema.parse({
        gender: "female",
        birthDate: "2999-01-01",
        heightCm: "160",
        weightKg: "55",
        activityLevel: "light",
      })
    ).toThrow();
  });

  it("rejects out-of-range height", () => {
    expect(() =>
      healthProfileSchema.parse({
        gender: "male",
        birthDate: "2000-01-01",
        heightCm: "10",
        weightKg: "70",
        activityLevel: "moderate",
      })
    ).toThrow();
  });

  it("treats a blank optional measurement as undefined", () => {
    const result = healthProfileSchema.parse({
      gender: "female",
      birthDate: "2000-01-01",
      heightCm: "160",
      weightKg: "55",
      activityLevel: "moderate",
      waistCm: "",
    });
    expect(result.waistCm).toBeUndefined();
  });
});