import { describe, expect, it } from "vitest";

import {
  getEatingMinutes,
  getFastingMinutes,
  getIfPattern,
  formatMinutes,
} from "@/lib/if";

describe("getIfPattern", () => {
  it("returns the pattern object for a known value", () => {
    const pattern = getIfPattern("16:8");
    expect(pattern?.label).toBe("16:8");
    expect(pattern?.fastingHours).toBe(16);
  });

  it("returns null for unknown, null, undefined or empty values", () => {
    expect(getIfPattern("99:1")).toBeNull();
    expect(getIfPattern(null)).toBeNull();
    expect(getIfPattern(undefined)).toBeNull();
    expect(getIfPattern("")).toBeNull();
  });
});

describe("getFastingMinutes", () => {
  it("returns planned fasting minutes for each pattern", () => {
    expect(getFastingMinutes("12:12")).toBe(720);
    expect(getFastingMinutes("14:10")).toBe(840);
    expect(getFastingMinutes("16:8")).toBe(960);
    expect(getFastingMinutes("18:6")).toBe(1080);
    expect(getFastingMinutes("20:4")).toBe(1200);
  });

  it("returns 0 for unknown values", () => {
    expect(getFastingMinutes("9:9")).toBe(0);
    expect(getFastingMinutes(null)).toBe(0);
  });
});

describe("getEatingMinutes", () => {
  it("returns the planned eating-window minutes (24 - fastingHours)", () => {
    expect(getEatingMinutes("16:8")).toBe(480);
    expect(getEatingMinutes("12:12")).toBe(720);
    expect(getEatingMinutes("20:4")).toBe(240);
  });

  it("returns 0 for unknown values", () => {
    expect(getEatingMinutes("x")).toBe(0);
  });
});

describe("formatMinutes", () => {
  it("formats hours only", () => {
    expect(formatMinutes(960)).toBe("16 ชม.");
  });

  it("formats minutes only", () => {
    expect(formatMinutes(45)).toBe("45 นาที");
  });

  it("formats hours and minutes", () => {
    expect(formatMinutes(990)).toBe("16 ชม. 30 นาที");
  });

  it("returns a dash for null, undefined, 0 or negative", () => {
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(undefined)).toBe("—");
    expect(formatMinutes(0)).toBe("—");
    expect(formatMinutes(-5)).toBe("—");
  });
});