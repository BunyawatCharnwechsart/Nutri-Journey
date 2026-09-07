import { toICT } from "@/lib/timezone";

// ============================================================================
// Pure progress-photo logic.
//
// Rules (per product decision):
//   * One complete photo SET per ICT calendar month — a set is 3 views:
//     front / side / back.
//   * Once a month has any recorded view, that month is LOCKED: it cannot be
//     re-uploaded or edited until the next calendar month begins.
//   * Comparing across months = reading the set of each month in a range.
//
// All helpers are pure (no I/O) so they are easy to unit test; the API route
// feeds DB values in here and acts on the boolean/date result.
// ============================================================================

/** All supported photo views, one photo per view per month. */
export const PROGRESS_PHOTO_VIEWS = ["front", "side", "back"] as const;
export type ProgressPhotoView = (typeof PROGRESS_PHOTO_VIEWS)[number];

/** Maximum size per photo in bytes (5 MB). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** First day of the month containing `ms`, as an ICT date key "yyyy-MM-01". */
export function getRecordedMonthKey(ms: number): string {
  const ict = toICT(new Date(ms));
  const month = String(ict.getUTCMonth() + 1).padStart(2, "0");
  return `${ict.getUTCFullYear()}-${month}-01`;
}

/**
 * Whether the current month is still open for upload.
 *
 * A month is open only when there is NO recorded view in it. Passing any
 * existing month key in `existingMonthKeys` (the distinct recorded_month keys
 * for this user) locks it.
 */
export function canUploadPhotos(
  nowMs: number,
  existingMonthKeys: string[]
): boolean {
  const currentMonthKey = getRecordedMonthKey(nowMs);
  return !existingMonthKeys.includes(currentMonthKey);
}

/**
 * Detects the actual image type from the file's magic bytes (first few
 * header bytes), so a spoofed `Content-Type` cannot bypass the file-type
 * check. Returns the normalized mime, or `null` when the bytes do not match
 * a supported image. This is the check that actually protects the app — the
 * client-sent `File.type` is only a hint.
 */
export function detectImageMime(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  if (len >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    len >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    len >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  return null;
}

/** "yyyy-MM-01" keys (e.g. "2026-09-01") → "yyyy-MM" for grouping in the UI. */
export function monthKeyFromRecordDate(recordedMonth: string): string {
  return recordedMonth.slice(0, 7);
}

/**
 * Next calendar month in the same "yyyy-MM-01" shape. Used to label the
 * trailing upload card: when the current month is still open it points at the
 * current month, otherwise at the following month.
 */
export function nextMonthKey(current: string): string {
  const [year, month] = current.split("-").map(Number);
  const january = month === 12;
  const nextYear = january ? year + 1 : year;
  const nextMonth = january ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}
