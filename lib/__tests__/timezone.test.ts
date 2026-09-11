import { describe, expect, it } from "vitest";

import {
  getICTMonthBounds,
  getQuestDayBounds,
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

  it("includes sessions that start 00:00–06:59 Thai on the 1st of the month", () => {
    // เดิมหน้า API เคยใช้ขอบ UTC month → 00:30 น. ไทยของวันที่ 1 (= 17:30Z วันเก่า)
    // จะหลุดไปอยู่เดือนก่อน; ขอบแบบไทยต้องรวม session นี้ไว้ในเดือนนั้น.
    const bounds = getICTMonthBounds(2026, 9); // กันยายน 2026
    const sessionAtThaiMidnightPast = "2026-08-31T17:30:00.000Z"; // 00:30 น. 1 ก.ย. ไทย
    expect(sessionAtThaiMidnightPast >= bounds.startIso).toBe(true);
    expect(sessionAtThaiMidnightPast < bounds.endIso).toBe(true);
  });

  it("excludes sessions that start 00:00–06:59 Thai on the 1st of the next month", () => {
    const bounds = getICTMonthBounds(2026, 9);
    const nextMonthBoundary = "2026-09-30T17:30:00.000Z"; // 00:30 น. 1 ต.ค. ไทย
    expect(nextMonthBoundary < bounds.endIso).toBe(false);
  });
});

describe("getQuestDayBounds", () => {
  it("starts the current quest cycle at the previous 09:00 ICT before 09:00", () => {
    const beforeNine = new Date("2026-09-10T01:59:59.000Z"); // 08:59:59 ICT
    expect(getQuestDayBounds(beforeNine)).toEqual({
      startIso: "2026-09-09T02:00:00.000Z", // 09:00 ICT วันที่ 9
      endIso: "2026-09-10T02:00:00.000Z", // 09:00 ICT วันที่ 10
    });
  });

  it("starts the current quest cycle at 09:00 ICT of the same day at/after 09:00", () => {
    const atNine = new Date("2026-09-10T02:00:00.000Z"); // 09:00 ICT วันที่ 10
    expect(getQuestDayBounds(atNine).startIso).toBe("2026-09-10T02:00:00.000Z");

    const afterNine = new Date("2026-09-10T10:00:00.000Z"); // 17:00 ICT วันที่ 10
    expect(getQuestDayBounds(afterNine).startIso).toBe(
      "2026-09-10T02:00:00.000Z"
    );
    expect(getQuestDayBounds(afterNine).endIso).toBe(
      "2026-09-11T02:00:00.000Z"
    );
  });

  it("still counts a completion at 07:00 ICT before 09:00 refresh", () => {
    // completed_at 2026-09-10T00:00:00Z = 07:00 ICT วันที่ 10. มองตอน 08:00 ICT
    // (ยังไม่ถึง 09:00 = รอบยังไม่รีเฟรช) → รอบปัจจุบันคือ [09:00 ICT วันที่ 9,
    // 09:00 ICT วันที่ 10] → completion ที่ 07:00 ยังอยู่ในรอบนี้.
    const bounds = getQuestDayBounds(new Date("2026-09-10T01:00:00.000Z")); // 08:00 ICT วันที่ 10
    expect("2026-09-10T00:00:00.000Z" >= bounds.startIso).toBe(true);
    expect("2026-09-10T00:00:00.000Z" < bounds.endIso).toBe(true);
  });

  it("crosses month boundaries correctly", () => {
    // 2026-09-30 03:00Z = 10:00 ICT วันที่ 30 ก.ย. → รอบเริ่ม 02:00Z วันที่ 30
    // (= 09:00 ICT วันที่ 30) และสิ้นสุด 02:00Z วันที่ 1 ต.ค.
    const bounds = getQuestDayBounds(new Date("2026-09-30T03:00:00.000Z"));
    expect(bounds.startIso).toBe("2026-09-30T02:00:00.000Z");
    expect(bounds.endIso).toBe("2026-10-01T02:00:00.000Z");
  });
});