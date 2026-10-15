import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { levelFromPoints } from "@/lib/healthy-journey";
import type { BannerType } from "@/lib/season";

/** ชื่อสำรองถ้า user ไม่มี display_name (ไม่ควรเกิด แต่กัน null หลุดไป UI). */
export const RANKING_ANONYMOUS_NAME = "นักเดินทางไร้ชื่อ";

/** แถวดิบจาก DB ก่อนแปลงเป็น entry พร้อมอันดับ. */
export interface RankingRow {
  user_id: string;
  /** lifetime — ไว้คิด level (ไข่ไม่รีเซ็ตตาม season). */
  total_points: number;
  /** แต้ม season ปัจจุบัน — ไว้จัดอันดับ + โชว์เป็น exp. */
  season_points: number;
  display_name: string | null;
  avatar_url: string | null;
  active_banner: BannerType | null;
  /** season_key ของป้ายที่สวม (เช่น "2026-Q4") — null = ป้ายแบบเก่า/betatester. */
  active_banner_season_key: string | null;
}

/** แถวอันดับที่ส่งกลับไป client — ไม่มี PII (ไม่มี line_user_id/email). */
export interface RankingEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  totalPoints: number;
  /** แต้ม season นี้ (ตัวเลข exp ที่โชว์ในโผ). */
  seasonPoints: number;
  /** Banner ที่สวมอยู่ — โชว์หลังชื่อทุกหน้า. */
  activeBanner: BannerType | null;
  /** season ของป้ายที่สวม — ไว้ render "อันดับ 1 Season 2026-Q4". */
  activeBannerSeasonKey: string | null;
  isMe: boolean;
}

export interface LeaderboardResult {
  entries: RankingEntry[];
  /** อันดับของตัวเอง (row number) — null ถ้ายังไม่มีแถว healthy_journey. */
  myRank: number | null;
  myPoints: number;
  /** รูปโปรไฟล์ของตัวเอง (ไว้โชว์ในการ์ดอันดับตอนหลุดโผ). */
  myAvatarUrl: string | null;
  /** Banner ที่ตัวเองสวมอยู่ (การ์ดปักหมุดตอนหลุดโผ). */
  myBanner: BannerType | null;
  /** season ของป้ายตัวเอง — ไว้ render "อันดับ 1 Season 2026-Q4". */
  myBannerSeasonKey: string | null;
  /** จำนวนผู้ติดอันดับทั้งหมด (ไว้ให้ frontend คิดจำนวนหน้า). */
  total: number;
}

/**
 * แปลงแถวดิบเป็น entry พร้อมอันดับแบบ row number (1,2,3 — แต้มเท่าก็คนละ
 * อันดับ ตามลำดับที่ query ส่งมา) แยกเป็น pure function เพื่อให้เทสต์ได้
 * โดยไม่ต้องต่อ DB.
 */
export function buildEntries(
  rows: RankingRow[],
  offset: number,
  myUserId: string
): RankingEntry[] {
  return rows.map((row, index) => ({
    rank: offset + index + 1,
    displayName: row.display_name ?? RANKING_ANONYMOUS_NAME,
    avatarUrl: row.avatar_url,
    level: levelFromPoints(row.total_points),
    totalPoints: row.season_points,
    seasonPoints: row.season_points,
    activeBanner: row.active_banner ?? null,
    activeBannerSeasonKey: row.active_banner_season_key ?? null,
    isMe: row.user_id === myUserId,
  }));
}

/**
 * PostgREST ตอบ code PGRST204 + message มีชื่อ column เมื่อ select column
 * ที่ยังไม่มีใน DB (เช่น migration 0041 ยังไม่รัน) — เจอแบบนี้ให้ retry
 * ด้วย column เดิม ไม่ใช่ throw หน้าพัง.
 */
export function isMissingColumn(error: unknown, ...columns: string[]): boolean {
  if (error == null || typeof error !== "object") {
    return false;
  }
  const err = error as { code?: unknown; message?: unknown };
  if (err.code === "PGRST204") {
    return true;
  }
  const message = typeof err.message === "string" ? err.message : "";
  return columns.some((column) => message.includes(column));
}

/**
 * อ่านลีดเดอร์บอร์ด + อันดับของตัวเอง.
 *
 * เรียงด้วย season_points DESC (fallback เป็น total_points ถ้า migration
 * 0041 ยังไม่รัน) แล้ว tie-break ด้วย user_id ASC เพื่อให้ลำดับนิ่ง
 * (เรียกซ้ำได้ผลเดิม) ตรงกับสูตร myRank ข้างล่างที่ใช้ตัวเปรียบเทียบ
 * เดียวกัน. ดึงเฉพาะ field ที่ UI ต้องใช้ — ไม่แตะ line_user_id/email.
 */
