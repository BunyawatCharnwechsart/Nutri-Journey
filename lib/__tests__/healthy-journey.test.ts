import { describe, expect, it } from "vitest";

import {
  HEALTHY_JOURNEY_LEVEL_CAP,
  avatarForLevel,
  cumulativeThreshold,
  expForNextLevel,
  expInLevel,
  levelFromPoints,
  progressRatio,
} from "@/lib/healthy-journey";

describe("cumulativeThreshold", () => {
  it("follows the 150 × (1+2+…+L) series", () => {
    expect(cumulativeThreshold(0)).toBe(0);
    expect(cumulativeThreshold(1)).toBe(150);
    expect(cumulativeThreshold(2)).toBe(450);
    expect(cumulativeThreshold(3)).toBe(900);
    expect(cumulativeThreshold(9)).toBe(6750);
  });

  it("every next level costs 150 more than the previous one", () => {
    for (let l = 1; l <= HEALTHY_JOURNEY_LEVEL_CAP; l++) {
      expect(cumulativeThreshold(l) - cumulativeThreshold(l - 1)).toBe(
        150 * l
      );
    }
  });
});

describe("levelFromPoints", () => {
  it("maps 0 to level 0", () => {
    expect(levelFromPoints(0)).toBe(0);
  });

  it("hits exactly on threshold boundaries", () => {
    expect(levelFromPoints(149)).toBe(0);
    expect(levelFromPoints(150)).toBe(1);
    expect(levelFromPoints(449)).toBe(1);
    expect(levelFromPoints(450)).toBe(2);
    expect(levelFromPoints(6750)).toBe(HEALTHY_JOURNEY_LEVEL_CAP);
  });

  it("caps at the 9th level no matter how high XP grows", () => {
    expect(levelFromPoints(6751)).toBe(HEALTHY_JOURNEY_LEVEL_CAP);
    expect(levelFromPoints(1_000_000)).toBe(HEALTHY_JOURNEY_LEVEL_CAP);
  });

  it("treats broken input as level 0", () => {
    expect(levelFromPoints(-1)).toBe(0);
    expect(levelFromPoints(Number.NaN)).toBe(0);
    expect(levelFromPoints(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("expInLevel", () => {
  it("subtracts the spent thresholds from total points", () => {
    expect(expInLevel(0)).toBe(0);
    expect(expInLevel(150)).toBe(0);
    expect(expInLevel(320)).toBe(170);
    expect(expInLevel(450)).toBe(0);
  });

  it("never returns a negative fill", () => {
    expect(expInLevel(-5)).toBe(0);
  });
});

describe("expForNextLevel", () => {
  it("returns the delta to the next level", () => {
    expect(expForNextLevel(0)).toBe(150);
    expect(expForNextLevel(1)).toBe(300);
    expect(expForNextLevel(8)).toBe(1350);
  });

  it("returns null at the level cap", () => {
    expect(expForNextLevel(HEALTHY_JOURNEY_LEVEL_CAP)).toBeNull();
  });
});

describe("progressRatio", () => {
  it("fills 0→1 within a level", () => {
    expect(progressRatio(0)).toBe(0);
    expect(progressRatio(75)).toBe(0.5);
    expect(progressRatio(150)).toBe(0);
    // 600 total = level 2 (cum 450) + 150 filled of the 450 to level 3.
    expect(progressRatio(450 + 150)).toBeCloseTo(1 / 3);
  });

  it("is fully filled once the cap is reached", () => {
    expect(progressRatio(6750)).toBe(1);
    expect(progressRatio(9999)).toBe(1);
  });
});

describe("avatarForLevel", () => {
  it("maps each level to its own asset", () => {
    for (let l = 0; l <= HEALTHY_JOURNEY_LEVEL_CAP; l++) {
      expect(avatarForLevel(l)).toBe(`/avatar/level${l}.svg`);
    }
  });

  it("clamps out-of-range levels to the available SVGs", () => {
    expect(avatarForLevel(-1)).toBe("/avatar/level0.svg");
    expect(avatarForLevel(99)).toBe(`/avatar/level${HEALTHY_JOURNEY_LEVEL_CAP}.svg`);
    expect(avatarForLevel(Number.NaN)).toBe("/avatar/level0.svg");
  });
});