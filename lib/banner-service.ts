import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import {
  championStreakEndingAt,
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
  /** แชมป์ (gold) ติดกันลงท้ายที่สมัยนี้ — 1 = สมัยเดียว, 0 = ไม่ใช่แชมป์. */
  streak: number;
}

/** Banner ที่ user เป็นเจ้าของ (season นับจาก season_rankings + betatester ของผู้ร่วม Beta). */
export interface OwnedBanners {
  gold: number;
  silver: number;
  bronze: number;
  /** 1 = ผู้ร่วม Beta (users.is_beta_tester = true) — ไม่ใช่ทุกคน. */
  betatester: number;
  /** ป้าย season รายสมัย (ใหม่ → เก่า) — ไว้เลือกสวมทีละสมัย. */
  instances: BannerInstance[];
  /** Banner ที่สวมอยู่ — null = ถอดออก. */
  active: BannerType | null;
  /** season_rankings.id ของป้ายที่สวม (ป้าย season เท่านั้น). */
  activeRankingId: string | null;
  /** อ่าน season ของป้ายที่สวม (ไว้โชว์ "อันดับ 1 Season 2026-Q4"). */
  activeSeasonKey: string | null;
  /**
   * แชมป์ติดกันลงท้ายที่ป้ายที่สวม (>=2 = streak) — null เมื่อสวมป้าย
   * betatester/ไม่สวมป้าย season.
   */
  activeStreak: number | null;
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
        .select("active_banner, active_banner_season_id, is_beta_tester")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (rankError || userError) {
    throw new Error("Failed to load banners");
  }

  const counts = countBanners((rows ?? []) as Array<{ banner: string | null }>);
  const active = isBannerType(user?.active_banner) ? user.active_banner : null;

  const instances: BannerInstance[] = [];
  // แถวทั้งหมด (ทุก banner) ไว้คำนวณ streak — ต้องเห็น silver/bronze ด้วย
  // เพื่อรู้ว่าสมัยไหน streak ขาด.
  const streakRows: Array<{ seasonKey: string; banner: string | null }> = [];
  for (const row of (rows ?? []) as Array<{
    id: string;
    banner: string | null;
    seasons: { season_key: string } | Array<{ season_key: string }> | null;
  }>) {
    const season = Array.isArray(row.seasons) ? row.seasons[0] : row.seasons;
    if (!season?.season_key) {
      continue;
    }
    streakRows.push({ seasonKey: season.season_key, banner: row.banner });
    if (row.banner !== "gold" && row.banner !== "silver" && row.banner !== "bronze") {
      continue;
    }
    instances.push({
      id: row.id,
      banner: row.banner,
      rank: rankForBanner(row.banner),
      seasonKey: season.season_key,
      // เติมจริงด้านล่าง — สมัยซ้ำกันใช้ cache ค่าเดียวไม่คำนวณซ้ำ.
      streak: 0,
    });
  }

  const streakCache = new Map<string, number>();
  for (const instance of instances) {
    let streak = streakCache.get(instance.seasonKey);
    if (streak == null) {
      streak = championStreakEndingAt(streakRows, instance.seasonKey);
      streakCache.set(instance.seasonKey, streak);
    }
    instance.streak = streak;
  }

  // season ของป้ายที่สวม — หาจาก instances (แถวอาจถูกลบ เหลือ type อย่างเดียว).
  const activeRankingId =
    typeof user?.active_banner_season_id === "string"
      ? (user.active_banner_season_id as string)
      : null;
  const activeInstance =
    instances.find((i) => i.id === activeRankingId) ?? null;
  const activeSeasonKey = activeInstance?.seasonKey ?? null;
  const activeStreak = activeInstance?.streak ?? null;

  // betatester เฉพาะผู้ร่วมทดสอบ Beta — ธงจาก users (ไม่ใช่ของทุกคน).
  return {
    ...counts,
    betatester: user?.is_beta_tester === true ? 1 : 0,
    instances,
    active,
    activeRankingId,
    activeSeasonKey,
    activeStreak,
  };
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
 *  - betatester: เฉพาะผู้ร่วม Beta (users.is_beta_tester = true) — ไม่งั้น
 *    NOT_OWNED.
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

    // betatester เฉพาะผู้ร่วม Beta — เช็คธงฝั่ง server เสมอ (ห้ามเชื่อ client).
    if (banner === "betatester") {
      const { data: owner, error: ownerError } = await supabase
        .from("users")
        .select("is_beta_tester")
        .eq("user_id", userId)
        .maybeSingle();

      if (ownerError) {
        console.error(`Failed to check beta ownership (user=${userId})`, ownerError);
        return { ok: false, error: "LOAD_FAILED" };
      }
      if (owner?.is_beta_tester !== true) {
        return { ok: false, error: "NOT_OWNED" };
      }
    }
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
