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
