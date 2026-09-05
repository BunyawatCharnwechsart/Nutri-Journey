import { describe, expect, it } from "vitest";

import {
  getICTMonthBounds,
  toICTDateKey,
  toICTMonthKey,
} from "@/lib/timezone";

describe("toICTDateKey", () => {
  it("keeps an evening ICT event on its own calendar day", () => {
    // 2026-09-05 11:58Z = 2026-09-05 18:58 ICT → ต้องเป็นวันที่ 5 เท่านั้น.
    // (เดิมบน server ที่เป็น UTC+7 เลื่อนข้ามเที่ยงคืนไปขึ้นวันที่ 6)
    expect(toICTDateKey(new Date("2026-09-05T11:58:00.000Z"))).toBe(
      "2026-09-05"
    );
  });

  it("keeps an afternoon ICT event on the same day", () => {
    // 09:00Z = 16:00 ICT.
    expect(toICTDateKey(new Date("2026-09-05T09:00:00.000Z"))).toBe(
      "2026-09-05"
    );
  });

  it("stays on the same day right before ICT midnight", () => {
    // 16:59Z = 23:59 ICT.
    expect(toICTDateKey(new Date("2026-09-05T16:59:00.000Z"))).toBe(
      "2026-09-05"
    );
  });

  it("rolls over exactly at ICT midnight", () => {
    // 17:00Z = 00:00 ICT ของวันที่ 6.
    expect(toICTDateKey(new Date("2026-09-05T17:00:00.000Z"))).toBe(
      "2026-09-06"
    );
  });

  it("rolls to the next ICT day for a late-night event", () => {
    // 18:00Z = 01:00 ICT ของวันที่ 6.
    expect(toICTDateKey(new Date("2026-09-05T18:00:00.000Z"))).toBe(
      "2026-09-06"
    );
  });

  it("works across the ICT day boundary at the start of the day", () => {
    // 2026-08-31 17:00Z = 2026-09-01 00:00 ICT → ขึ้นเป็น 1 ก.ย. แล้ว.
    expect(toICTDateKey(new Date("2026-08-31T17:00:00.000Z"))).toBe(
      "2026-09-01"
    );
  });
});

describe("toICTMonthKey", () => {
  it("formats year-month in ICT", () => {
    expect(toICTMonthKey(new Date("2026-09-05T11:58:00.000Z"))).toBe("2026-09");
  });

  it("keeps the month even when the UTC instant falls on the previous UTC day", () => {
    // 2026-08-31 18:00Z = 2026-09-01 01:00 ICT → ยังเป็นเดือน 9.
    expect(toICTMonthKey(new Date("2026-08-31T18:00:00.000Z"))).toBe("2026-09");
  });
});

describe("getICTMonthBounds", () => {
  it("returns UTC bounds for a standard month (ICT midnight − 7h)", () => {
    expect(getICTMonthBounds(2026, 9)).toEqual({
      startIso: "2026-08-31T17:00:00.000Z",
      endIso: "2026-09-30T17:00:00.000Z",
    });
  });

  it("handles January (previous year crossover)", () => {
    expect(getICTMonthBounds(2026, 1)).toEqual({
      startIso: "2025-12-31T17:00:00.000Z",
      endIso: "2026-01-31T17:00:00.000Z",
    });
  });
});