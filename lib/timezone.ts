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
