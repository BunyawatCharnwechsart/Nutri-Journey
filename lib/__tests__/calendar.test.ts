import { describe, expect, it } from "vitest";

import {
  buildDayStatusMap,
  dayStatusForSession,
  type CalendarSessionInput,
} from "@/lib/calendar";

function completedSession(
  overrides: Partial<CalendarSessionInput> = {}
): CalendarSessionInput {
  // 16:8 ตามแผน: อด 960 นาที (16 ชม.) + กิน 480 นาที (8 ชม.) — ครบเป้า.
  return {
    fasting_start_time: "2026-09-05T02:00:00.000Z",
    status: "completed",
    if_pattern: "16:8",
    fasting_duration_minutes: 960,
    eating_duration_minutes: 480,
    ...overrides,
  };
}

describe("dayStatusForSession", () => {
  it("marks a completed session that meets both goals as success", () => {
    expect(dayStatusForSession(completedSession())).toBe("success");
  });

  it("marks a completed session that misses any goal as fail", () => {
    // อดครบแล้ว แต่กินไม่ครบ 480 นาที.
    expect(
      dayStatusForSession(completedSession({ eating_duration_minutes: 300 }))
    ).toBe("fail");
    // กินครบ แต่อดได้แค่ 800 นาที (จากเป้า 960).
    expect(
      dayStatusForSession(completedSession({ fasting_duration_minutes: 800 }))
    ).toBe("fail");
  });

  it("treats null durations as zero → fail", () => {
    expect(
      dayStatusForSession(
        completedSession({
          fasting_duration_minutes: null,
          eating_duration_minutes: null,
        })
      )
    ).toBe("fail");
  });

  it("marks an active session as active regardless of durations", () => {
    expect(
      dayStatusForSession(
        completedSession({ status: "active", fasting_duration_minutes: 0 })
      )
    ).toBe("active");
  });

  it("marks an abandoned session as abandoned (not fail)", () => {
    expect(
      dayStatusForSession(
        completedSession({ status: "abandoned", fasting_duration_minutes: 120 })
      )
    ).toBe("abandoned");
  });

  it("marks a completed session with unknown/null pattern as fail", () => {
    // เดิม: planned = 0 → ผ่านเงื่อนไข >= 0 เสมอ → success อัตโนมัติ.
    expect(
      dayStatusForSession(completedSession({ if_pattern: "99:9" }))
    ).toBe("fail");
    expect(
      dayStatusForSession(completedSession({ if_pattern: null }))
    ).toBe("fail");
  });
});

describe("buildDayStatusMap", () => {
  it("groups sessions by Thai calendar day and keeps a single status", () => {
    const map = buildDayStatusMap([
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" }),
      completedSession({ fasting_start_time: "2026-09-06T02:00:00.000Z" }),
    ]);
    expect(map.size).toBe(2);
    expect(map.get("2026-09-05")).toBe("success");
    expect(map.get("2026-09-06")).toBe("success");
  });

  it("uses the Thai day for the group key across the ICT midnight boundary", () => {
    const map = buildDayStatusMap([
      // 2026-09-05 16:59Z = 23:59 ICT ของวันที่ 5.
      completedSession({ fasting_start_time: "2026-09-05T16:59:00.000Z" }),
      // 2026-09-05 17:00Z = 00:00 ICT ของวันที่ 6.
      completedSession({ fasting_start_time: "2026-09-05T17:00:00.000Z" }),
    ]);
    expect(map.get("2026-09-05")).toBe("success");
    expect(map.get("2026-09-06")).toBe("success");
  });

  it("lets a success replace an earlier fail on the same day", () => {
    const map = buildDayStatusMap([
      completedSession({
        fasting_start_time: "2026-09-05T02:00:00.000Z",
        fasting_duration_minutes: 500,
      }),
      completedSession({ fasting_start_time: "2026-09-05T10:00:00.000Z" }),
    ]);
    expect(map.get("2026-09-05")).toBe("success");
  });

  it("keeps an earlier success over a later fail on the same day", () => {
    const map = buildDayStatusMap([
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" }),
      completedSession({
        fasting_start_time: "2026-09-05T10:00:00.000Z",
        eating_duration_minutes: 100,
      }),
    ]);
    expect(map.get("2026-09-05")).toBe("success");
  });

  it("lets a fail replace an earlier abandoned session", () => {
    const map = buildDayStatusMap([
      completedSession({
        fasting_start_time: "2026-09-05T02:00:00.000Z",
        status: "abandoned",
      }),
      completedSession({
        fasting_start_time: "2026-09-05T10:00:00.000Z",
        eating_duration_minutes: 100,
      }),
    ]);
    expect(map.get("2026-09-05")).toBe("fail");
  });

  it("lets a success replace an abandoned session", () => {
    const map = buildDayStatusMap([
      completedSession({
        fasting_start_time: "2026-09-05T02:00:00.000Z",
        status: "abandoned",
      }),
      completedSession({ fasting_start_time: "2026-09-05T10:00:00.000Z" }),
    ]);
    expect(map.get("2026-09-05")).toBe("success");
  });

  it("lets an active session win over any completed status", () => {
    const map = buildDayStatusMap([
      completedSession({ fasting_start_time: "2026-09-05T04:00:00.000Z" }),
      completedSession({
        fasting_start_time: "2026-09-05T08:00:00.000Z",
        status: "abandoned",
      }),
      completedSession({
        fasting_start_time: "2026-09-05T14:00:00.000Z",
        status: "active",
      }),
    ]);
    expect(map.get("2026-09-05")).toBe("active");
  });

  it("keeps two successes of equal rank (first wins)", () => {
    const map = buildDayStatusMap([
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" }),
      completedSession({ fasting_start_time: "2026-09-05T12:00:00.000Z" }),
    ]);
    expect(map.get("2026-09-05")).toBe("success");
  });

  it("returns an empty map for no sessions", () => {
    expect(buildDayStatusMap([]).size).toBe(0);
  });
});