import {
  BANNERS,
  STREAK_CHIP_CLASS,
  championStreakText,
  seasonBadgeText,
  type BannerType,
} from "@/lib/season";

/**
 * ป้าย Banner หลังชื่อ (text + สี) — ใช้ร่วมกันทั้ง profile / ranking /
 * dashboard เพื่อให้หน้าตาไม่เพี้ยนกัน. null → render nothing.
 *
 * ป้าย season ที่ระบุ seasonKey จะโชว์แบบ "อันดับ 1 Season 2026-Q4";
 * ไม่มี seasonKey (โหมดเก่า/betatester) โชว์ label เดิม.
 *
 * มี streak (แชมป์ติดกัน >= 2 สมัย) → เพิ่มชิป "N สมัยติด" ต่อท้าย
 * (ชิปแยก — คอลัมน์โพเดียมแคบ wrap ขึ้นบรรทัดใหม่ได้ ไม่ดันชื่อหาย).
 */
export default function BannerBadge({
  banner,
  seasonKey,
  streak,
}: {
  banner: BannerType | null | undefined;
  /** season ของป้ายที่สวม (เช่น "2026-Q4") — ป้าย season เท่านั้น. */
  seasonKey?: string | null;
  /** แชมป์ติดกันลงท้ายที่สมัยของป้ายนี้ — โชว์เมื่อ >= 2 (pure helper กรอง). */
  streak?: number | null;
}) {
  if (banner == null) {
    return null;
  }
  const meta = BANNERS[banner];
  const text = seasonBadgeText(banner, seasonKey) ?? meta.label;
  // streak โชว์เฉพาะป้ายที่ระบุสมัย (โหมดเก่า/betatester ไม่มีบริบทสมัย).
  const streakText = seasonKey != null ? championStreakText(streak) : null;

  return (
    <>
      <span
        className={`ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 align-middle text-xs font-semibold whitespace-nowrap ring-1 ${meta.chipClass}`}
        title={text}
      >
        {text}
      </span>
      {streakText != null && (
        <span
          className={`ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 align-middle text-xs font-semibold whitespace-nowrap ring-1 ${STREAK_CHIP_CLASS}`}
          title={`แชมป์ติดกัน ${streakText}`}
        >
          {streakText}
        </span>
      )}
    </>
  );
}
