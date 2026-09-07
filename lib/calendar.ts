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
  /** success/fail เก็บใน DB (snapshot ตอนจบ, migration 0025) — null ถ้า active/abandoned. */
  result: string | null;
  /** อารมณ์ที่เลือกตอนจบ IF (text เช่น "Good") — null/หายไป = ยังไม่มี. */
  mood: string | null;
}

/** ลำดับความสำคัญเมื่อมีหลาย session ในวันเดียวกัน: ยิ่งมากยิ่งชนะ. */
const STATUS_RANK: Record<CalendarDayStatus, number> = {
  abandoned: 0,
  fail: 1,
  success: 2,
  active: 3,
};

/**
 * ตัดสินสถานะของวันจาก session เดียว — อ่านจาก `result` ที่ล็อกตอนจบ
 * (migration 0025) แทนการคำนวณใหม่จาก duration, เพื่อกัน dual source of truth.
 * - "active" / "abandoned" = ยังไม่ใช่ success/fail.
 * - completed + `result = success` → success, นอกนั้น (รวม fail) → fail.
 * - completed + `result = null` (แถวเก่าที่ไม่ถูก backfill — ไม่ควรเกิด) → fail:
 *   กัน "success อัตโนมัติ" จาก rule ที่คำนวณตามไม่ได้อีก.
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
  return session.result === "success" ? "success" : "fail";
}

interface DaySummary {
  status: CalendarDayStatus;
  mood: string | null;
}

/**
 * จัดกลุ่ม session ตามวัน (แบบไทย) ที่การอดเริ่มต้น แล้วรวม status + mood
 * ของวันไว้ด้วยกัน เผื่อ buildDayStatusMap / buildDayMoodMap ใช้ logic "ตัวชนะ"
 * ชุดเดียว แทนที่จะเขียนซ้ำ 2 ที่ (ถ้า logic แยกกัน สถานะกับ emoji จะเลือก
 * session ไม่ตรงกัน).
 *
 * key ของ Map คือ "yyyy-MM-dd" ตามเข็มนาฬิกาไทย (ใช้ toICTDateKey).
 */
function buildDaySummaryMap(
  sessions: CalendarSessionInput[]
): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  for (const session of sessions) {
    const startTime = new Date(session.fasting_start_time);
    if (Number.isNaN(startTime.getTime())) {
      // เวลาเริ่มต้นเสีย (เช่น DB มีค่า invalid) → ข้ามไป ไม่ควรสร้าง key "NaN-NaN-NaN".
      continue;
    }
    const key = toICTDateKey(startTime);
    const status = dayStatusForSession(session);
    const mood = session.mood ?? null;
    const existing = map.get(key);
    if (!existing || STATUS_RANK[status] > STATUS_RANK[existing.status]) {
      map.set(key, { status, mood });
    }
  }
  return map;
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
  for (const [key, summary] of buildDaySummaryMap(sessions)) {
    map.set(key, summary.status);
  }
  return map;
}

/**
 * จัดกลุ่ม session ตามวัน (แบบไทย) แล้วเลือก mood ที่จะแสดง 1 ตัวต่อวัน:
 *
 * 1. มี session ที่ status = success และมี mood → ใช้ mood ของ "success ตัวที่เริ่ม
 *    หลังสุด" (ผลลัพธ์ที่ดีที่สุดของวันชนะเสมอ แม้จะเร็วกว่า session หลัง).
 * 2. ไม่มี success mood เลย (เช่น วันนั้น fail ทั้งหมด) → ใช้ mood ของ session
 *    ที่เริ่มหลังสุดของวัน (อารมณ์ล่าสุด).
 *
 * หมายเหตุ: อันนี้ต่างจาก buildDayStatusMap ที่ใช้ rank ต่อวัน — เพื่อให้วันที่
 * success แต่ไม่ได้บันทึกอารมณ์ ยังโชว์ mood ล่าสุดได้อยู่ ถ้ามี. วันไหนไม่มี
 * mood เลย จะไม่มี key ในผลลัพธ์.
 */
export function buildDayMoodMap(
  sessions: CalendarSessionInput[]
): Map<string, string> {
  const byDay = new Map<string, CalendarSessionInput[]>();

  for (const session of sessions) {
    if (session.mood === null) {
      continue;
    }
    const startTime = new Date(session.fasting_start_time);
    if (Number.isNaN(startTime.getTime())) {
      continue;
    }
    const key = toICTDateKey(startTime);
    const list = byDay.get(key) ?? [];
    list.push(session);
    byDay.set(key, list);
  }

  const latestWithMood = (list: CalendarSessionInput[]) =>
    list.reduce(
      (a, b) =>
        new Date(b.fasting_start_time).getTime() >
        new Date(a.fasting_start_time).getTime()
          ? b
          : a
    );

  const map = new Map<string, string>();
  for (const [key, list] of byDay) {
    const successMoods = list.filter(
      (session) => dayStatusForSession(session) === "success"
    );
    const picked =
      successMoods.length > 0 ? latestWithMood(successMoods) : latestWithMood(list);
    const mood = picked.mood;
    if (mood !== null) {
      map.set(key, mood);
    }
  }
  return map;
}