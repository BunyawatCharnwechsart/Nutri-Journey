import { describe, expect, it } from "vitest";

import {
  SPIN_JITTER_RATIO,
  SPIN_STRIP_SIZE,
  SPIN_WIN_INDEX,
  buildSpinStrip,
  spinOffsetPx,
} from "@/lib/egg-spin";

const CATALOG = ["starter", "pink", "blue", "red", "green"];

describe("buildSpinStrip", () => {
  it("always puts the winner at the fixed win index", () => {
    for (const won of CATALOG) {
      const strip = buildSpinStrip(won, CATALOG, () => 0.5);
      expect(strip.winIndex).toBe(SPIN_WIN_INDEX);
      expect(strip.cells[SPIN_WIN_INDEX]?.eggType).toBe(won);
      expect(strip.cells[SPIN_WIN_INDEX]?.isWinner).toBe(true);
      expect(
        strip.cells.filter((c) => c.isWinner).length
      ).toBe(1);
    }
  });

  it("builds exactly 60 cells", () => {
    expect(buildSpinStrip("pink", CATALOG, () => 0.1).cells.length).toBe(
      SPIN_STRIP_SIZE
    );
  });

  it("keeps jitter inside the winner cell", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const { jitter } = buildSpinStrip("pink", CATALOG, () => r);
      expect(Math.abs(jitter)).toBeLessThanOrEqual(SPIN_JITTER_RATIO);
    }
  });

  it("falls back to the winner when the catalog is empty", () => {
    const strip = buildSpinStrip("pink", [], () => 0.9);
    expect(strip.cells.every((c) => c.eggType === "pink")).toBe(true);
  });

  it("shows only level-0 eggs in every cell", () => {
    const strip = buildSpinStrip("pink", CATALOG, () => 0.5);
    for (const cell of strip.cells) {
      expect(cell.level).toBe(0);
    }
  });
});

describe("spinOffsetPx", () => {
  it("centers the winner cell under the pointer", () => {
    // ช่องกว้าง 100, จอกว้าง 300 → จุดหยุด = 50*100+50-150 = 4900.
    expect(spinOffsetPx(50, 100, 300, 0)).toBe(4900);
    expect(spinOffsetPx(50, 100, 300, 0.3)).toBe(4930);
    expect(spinOffsetPx(50, 100, 300, -0.3)).toBe(4870);
  });
});
