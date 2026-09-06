import { getEatingMinutes, getFastingMinutes, getIfPattern } from "@/lib/if";
import { toICTDateKey } from "@/lib/timezone";

/**
 * สถานะของวันในปฏิทิน แยกจากสถานะของ session ใน DB หนึ่งชั้น:
 * - "success": ทำครบทั้ง 2 เป้า (อดถึงเป้า + กินถึงเป้า).
 * - "fail": จบ session แล้วแต่ได้ไม่ครบเป้าหมาย.
 * - "active": มี session ที่กำลังอดอยู่ (ยังไม่จบ).
 * - "abandoned": session ถูกปิดอัตโนมัติเพราะเริ่มใหม่โดยไม่จบอันเดิม.
 */
export type CalendarDayStatus = "success" | "fail" | "active" | "abandoned";

/** ฟิลด์จาก if_sessions ที่ calendar ต้องใช้ตัดสินสถานะของวัน. */
export interface CalendarSessionInput {
  fasting_start_time: string;
  status: string | null;
  if_pattern: string | null;
  fasting_duration_minutes: number | null;
  eating_duration_minutes: number | null;
}

/** ลำดับความสำคัญเมื่อมีหลาย session ในวันเดียวกัน: ยิ่งมากยิ่งชนะ. */
const STATUS_RANK: Record<CalendarDayStatus, number> = {
  abandoned: 0,
  fail: 1,
  success: 2,
  active: 3,
};

/**
 * ตัดสินสถานะของวันจาก session เดียว.
 * - "abandoned" = ไม่นับเป็น success/fail แต่แยกไว้ด้วยตัวมันเอง (ไม่ปนสี "ไม่ถึงเป้าหมาย").
 * - completed ที่ pattern null/ไม่รู้จัก = fail (กันเกิด "success อัตโนมัติ" จาก planned = 0).
 */
export function dayStatusForSession(
  session: CalendarSessionInput
): CalendarDayStatus {
  if (session.status === "active") {
    return "active";
  }
  if (session.status === "abandoned") {
    return "abandoned";
  }

  const pattern = getIfPattern(session.if_pattern);
  if (!pattern) {
    return "fail";
  }

  const fastingDuration = session.fasting_duration_minutes ?? 0;
  const eatingDuration = session.eating_duration_minutes ?? 0;
  const fastingOk = fastingDuration >= getFastingMinutes(session.if_pattern);
  const eatingOk = eatingDuration >= getEatingMinutes(session.if_pattern);
  return fastingOk && eatingOk ? "success" : "fail";
}

/**
 * จัดกลุ่ม session ตามวัน (แบบไทย) ที่การอดเริ่มต้น แล้วรวมสถานะของวัน.
 * เมื่อวันหนึ่งมีหลาย session ให้สถานะที่มี rank สูงกว่าชนะ; rank เท่ากันเก็บตัวแรก.
 * key ของ Map คือ "yyyy-MM-dd" ตามเข็มนาฬิกาไทย (ใช้ toICTDateKey).
 */
export function buildDayStatusMap(
  sessions: CalendarSessionInput[]
): Map<string, CalendarDayStatus> {
  const map = new Map<string, CalendarDayStatus>();
  for (const session of sessions) {
    const key = toICTDateKey(new Date(session.fasting_start_time));
    const status = dayStatusForSession(session);
    const existing = map.get(key);
    if (!existing || STATUS_RANK[status] > STATUS_RANK[existing]) {
      map.set(key, status);
    }
  }
  return map;
}