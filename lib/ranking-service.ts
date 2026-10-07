import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { levelFromPoints } from "@/lib/healthy-journey";

/** ชื่อสำรองถ้า user ไม่มี display_name (ไม่ควรเกิด แต่กัน null หลุดไป UI). */
export const RANKING_ANONYMOUS_NAME = "นักเดินทางไร้ชื่อ";

/** แถวดิบจาก DB ก่อนแปลงเป็น entry พร้อมอันดับ. */
export interface RankingRow {
  user_id: string;
  total_points: number;
  display_name: string | null;
  avatar_url: string | null;
}

/** แถวอันดับที่ส่งกลับไป client — ไม่มี PII (ไม่มี line_user_id/email). */
export interface RankingEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  totalPoints: number;
  isMe: boolean;
}

export interface LeaderboardResult {
  entries: RankingEntry[];
  /** อันดับของตัวเอง (row number) — null ถ้ายังไม่มีแถว healthy_journey. */
  myRank: number | null;
  myPoints: number;
  /** รูปโปรไฟล์ของตัวเอง (ไว้โชว์ในการ์ดอันดับตอนหลุดโผ). */
  myAvatarUrl: string | null;
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
    totalPoints: row.total_points,
    isMe: row.user_id === myUserId,
  }));
}

/**
 * อ่านลีดเดอร์บอร์ด + อันดับของตัวเอง.
 *
 * เรียงด้วย total_points DESC แล้ว tie-break ด้วย user_id ASC เพื่อให้ลำดับ
 * นิ่ง (เรียกซ้ำได้ผลเดิม) ตรงกับสูตร myRank ข้างล่างที่ใช้ตัวเปรียบเทียบ
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

  const { data: journeys, error: journeyError } = await supabase
    .from("healthy_journey")
    .select("user_id, total_points")
    .order("total_points", { ascending: false })
    .order("user_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (journeyError) {
    console.error(`Failed to load leaderboard (user=${userId})`, journeyError);
    throw new Error("Failed to load ranking");
  }

  // ดึงชื่อ/รูปแยกอีก query (ไม่พึ่งชื่อ foreign key) แล้วจับคู่ใน memory.
  const ids = (journeys ?? []).map((j) => j.user_id);
  const usersById = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (ids.length > 0) {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("user_id, display_name, avatar_url")
      .in("user_id", ids);

    if (userError) {
      console.error(`Failed to load ranking users (user=${userId})`, userError);
      throw new Error("Failed to load ranking");
    }

    for (const u of users ?? []) {
      usersById.set(u.user_id, u);
    }
  }

  const rows: RankingRow[] = (journeys ?? []).map((j) => ({
    user_id: j.user_id,
    total_points: j.total_points,
    display_name: usersById.get(j.user_id)?.display_name ?? null,
    avatar_url: usersById.get(j.user_id)?.avatar_url ?? null,
  }));

  // อันดับตัวเองแบบ row number: 1 + คนแต้มมากกว่า + คนแต้มเท่าแต่ id มาก่อน.
  const { data: mine } = await supabase
    .from("healthy_journey")
    .select("total_points")
    .eq("user_id", userId)
    .maybeSingle();

  let myRank: number | null = null;
  let myPoints = 0;

  if (mine) {
    myPoints = mine.total_points;
    const { count: higher } = await supabase
      .from("healthy_journey")
      .select("user_id", { count: "exact", head: true })
      .gt("total_points", myPoints);
    const { count: tiedEarlier } = await supabase
      .from("healthy_journey")
      .select("user_id", { count: "exact", head: true })
      .eq("total_points", myPoints)
      .lt("user_id", userId);
    myRank = 1 + (higher ?? 0) + (tiedEarlier ?? 0);
  }

  // รูปตัวเอง: ถ้าติดโผมีใน map แล้ว ถ้าหลุดโผดึงแถวตัวเองเพิ่ม 1 ครั้ง.
  // พังก็ไม่เป็นไร (การ์ดโชว์อักษรย่อแทน) เลยไม่ throw.
  let myAvatarUrl: string | null =
    usersById.get(userId)?.avatar_url ?? null;
  if (myAvatarUrl == null) {
    const { data: me } = await supabase
      .from("users")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    myAvatarUrl = (me?.avatar_url as string | null) ?? null;
  }

  return {
    entries: buildEntries(rows, offset, userId),
    myRank,
    myPoints,
    myAvatarUrl,
    total: total ?? 0,
  };
}
