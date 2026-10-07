import { describe, expect, it } from "vitest";

import { currentProgress } from "@/lib/egg-draw";
import { pickEggType, resolveDisplayName } from "@/lib/egg-draw-service";

describe("currentProgress", () => {
  it("counts 3 consecutive success days as eligible", () => {
    const r = currentProgress(
      ["2026-10-04", "2026-10-05", "2026-10-06"],
      null,
      "2026-10-06"
    );
    expect(r).toMatchObject({
      streakDays: 3,
      progress: 3,
      eligible: true,
      cycleStart: "2026-10-04",
      cycleEnd: "2026-10-06",
    });
  });

  it("counts duplicate successes on the same day only once", () => {
    const r = currentProgress(
      ["2026-10-05", "2026-10-05", "2026-10-06"],
      null,
      "2026-10-06"
    );
    expect(r.streakDays).toBe(2);
    expect(r.eligible).toBe(false);
  });

  it("resets when a day is missing", () => {
    const r = currentProgress(
      ["2026-10-01", "2026-10-03", "2026-10-04"],
      null,
      "2026-10-04"
    );
    expect(r.streakDays).toBe(2);
    expect(r.cycleStart).toBeNull();
  });

  it("keeps the streak alive when today is not done yet (latest was yesterday)", () => {
    const r = currentProgress(["2026-10-04", "2026-10-05"], null, "2026-10-06");
    expect(r.streakDays).toBe(2);
    expect(r.progress).toBe(2);
  });

  it("drops to zero when the latest success is older than yesterday", () => {
    const r = currentProgress(["2026-10-01", "2026-10-02"], null, "2026-10-06");
    expect(r).toMatchObject({ streakDays: 0, progress: 0, eligible: false });
  });

  it("restarts counting after the granted window", () => {
    // แจกวันที่ 1-3 ไปแล้ว เหลือวันที่ 4-5 → progress 2/3.
    const r = currentProgress(
      ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"],
      "2026-10-03",
      "2026-10-05"
    );
    expect(r).toMatchObject({
      streakDays: 2,
      progress: 2,
      eligible: false,
      cycleStart: null,
    });
  });

  it("grants the next window once days 4-6 complete", () => {
    const r = currentProgress(
      ["2026-10-04", "2026-10-05", "2026-10-06"],
      "2026-10-03",
      "2026-10-06"
    );
    expect(r).toMatchObject({
      eligible: true,
      cycleStart: "2026-10-04",
      cycleEnd: "2026-10-06",
    });
  });

  it("handles month boundaries", () => {
    const r = currentProgress(
      ["2026-09-30", "2026-10-01", "2026-10-02"],
      null,
      "2026-10-02"
    );
    expect(r.eligible).toBe(true);
    expect(r.cycleStart).toBe("2026-09-30");
  });

  it("ignores future days", () => {
    const r = currentProgress(
      ["2026-10-05", "2026-10-06", "2099-01-01"],
      null,
      "2026-10-06"
    );
    expect(r.streakDays).toBe(2);
  });
});

describe("pickEggType", () => {
  const types = [
    { code: "common", name: "ไข่ทั่วไป", rarity_weight: 3 },
    { code: "rare", name: "ไข่หายาก", rarity_weight: 1 },
  ];

  it("returns null when the catalog is empty", () => {
    expect(pickEggType([])).toBeNull();
  });

  it("picks deterministically from an injected random source", () => {
    expect(pickEggType(types, () => 0)?.code).toBe("common");
    expect(pickEggType(types, () => 0.99)?.code).toBe("rare");
  });
});

describe("resolveDisplayName", () => {
  it("prefers the egg's own nickname", () => {
    expect(resolveDisplayName("น้องชมพู", true, "ชื่อรวม", "ไข่ชมพู")).toBe(
      "น้องชมพู"
    );
    expect(resolveDisplayName("น้องฟ้า", false, "ชื่อรวม", "ไข่สีน้ำเงิน")).toBe(
      "น้องฟ้า"
    );
  });

  it("falls back to the legacy name only for the active egg", () => {
    expect(resolveDisplayName(null, true, "ชื่อรวม", "ไข่ชมพู")).toBe("ชื่อรวม");
    expect(resolveDisplayName(null, false, "ชื่อรวม", "ไข่ชมพู")).toBe("ไข่ชมพู");
  });

  it("falls back to the type name when nothing else exists", () => {
    expect(resolveDisplayName(null, true, null, "ไข่ชมพู")).toBe("ไข่ชมพู");
    expect(resolveDisplayName(null, false, null, "ไข่ชมพู")).toBe("ไข่ชมพู");
  });
});
