const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

/** เลื่อน UTC timestamp ให้เป็นเวลาไทย (ICT / UTC+7). */
export function toICT(date: Date): Date {
  return new Date(date.getTime() + ICT_OFFSET_MS);
}

/** ดึงวันที่แบบไทย (1-31) จาก UTC timestamp. */
export function getICTDay(date: Date): number {
  return toICT(date).getUTCDate();
}

/** ดึงเดือนแบบไทย (0-11) จาก UTC timestamp. */
export function getICTMonth(date: Date): number {
  return toICT(date).getUTCMonth();
}

/** ดึงปีแบบไทย จาก UTC timestamp. */
export function getICTYear(date: Date): number {
  return toICT(date).getUTCFullYear();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** วันตามผนัง (wall-clock) แบบไทย "yyyy-MM-dd" จาก UTC timestamp. */
export function toICTDateKey(date: Date): string {
  const ict = toICT(date);
  return `${ict.getUTCFullYear()}-${pad2(ict.getUTCMonth() + 1)}-${pad2(
    ict.getUTCDate()
  )}`;
}

/** เดือนตามผนัง (wall-clock) แบบไทย "yyyy-MM" จาก UTC timestamp. */
export function toICTMonthKey(date: Date): string {
  const ict = toICT(date);
  return `${ict.getUTCFullYear()}-${pad2(ict.getUTCMonth() + 1)}`;
}

export interface ICTMonthBounds {
  startIso: string;
  endIso: string;
}

export interface ICTDayBounds {
  /** 00:00 ของวัน ICT เป็น UTC timestamp. */
  startIso: string;
  /** 00:00 ของวัน ICT ถัดไป เป็น UTC timestamp. */
  endIso: string;
}

/**
 * ขอบเขต UTC ของวันตามผนัง (wall-clock) แบบไทยสำหรับ timestamp.
 * เช่น 2026-09-10 ICT → start "2026-09-09T17:00:00Z", end "2026-09-10T17:00:00Z".
 */
export function getICTDayBounds(date: Date): ICTDayBounds {
  const todayKey = toICTDateKey(date);
  const start = new Date(`${todayKey}T00:00:00+07:00`);
  return {
    startIso: start.toISOString(),
    endIso: new Date(start.getTime() + 86_400_000).toISOString(),
  };
}

/**
 * ขอบเขต UTC สำหรับ query ของเดือนที่เลือก (month เริ่มนับ 1 แบบปกติ).
 * startIso = 00:00 วันที่ 1 ของเดือนแบบไทย; endIso = 00:00 วันที่ 1 เดือนถัดไป.
 * เช่น กันยายน 2026 → start "2026-08-31T17:00:00Z", end "2026-09-30T17:00:00Z".
 */
export function getICTMonthBounds(year: number, month: number): ICTMonthBounds {
  const monthStartICT = new Date(Date.UTC(year, month - 1, 1));
  const monthEndICT = new Date(Date.UTC(year, month, 1));
  return {
    startIso: new Date(monthStartICT.getTime() - ICT_OFFSET_MS).toISOString(),
    endIso: new Date(monthEndICT.getTime() - ICT_OFFSET_MS).toISOString(),
  };
}

/** เวลา ~รอบเควสประจำวัน~ เริ่มต้นแต่ละวัน (09:00 ICT). */
export const QUEST_DAY_START_HOUR_ICT = 9;

/**
 * ขอบเขต UTC ของรอบ "เควสประจำวัน": เริ่ม 09:00 ICT ของวัน และสิ้นสุด
 * 09:00 ICT ของวันถัดไป — ภารกิจรายวันจะรีเฟรชตอน 09:00 เช้า ไม่ใช่เที่ยงคืน.
 *
 * เช่น ตอนนี้เป็น 07:00 ICT ของวันที่ 10 → รอบนี้คือ 09:00 ICT วันที่ 9
 * ถึง 09:00 ICT วันที่ 10 (ยังไม่รีเฟรช) ส่วนเวลา 10:00 ICT วันที่ 10 →
 * รอบนี้คือ 09:00 ICT วันที่ 10 ถึง 09:00 ICT วันที่ 11.
 */
export function getQuestDayBounds(date: Date): ICTDayBounds {
  const ict = toICT(date);
  const y = ict.getUTCFullYear();
  const m = ict.getUTCMonth();
  const d = ict.getUTCDate();

  // 09:00 ICT = 02:00 UTC ของวันเดียวกัน. ถ้ายังไม่ถึง 09:00 ICT (เช่น 07:00)
  // รอบนี้เริ่มตั้งแต่ 02:00 UTC เมื่อวาน (09:00 ICT เมื่อวาน).
  const startUtcMs =
    (ict.getUTCHours() < QUEST_DAY_START_HOUR_ICT
      ? Date.UTC(y, m, d - 1)
      : Date.UTC(y, m, d)) +
    2 * 60 * 60 * 1000;

  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(startUtcMs + 86_400_000).toISOString(),
  };
}
