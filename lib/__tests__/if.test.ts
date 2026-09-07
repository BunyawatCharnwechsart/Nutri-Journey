import { describe, expect, it } from "vitest";

import {
  computeIfResult,
  getEatingMinutes,
  getFastingMinutes,
  getIfPattern,
  getMoodLevel,
  formatMinutes,
  MOOD_LEVELS,
  MOOD_VALUES,
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

describe("computeIfResult", () => {
  it("marks success when both goals are met exactly", () => {
    expect(computeIfResult("16:8", 960, 480)).toBe("success");
    expect(computeIfResult("12:12", 720, 720)).toBe("success");
  });

  it("marks fail when the fasting goal is missed", () => {
    expect(computeIfResult("16:8", 959, 480)).toBe("fail");
  });

  it("marks fail when the eating goal is missed", () => {
    expect(computeIfResult("16:8", 960, 479)).toBe("fail");
  });

  it("marks fail for an unknown or null pattern (no auto-success)", () => {
    expect(computeIfResult("99:9", 99999, 99999)).toBe("fail");
    expect(computeIfResult(null, 99999, 99999)).toBe("fail");
  });

  it("marks fail for missing/null durations", () => {
    expect(computeIfResult("16:8", null, null)).toBe("fail");
    expect(computeIfResult("16:8", undefined, undefined)).toBe("fail");
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

describe("MOOD_VALUES", () => {
  it("defines the 5 mood labels in DB order (worst → best)", () => {
    expect(MOOD_VALUES).toEqual([
      "Very bad",
      "Bad",
      "Medium",
      "Good",
      "Very good",
    ]);
  });
});

describe("MOOD_LEVELS", () => {
  it("has exactly 5 levels covering all MOOD_VALUES", () => {
    expect(MOOD_LEVELS).toHaveLength(5);
    expect(MOOD_LEVELS.map((level) => level.value)).toEqual([...MOOD_VALUES]);
  });

  it("maps the first entry to very_bad and the last to very_good", () => {
    expect(MOOD_LEVELS[0]).toMatchObject({ value: "Very bad", key: "very_bad" });
    expect(MOOD_LEVELS[4]).toMatchObject({ value: "Very good", key: "very_good" });
  });
});

describe("getMoodLevel", () => {
  it("returns the level object for a known stored label", () => {
    expect(getMoodLevel("Very good")?.key).toBe("very_good");
    expect(getMoodLevel("Medium")?.labelThai).toBe("ปานกลาง");
    expect(getMoodLevel("Bad")?.icon).toBe("/icon/badIcon.svg");
  });

  it("returns null for unknown, null, undefined and empty values", () => {
    expect(getMoodLevel("awesome")).toBeNull();
    expect(getMoodLevel("")).toBeNull();
    expect(getMoodLevel(null)).toBeNull();
    expect(getMoodLevel(undefined)).toBeNull();
  });
});