export async function getLeaderboard(
  userId: string,
  limit: number,
  offset: number
): Promise<LeaderboardResult> {
  const supabase = createServiceClient();

  const { count: total, error: countError } = await supabase
    .from("healthy_journey")
    .select("user_id", { count: "exact", head: true });

  if (countError) {
    console.error(`Failed to count leaderboard (user=${userId})`, countError);
    throw new Error("Failed to load ranking");
  }

  // โผหลัก: ลอง season_points ก่อน (หลัง migration 0041) — ถ้า column
  // ยังไม่มีให้ตกลงมาใช้ total_points เดิม หน้าไม่พัง.
  interface JourneyRow {
    user_id: string;
    total_points: unknown;
    season_points?: unknown;
  }
  let journeys: JourneyRow[] | null = null;
  let seasonMode = true;

  {
    const attempt = await supabase
      .from("healthy_journey")
      .select("user_id, total_points, season_points")
      .order("season_points", { ascending: false })
      .order("user_id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (attempt.error) {
      if (!isMissingColumn(attempt.error, "season_points")) {
        console.error(`Failed to load leaderboard (user=${userId})`, attempt.error);
        throw new Error("Failed to load ranking");
      }
      seasonMode = false;
      const legacy = await supabase
        .from("healthy_journey")
        .select("user_id, total_points")
        .order("total_points", { ascending: false })
        .order("user_id", { ascending: true })
        .range(offset, offset + limit - 1);

      if (legacy.error) {
        console.error(`Failed to load leaderboard (user=${userId})`, legacy.error);
        throw new Error("Failed to load ranking");
      }
      journeys = (legacy.data ?? []) as JourneyRow[];
    } else {
      journeys = (attempt.data ?? []) as JourneyRow[];
    }
  }

  // ดึงชื่อ/รูป/Banner แยกอีก query (ไม่พึ่งชื่อ foreign key) แล้วจับคู่ใน memory.
  const ids = (journeys ?? []).map((j) => j.user_id);
  const usersById = new Map<
    string,
    {
      display_name: string | null;
      avatar_url: string | null;
      active_banner: BannerType | null;
      active_banner_season_id: string | null;
    }
  >();
  if (ids.length > 0) {
    interface UserRow {
      user_id: string;
      display_name: unknown;
      avatar_url: unknown;
      active_banner?: unknown;
      active_banner_season_id?: unknown;
    }
    const attempt = await supabase
      .from("users")
      .select(
        "user_id, display_name, avatar_url, active_banner, active_banner_season_id"
      )
      .in("user_id", ids);

    let users: UserRow[] | null = (attempt.data ?? []) as UserRow[];
    if (attempt.error) {
      if (
        !isMissingColumn(
          attempt.error,
          "active_banner",
          "active_banner_season_id"
        )
      ) {
        console.error(`Failed to load ranking users (user=${userId})`, attempt.error);
        throw new Error("Failed to load ranking");
      }
      // pre-migration — อ่านแค่ 3 column เดิม.
      const legacy = await supabase
        .from("users")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);

      if (legacy.error) {
        console.error(`Failed to load ranking users (user=${userId})`, legacy.error);
        throw new Error("Failed to load ranking");
      }
      users = (legacy.data ?? []) as UserRow[];
    }

    for (const u of users ?? []) {
      usersById.set(u.user_id, {
        display_name: (u.display_name as string | null) ?? null,
        avatar_url: (u.avatar_url as string | null) ?? null,
        active_banner: (u.active_banner as BannerType | null) ?? null,
        active_banner_season_id:
          (u.active_banner_season_id as string | null) ?? null,
      });
    }
  }

  // season_key ของป้ายที่แต่ละคนสวม — batch ทีเดียวจาก season_rankings.
  // pre-migration (ไม่มี column) หรือไม่มีใครสวมป้าย season → map ว่าง.
  const seasonKeyByRankingId = new Map<string, string>();
  {
    const rankingIds = [...usersById.values()]
      .map((u) => u.active_banner_season_id)
      .filter((id): id is string => id != null);
    if (rankingIds.length > 0) {
      const { data: seasonRows, error: seasonError } = await supabase
        .from("season_rankings")
        .select("id, seasons!inner(season_key)")
        .in("id", rankingIds);

      if (seasonError) {
        console.error(`Failed to load banner seasons (user=${userId})`, seasonError);
        throw new Error("Failed to load ranking");
      }
      for (const row of (seasonRows ?? []) as Array<{
        id: string;
        seasons: { season_key: string } | Array<{ season_key: string }> | null;
      }>) {
        const season = Array.isArray(row.seasons) ? row.seasons[0] : row.seasons;
        if (season?.season_key) {
          seasonKeyByRankingId.set(row.id, season.season_key);
        }
      }
    }
  }

  const rows: RankingRow[] = (journeys ?? []).map((j) => {
    const total = Number(j.total_points ?? 0);
    const equipped = usersById.get(j.user_id);
    const rankingId = equipped?.active_banner_season_id ?? null;
    return {
      user_id: j.user_id,
      total_points: total,
      // legacy (ก่อน migration): โผโชว์แต้มรวมเดิมไปก่อน.
      season_points: seasonMode ? Number(j.season_points ?? total) : total,
      display_name: equipped?.display_name ?? null,
      avatar_url: equipped?.avatar_url ?? null,
      active_banner: equipped?.active_banner ?? null,
      active_banner_season_key:
        (rankingId != null ? seasonKeyByRankingId.get(rankingId) : undefined) ??
        null,
    };
  });

  // อันดับตัวเองแบบ row number: 1 + คนแต้มมากกว่า + คนแต้มเท่าแต่ id มาก่อน.
  // ใช้ column เดียวกับโผหลัก (season หรือ legacy total) — แยก query ตาม
  // mode เพราะ select string แบบ ternary ทำให้ type inference พัง.
  interface MineRow {
    total_points: unknown;
    season_points?: unknown;
  }
  let mine: MineRow | null = null;
  if (seasonMode) {
    const res = await supabase
      .from("healthy_journey")
      .select("total_points, season_points")
      .eq("user_id", userId)
      .maybeSingle();
    mine = (res.data ?? null) as MineRow | null;
  } else {
    const res = await supabase
      .from("healthy_journey")
      .select("total_points")
      .eq("user_id", userId)
      .maybeSingle();
    mine = (res.data ?? null) as MineRow | null;
  }
  const scoreColumn = seasonMode ? "season_points" : "total_points";

  let myRank: number | null = null;
  let myPoints = 0;

  if (mine) {
    // โผโชว์แต้ม season — myPoints จึงเป็น season_points (legacy fallback รวม).
    const mineSeason = Number(mine.season_points ?? mine.total_points ?? 0);
    myPoints = mineSeason;
    const { count: higher } = await supabase
      .from("healthy_journey")
      .select("user_id", { count: "exact", head: true })
      .gt(scoreColumn, myPoints);
    const { count: tiedEarlier } = await supabase
      .from("healthy_journey")
      .select("user_id", { count: "exact", head: true })
      .eq(scoreColumn, myPoints)
      .lt("user_id", userId);
    myRank = 1 + (higher ?? 0) + (tiedEarlier ?? 0);
  }

  // รูป+Banner ตัวเอง: ถ้าติดโผมีใน map แล้ว ถ้าหลุดโผดึงแถวตัวเองเพิ่ม 1 ครั้ง.
  // พังก็ไม่เป็นไร (การ์ดโชว์อักษรย่อแทน) เลยไม่ throw.
  let myAvatarUrl: string | null =
    usersById.get(userId)?.avatar_url ?? null;
  let myBanner: BannerType | null = usersById.get(userId)?.active_banner ?? null;
  let myBannerSeasonKey: string | null = null;
  {
    const equippedId = usersById.get(userId)?.active_banner_season_id ?? null;
    if (equippedId != null) {
      myBannerSeasonKey = seasonKeyByRankingId.get(equippedId) ?? null;
    }
  }
  if (myAvatarUrl == null || usersById.get(userId) === undefined) {
    const attempt = await supabase
      .from("users")
      .select("avatar_url, active_banner, active_banner_season_id")
      .eq("user_id", userId)
      .maybeSingle();

    // pre-migration ไม่มี column ใหม่ → อ่านแค่ avatar (พังก็ไม่เป็นไร
    // การ์ดโชว์อักษรย่อแทน เลยไม่ throw เหมือน query หลัก).
    interface MeRow {
      avatar_url: unknown;
      active_banner?: unknown;
      active_banner_season_id?: unknown;
    }
    let me: MeRow | null = (attempt.data ?? null) as MeRow | null;
    if (attempt.error) {
      if (
        isMissingColumn(
          attempt.error,
          "active_banner",
          "active_banner_season_id"
        )
      ) {
        me = (
          (
            await supabase
              .from("users")
              .select("avatar_url")
              .eq("user_id", userId)
              .maybeSingle()
          ).data ?? null
        ) as MeRow | null;
      } else {
        console.error(`Failed to load own profile (user=${userId})`, attempt.error);
      }
    }
    myAvatarUrl =
      myAvatarUrl ?? ((me?.avatar_url as string | null) ?? null);
    myBanner =
      myBanner ??
      ((me?.active_banner as BannerType | null) ?? null);
    const meRankingId = (me?.active_banner_season_id as string | null) ?? null;
    if (myBannerSeasonKey == null && meRankingId != null) {
      myBannerSeasonKey = seasonKeyByRankingId.get(meRankingId) ?? null;
    }
  }

  return {
    entries: buildEntries(rows, offset, userId),
    myRank,
    myPoints,
    myAvatarUrl,
    myBanner,
    myBannerSeasonKey,
    total: total ?? 0,
  };
}
