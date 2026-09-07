import { describe, expect, it } from "vitest";

import {
  buildDayMoodMap,
  buildDayStatusMap,
  countMonthStatus,
  countMonthSuccess,
  daysInMonth,
  dayStatusForSession,
  type CalendarSessionInput,
} from "@/lib/calendar";

function completedSession(
  overrides: Partial<CalendarSessionInput> = {}
): CalendarSessionInput {
  // completed + result "success" (เหมือนแถวที่ migration 0025 กัน snapshot).
  return {
    fasting_start_time: "2026-09-05T02:00:00.000Z",
    status: "completed",
    if_pattern: "16:8",
    fasting_duration_minutes: 960,
    eating_duration_minutes: 480,
    result: "success",
    mood: null,
    ...overrides,
  };
}

describe("dayStatusForSession", () => {
  it("marks a completed session with result 'success' as success", () => {
    expect(dayStatusForSession(completedSession())).toBe("success");
  });

  it("marks a completed session with result 'fail' as fail", () => {
    expect(
      dayStatusForSession(completedSession({ result: "fail" }))
    ).toBe("fail");
  });

  it("treats a completed session with a null result as fail (legacy guard)", () => {
    // หลัง migration 0025 ไม่ควรมีแถวแบบนี้ — เป็น fail ปลอดภัย ไม่ auto-success.
    expect(
      dayStatusForSession(completedSession({ result: null }))
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
        result: "fail",
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
        result: "fail",
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
        result: "fail",
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

  it("ignores sessions whose start time is invalid", () => {
    const map = buildDayStatusMap([
      completedSession({ fasting_start_time: "not-a-date" }),
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" }),
    ]);
    expect(map.size).toBe(1);
    expect(map.get("2026-09-05")).toBe("success");
  });
});

describe("buildDayMoodMap", () => {
  it("returns the mood of a session with one", () => {
    const map = buildDayMoodMap([
      completedSession({ mood: "Very good" }),
    ]);
    expect(map.get("2026-09-05")).toBe("Very good");
  });

  it("omits days whose session has no mood", () => {
    const map = buildDayMoodMap([completedSession({ mood: null })]);
    expect(map.size).toBe(0);
  });

  it("falls back to the latest mood (fail replaces abandoned)", () => {
    const map = buildDayMoodMap([
      completedSession({ status: "abandoned", mood: "Bad" }),
      completedSession({
        fasting_start_time: "2026-09-05T10:00:00.000Z",
        result: "fail",
        mood: "Medium",
      }),
    ]);
    expect(map.get("2026-09-05")).toBe("Medium");
  });

  it("falls back to the latest mood when the success session has no mood", () => {
    // success 02:00 ไม่มีอารมณ์; fail 12:00 มี → โชว์ mood ล่าสุด (fail).
    const map = buildDayMoodMap([
      completedSession({ mood: null }),
      completedSession({
        fasting_start_time: "2026-09-05T12:00:00.000Z",
        result: "fail",
        mood: "Good",
      }),
    ]);
    expect(map.get("2026-09-05")).toBe("Good");
  });

  it("prefers the latest mood among equal-status sessions", () => {
    const map = buildDayMoodMap([
      completedSession({ mood: "Very good" }),
      completedSession({
        fasting_start_time: "2026-09-05T12:00:00.000Z",
        mood: "Very bad",
      }),
    ]);
    expect(map.get("2026-09-05")).toBe("Very bad");
  });

  it("prefers a success mood over a later non-success mood", () => {
    const map = buildDayMoodMap([
      completedSession({
        fasting_start_time: "2026-09-05T08:00:00.000Z",
        result: "fail",
        mood: "Bad",
      }),
      completedSession({
        fasting_start_time: "2026-09-05T09:00:00.000Z",
        mood: "Good",
      }),
    ]);
    expect(map.get("2026-09-05")).toBe("Good");
  });

  it("picks the latest among multiple success moods", () => {
    const map = buildDayMoodMap([
      completedSession({ fasting_start_time: "2026-09-05T09:00:00.000Z", mood: "Very good" }),
      completedSession({ fasting_start_time: "2026-09-05T10:00:00.000Z", mood: "Good" }),
    ]);
    expect(map.get("2026-09-05")).toBe("Good");
  });

  it("returns an empty map for no sessions", () => {
    expect(buildDayMoodMap([]).size).toBe(0);
  });
});

describe("daysInMonth", () => {
  it("handles 28, 29, 30 and 31-day months", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29); // leap year
    expect(daysInMonth(2026, 9)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
  });
});

describe("countMonthSuccess", () => {
  it("counts distinct success days in the month", () => {
    const sessions = [
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" }),
      completedSession({ fasting_start_time: "2026-09-07T02:00:00.000Z" }),
    ];
    expect(countMonthSuccess(sessions, "2026-09")).toBe(2);
  });

  it("counts a day once even with multiple sessions that day", () => {
    const sessions = [
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" }),
      completedSession({ fasting_start_time: "2026-09-05T10:00:00.000Z" }),
    ];
    expect(countMonthSuccess(sessions, "2026-09")).toBe(1);
  });

  it("ignores fail, active and abandoned days", () => {
    const sessions = [
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z", result: "fail" }),
      completedSession({ fasting_start_time: "2026-09-06T02:00:00.000Z", status: "active" }),
      completedSession({ fasting_start_time: "2026-09-07T02:00:00.000Z", status: "abandoned" }),
      completedSession({ fasting_start_time: "2026-09-08T02:00:00.000Z" }),
    ];
    expect(countMonthSuccess(sessions, "2026-09")).toBe(1);
  });

  it("ignores sessions in other months (Thai wall-clock day)", () => {
    const sessions = [
      completedSession({ fasting_start_time: "2026-08-29T02:00:00.000Z" }), // ส.ค. 29 (ไทย)
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" }), // ก.ย. 5 (ไทย)
      completedSession({ fasting_start_time: "2026-10-01T02:00:00.000Z" }), // ต.ค. 1 (ไทย)
    ];
    expect(countMonthSuccess(sessions, "2026-09")).toBe(1);
  });

  it("returns 0 when there are no sessions", () => {
    expect(countMonthSuccess([], "2026-09")).toBe(0);
  });
});

describe("countMonthStatus", () => {
  it("counts distinct days of a given status in the month", () => {
    const sessions = [
      completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z", result: "fail" }),
      completedSession({ fasting_start_time: "2026-09-06T02:00:00.000Z" }),
      completedSession({ fasting_start_time: "2026-09-07T02:00:00.000Z", status: "active" }),
      completedSession({ fasting_start_time: "2026-09-07T10:00:00.000Z", result: "fail" }),
    ];
    expect(countMonthStatus(sessions, "2026-09", "success")).toBe(1);
    expect(countMonthStatus(sessions, "2026-09", "fail")).toBe(1);
    expect(countMonthStatus(sessions, "2026-09", "active")).toBe(1);
  });

  it("returns 0 for a status that does not exist in the month", () => {
    const sessions = [completedSession({ fasting_start_time: "2026-09-05T02:00:00.000Z" })];
    expect(countMonthStatus(sessions, "2026-09", "abandoned")).toBe(0);
  });
});