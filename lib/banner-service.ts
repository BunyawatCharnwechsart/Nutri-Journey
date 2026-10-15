import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import {
  countBanners,
  isBannerType,
  rankForBanner,
  type BannerType,
  type SeasonBannerType,
} from "@/lib/season";

/** ป้าย season รายสมัยที่ user เป็นเจ้าของ (ใหม่ → เก่า). */
export interface BannerInstance {
  /** season_rankings.id — ใช้สวมเจาะจงสมัย. */
  id: string;
  banner: SeasonBannerType;
  rank: 1 | 2 | 3;
  seasonKey: string;
}

/** Banner ที่ user เป็นเจ้าของ (season นับจาก season_rankings + betatester ทุกคนมี). */
export interface OwnedBanners {
  gold: number;
  silver: number;
  bronze: number;
  /** ของพื้นฐาน — ทุกคนมี 1 เสมอ. */
  betatester: number;
  /** ป้าย season รายสมัย (ใหม่ → เก่า) — ไว้เลือกสวมทีละสมัย. */
  instances: BannerInstance[];
  /** Banner ที่สวมอยู่ — null = ถอดออก. */
  active: BannerType | null;
  /** season_rankings.id ของป้ายที่สวม (ป้าย season เท่านั้น). */
  activeRankingId: string | null;
  /** season_key ของป้ายที่สวม (ไว้โชว์ "อันดับ 1 Season 2026-Q4"). */
  activeSeasonKey: string | null;
}

export type SetBannerError = "NOT_OWNED" | "LOAD_FAILED" | "SAVE_FAILED";

/**
 * อ่าน banner ที่ user ครอบครอง + ตัวที่สวมอยู่.
 * นับจาก season_rankings (แหล่งเดียว) ไม่ใช่ตารางสะสมแยก — ไม่มีเลขค้าง.
 */
export async function getOwnedBanners(userId: string): Promise<OwnedBanners> {
  const supabase = createServiceClient();

  const [{ data: rows, error: rankError }, { data: user, error: userError }] =
    await Promise.all([
      supabase
        .from("season_rankings")
        .select("id, banner, created_at, seasons!inner(season_key)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("active_banner, active_banner_season_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (rankError || userError) {
    throw new Error("Failed to load banners");
  }

  const counts = countBanners((rows ?? []) as Array<{ banner: string | null }>);
  const active = isBannerType(user?.active_banner) ? user.active_banner : null;

  const instances: BannerInstance[] = [];
  for (const row of (rows ?? []) as Array<{
    id: string;
    banner: string | null;
    seasons: { season_key: string } | Array<{ season_key: string }> | null;
  }>) {
    if (row.banner !== "gold" && row.banner !== "silver" && row.banner !== "bronze") {
      continue;
    }
    const season = Array.isArray(row.seasons) ? row.seasons[0] : row.seasons;
    if (!season?.season_key) {
      continue;
    }
    instances.push({
      id: row.id,
      banner: row.banner,
      rank: rankForBanner(row.banner),
      seasonKey: season.season_key,
    });
  }

  // season ของป้ายที่สวม — หาจาก instances (แถวอาจถูกลบ เหลือ type อย่างเดียว).
  const activeRankingId =
    typeof user?.active_banner_season_id === "string"
      ? (user.active_banner_season_id as string)
      : null;
  const activeSeasonKey =
    instances.find((i) => i.id === activeRankingId)?.seasonKey ?? null;

  // betatester เป็นของพื้นฐาน — ไม่ต้องมีแถว season_rankings ก็เป็นเจ้าของ.
  return { ...counts, betatester: 1, instances, active, activeRankingId, activeSeasonKey };
}

/** วิธีสวม: เจาะจงแถว (ป้าย season) หรือ type พื้นฐาน/ถอดออก. */
export type EquipInput =
  | { rankingId: string }
  | { banner: "betatester" | null }
  | { banner: SeasonBannerType };

/**
 * สวม/ถอด banner — ตรวจ ownership ฝั่ง server เสมอ (ห้ามเชื่อ client).
 *  - rankingId: ต้องเป็นแถว season_rankings ของตัวเอง → สวม type+season นั้น.
 *  - banner season (gold/silver/bronze): สวมแถวล่าสุดของ type นั้น (backward
 *    compat กับ client เก่า) — ไม่มีเลยคือ NOT_OWNED.
 *  - betatester: ทุกคนเป็นเจ้าของ — ข้ามเช็ค season_rankings.
 *  - null: ถอดออกได้เสมอ.
 */
export async function setActiveBanner(
  userId: string,
  input: EquipInput
): Promise<{ ok: true } | { ok: false; error: SetBannerError }> {
  const supabase = createServiceClient();

  let banner: BannerType | null;
  let rankingId: string | null = null;

  if ("rankingId" in input) {
    const { data, error } = await supabase
      .from("season_rankings")
      .select("id, banner")
      .eq("user_id", userId)
      .eq("id", input.rankingId)
      .maybeSingle();

    if (error) {
      console.error(`Failed to check banner ownership (user=${userId})`, error);
      return { ok: false, error: "LOAD_FAILED" };
    }
    if (!data || !isBannerType(data.banner) || data.banner === "betatester") {
      return { ok: false, error: "NOT_OWNED" };
    }
    banner = data.banner;
    rankingId = data.id;
  } else if (input.banner === null || input.banner === "betatester") {
    banner = input.banner;
  } else {
    if (!isBannerType(input.banner)) {
      return { ok: false, error: "NOT_OWNED" };
    }
    const { data, error } = await supabase
      .from("season_rankings")
      .select("id")
      .eq("user_id", userId)
      .eq("banner", input.banner)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Failed to check banner ownership (user=${userId})`, error);
      return { ok: false, error: "LOAD_FAILED" };
    }
    if (!data) {
      return { ok: false, error: "NOT_OWNED" };
    }
    banner = input.banner;
    rankingId = data.id as string;
  }

  const { error: saveError } = await supabase
    .from("users")
    .update({ active_banner: banner, active_banner_season_id: rankingId })
    .eq("user_id", userId);

  if (saveError) {
    console.error(`Failed to save active banner (user=${userId})`, saveError);
    return { ok: false, error: "SAVE_FAILED" };
  }

  return { ok: true };
}
