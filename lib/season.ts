/**
 * Season helpers — pure + ICT wall-clock (ไม่แตะ DB เทสต์ได้เลย).
 *
 * Season = calendar quarter ตามเวลาไทย:
 *   Q1 ม.ค.-มี.ค. / Q2 เม.ย.-มิ.ย. / Q3 ก.ค.-ก.ย. / Q4 ต.ค.-ธ.ค.
 *   season_key เช่น "2026-Q4".
 *
 * Banner Top 1-3 (ถาวรสะสมได้):
 *   rank 1 → gold / rank 2 → silver / rank 3 → bronze / นอกนั้น null.
 */

export const BANNER_TYPES = ["gold", "silver", "bronze", "betatester"] as const;

export type BannerType = (typeof BANNER_TYPES)[number];

/** Banner ที่มาจากอันดับ season (betatester เป็นป้ายของผู้ร่วม Beta แยกต่างหาก). */
export const SEASON_BANNER_TYPES = ["gold", "silver", "bronze"] as const;

export type SeasonBannerType = (typeof SEASON_BANNER_TYPES)[number];

/** Metadata สำหรับ render Badge (text + สี) — เพิ่มชนิดใหม่แค่เติมตรงนี้. */
export const BANNERS: Record<
  BannerType,
  { label: string; chipClass: string }
> = {
  gold: {
    label: "แชมป์ Season",
    // ทองทึบ + ตัวน้ำตาลเข้ม (contrast ~6.4:1 ผ่าน WCAG AA ตัว 12px).
    chipClass: "bg-[#F5B301] text-[#422A00] ring-[#C78D06]",
  },
  silver: {
    label: "รองแชมป์ Season",
    // เทาเข้ม + ตัวขาว (contrast ~7.7:1).
    chipClass: "bg-[#52525B] text-white ring-[#3F3F46]",
  },
  bronze: {
    label: "อันดับ 3 Season",
    // ทองแดงส้มเข้ม + ตัวขาว (contrast ~5:1) — เลิกใช้โทนชมพูเดิม.
    chipClass: "bg-[#B45309] text-white ring-[#92400E]",
  },
  betatester: {
    label: "ผู้ร่วม Beta",
    // ฟ้าเข้ม + ตัวขาว (contrast ~5.9:1).
    chipClass: "bg-[#0369A1] text-white ring-[#075985]",
  },
};

/** ชิป "N สมัยติด" (แชมป์ติดกัน) — อำพันเข้ม + ตัวขาว (contrast ~7:1). */
export const STREAK_CHIP_CLASS = "bg-[#92400E] text-white ring-[#78350F]";

/** Banner ของอันดับ season — นอก Top 3 ได้ null (ไม่มี banner). */
export function bannerForRank(rank: number): SeasonBannerType | null {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return null;
}

/** อันดับของป้าย season — กลับด้าน bannerForRank (betatester ไม่มีอันดับ). */
export function rankForBanner(banner: SeasonBannerType): 1 | 2 | 3 {
  if (banner === "gold") return 1;
  if (banner === "silver") return 2;
  return 3;
}

/**
 * ข้อความบนป้ายหลังชื่อ — ป้าย season ระบุอันดับ + season ที่ได้มา
 * (เช่น "อันดับ 1 Season 2026-Q4"), betatester/ว่างใช้ label เดิม.
 * pure แยกไว้เทสต์ + ใช้ร่วมทุกหน้า (Badge/Picker/ranking).
 */
export function seasonBadgeText(
  banner: BannerType | null | undefined,
  seasonKey?: string | null
): string | null {
  if (banner == null) {
    return null;
  }
  if (banner === "betatester" || seasonKey == null || seasonKey === "") {
    return BANNERS[banner].label;
  }
  return `อันดับ ${rankForBanner(banner)} Season ${seasonKey}`;
}

export function isBannerType(value: unknown): value is BannerType {
  return (
    typeof value === "string" &&
    (BANNERS as Record<string, unknown>)[value] !== undefined
  );
}

/** Quarter (1-4) จากเดือน ICT 0-11. */
export function quarterFromICTMonth(ictMonth0: number): number {
  return Math.floor(ictMonth0 / 3) + 1;
}

/**
 * season_key "yyyy-Qn" จาก Date — ยึดเวลาไทย (ICT = UTC+7) ไม่ขึ้นกับ
 * timezone เครื่อง (pattern เดียวกับ lib/timezone.ts).
 */
export function getSeasonKey(date: Date): string {
  const ictMs = date.getTime() + 7 * 60 * 60 * 1000;
  const ict = new Date(ictMs);
  const year = ict.getUTCFullYear();
  const quarter = quarterFromICTMonth(ict.getUTCMonth());
  return `${year}-Q${quarter}`;
}

