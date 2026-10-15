import { BANNERS, seasonBadgeText, type BannerType } from "@/lib/season";

/**
 * ป้าย Banner หลังชื่อ (text + สี) — ใช้ร่วมกันทั้ง profile / ranking /
 * dashboard เพื่อให้หน้าตาไม่เพี้ยนกัน. null → render nothing.
 *
 * ป้าย season ที่ระบุ seasonKey จะโชว์แบบ "อันดับ 1 Season 2026-Q4";
 * ไม่มี seasonKey (โหมดเก่า/betatester) โชว์ label เดิม.
 */
export default function BannerBadge({
  banner,
  seasonKey,
  count,
}: {
  banner: BannerType | null | undefined;
  /** season ของป้ายที่สวม (เช่น "2026-Q4") — ป้าย season เท่านั้น. */
  seasonKey?: string | null;
  /** จำนวนครั้งที่เคยได้ (เช่น แชมป์ Season x2) — ไม่ส่งมาคือโชว์ชิ้นเดียว. */
  count?: number | null;
}) {
  if (banner == null) {
    return null;
  }
  const meta = BANNERS[banner];
  const text = seasonBadgeText(banner, seasonKey) ?? meta.label;
  // โหมดเก่า (ไม่มี seasonKey) ยังโชว์ตัวคูณสะสม; โหมดระบุสมัยไม่ต้อง
  // (สมัยอยู่ในข้อความแล้ว).
  const showCount =
    seasonKey == null && count != null && Number(count) > 1
      ? ` x${count}`
      : null;

  return (
    <span
      className={`ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 align-middle text-xs font-medium whitespace-nowrap ring-1 ${meta.chipClass}`}
      title={text}
    >
      {text}
      {showCount}
    </span>
  );
}