/** ปี + quarter จาก season_key — โยน Error ถ้าฟอร์แมตผิด. */
export function parseSeasonKey(seasonKey: string): { year: number; quarter: number } {
  const match = /^(\d{4})-Q([1-4])$/.exec(seasonKey.trim());
  if (!match) {
    throw new Error(`Invalid season_key: ${seasonKey}`);
  }
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

/**
 * ขอบเขต season เป็น UTC ISO — starts_at = 00:00 วันที่ 1 เดือนแรกของ
 * quarter ตามเวลาไทย, ends_at = 00:00 วันที่ 1 เดือนแรกของ quarter ถัดไป.
 * เช่น Q4 2026 → starts "2026-09-30T17:00:00Z", ends "2027-01-...".
 */
export function getQuarterBounds(
  year: number,
  quarter: number
): { startsAtIso: string; endsAtIso: string } {
  if (!Number.isInteger(year) || quarter < 1 || quarter > 4) {
    throw new Error(`Invalid year/quarter: ${year} Q${quarter}`);
  }
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
  const startMonth0 = (quarter - 1) * 3; // 0,3,6,9
  const startsAt = new Date(Date.UTC(year, startMonth0, 1) - ICT_OFFSET_MS);
  const endsAt = new Date(Date.UTC(year, startMonth0 + 3, 1) - ICT_OFFSET_MS);
  return { startsAtIso: startsAt.toISOString(), endsAtIso: endsAt.toISOString() };
}

/** นับ banner season สะสมจากแถว season_rankings ของ user คนเดียว. */
export function countBanners(
  rows: Array<{ banner: string | null }>
): Record<SeasonBannerType, number> {
  const counts: Record<SeasonBannerType, number> = {
    gold: 0,
    silver: 0,
    bronze: 0,
  };
  for (const row of rows) {
    // betatester ไม่เคยอยู่ใน season_rankings — ข้ามเสมอ.
    if (
      row.banner === "gold" ||
      row.banner === "silver" ||
      row.banner === "bronze"
    ) {
      counts[row.banner] += 1;
    }
  }
  return counts;
}

/**
 * season_key ของ quarter ก่อนหน้า — รองรับข้ามปี (2026-Q1 → 2025-Q4).
 * ใช้เดินย้อนนับแชมป์ติดกัน. โยน Error ถ้าฟอร์แมตผิด (เหมือน parseSeasonKey).
 */
export function previousSeasonKey(seasonKey: string): string {
  const { year, quarter } = parseSeasonKey(seasonKey);
  if (quarter === 1) {
    return `${year - 1}-Q4`;
  }
  return `${year}-Q${quarter - 1}`;
}

/**
 * นับแชมป์ (gold) ติดกันลงท้ายที่ season ที่ระบุ — ไล่ย้อน quarter ทีละสมัย.
 * สมัยที่ได้ silver/bronze/ไม่มีแชมป์ = ขาด (หยุดนับ). สมัยนั้นไม่ได้ gold → 0.
 * pure ล้วน — เทสต์ได้โดยไม่ต้องต่อ DB.
 */
export function championStreakEndingAt(
  rows: Array<{ seasonKey: string; banner: string | null }>,
  targetSeasonKey: string
): number {
  const goldSeasons = new Set(
    rows.filter((row) => row.banner === "gold").map((row) => row.seasonKey)
  );
  if (!goldSeasons.has(targetSeasonKey)) {
    return 0;
  }
  let streak = 0;
  let cursor = targetSeasonKey;
  while (goldSeasons.has(cursor)) {
    streak += 1;
    cursor = previousSeasonKey(cursor);
  }
  return streak;
}

/**
 * ข้อความชิป streak — โชว์เมื่อแชมป์ติดกัน 2 สมัยขึ้นไป (สมัยเดียวไม่นับ).
 */
export function championStreakText(streak: number | null | undefined): string | null {
  if (streak == null || streak < 2) {
    return null;
  }
  return `${streak} สมัยติด`;
}

export interface CurrentSeason {
  seasonKey: string;
  year: number;
  quarter: number;
  startsAtIso: string;
  endsAtIso: string;
}

/** Season ปัจจุบัน (ICT) พร้อมขอบเขต — ใช้ได้ทั้ง server component และ cron. */
export function getCurrentSeason(now: Date = new Date()): CurrentSeason {
  const seasonKey = getSeasonKey(now);
  const { year, quarter } = parseSeasonKey(seasonKey);
  const { startsAtIso, endsAtIso } = getQuarterBounds(year, quarter);
  return { seasonKey, year, quarter, startsAtIso, endsAtIso };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * ข้อความนับถอยหลัง เช่น "75 วัน 04:12:33" — ค่าติดลบถือว่าหมดเวลาแล้ว (0).
 * pure แยกไว้เทสต์ได้โดยไม่ต้องรอเวลาจริง.
 */
export function formatSeasonCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days} วัน ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/** ชื่อเดือนไทยย่อ — ไว้โชว์วันรีเซ็ต (วันแรกของ quarter ถัดไป). */
const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/**
 * ป้ายวันรีเซ็ตภาษาไทย เช่น "1 ม.ค. 2570" จาก endsAtIso (เที่ยงคืน ICT
 * วันแรกของ quarter ถัดไป). ปีเป็น พ.ศ. (+543).
 */
export function formatResetDate(endsAtIso: string): string {
  const ictMs = new Date(endsAtIso).getTime() + 7 * 60 * 60 * 1000;
  const ict = new Date(ictMs);
  const day = ict.getUTCDate();
  const month = THAI_MONTHS[ict.getUTCMonth()] ?? "";
  const year = ict.getUTCFullYear() + 543;
  return `${day} ${month} ${year}`;
}
