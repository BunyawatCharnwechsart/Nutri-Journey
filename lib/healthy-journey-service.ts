import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import {
  DAILY_MISSION_POINTS,
  DEFAULT_AVATAR_NAME,
  MISSION_CODES,
  levelFromPoints,
  type MissionCode,
} from "@/lib/healthy-journey";
import { getQuestDayBounds } from "@/lib/timezone";

export interface AwardResult {
  awarded: boolean;
  /** Why the award was (or was not) granted. */
  reason: "awarded" | "already_done" | "unknown_mission";
  /** Post-award numbers (present when `awarded`). */
  totalPoints?: number;
  level?: number;
}

/**
 * Credit XP for completing a daily mission — once per quest cycle (09:00 ICT).
 *
 * The user can never decide which mission to earn: the caller picks the code
 * from a real product behaviour (starting IF, ending IF, visiting /stats).
 * Every query is scoped to `userId` from requireAuth(); the service role
 * bypasses RLS so that scoping is on us, not the database.
 *
 * `user_missions` enforces UNIQUE (user_id, mission_id) — one row per mission
 * per user forever, storing the LATEST completion. So an award UPSERTs that
 * row (bumping `completed_at` to now) if the last completion was in an earlier
 * quest cycle, and skips when the mission was already completed in the CURRENT
 * cycle (refreshing the page never farms extra XP).
 *
 * streak columns are intentionally not touched (streak system out of scope).
 */
export async function awardMission(
  userId: string,
  code: MissionCode
): Promise<AwardResult> {
  if (!MISSION_CODES.includes(code)) {
    return { awarded: false, reason: "unknown_mission" };
  }

  const supabase = createServiceClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("id, points, is_daily")
    .eq("code", code)
    .maybeSingle();

  if (!mission) {
    return { awarded: false, reason: "unknown_mission" };
  }

  const points = mission.is_daily
    ? DAILY_MISSION_POINTS
    : Math.max(0, Number(mission.points) || 0);

  // "ตอนนี้" เทียบรอบเควสประจำวัน (09:00 ICT → 09:00 ICT วันถัดไป), เป็น UTC
  // timestamps สำหรับเปรียบเทียบ completed_at.
  const { startIso: dayStartIso, endIso: dayEndIso } = getQuestDayBounds(
    new Date()
  );

  const { data: existing } = await supabase
    .from("user_missions")
    .select("completed_at, is_completed")
    .eq("user_id", userId)
    .eq("mission_id", mission.id)
    .maybeSingle();

  const alreadyToday =
    existing?.is_completed &&
    existing.completed_at != null &&
    existing.completed_at >= dayStartIso &&
    existing.completed_at < dayEndIso;

  if (alreadyToday) {
    return { awarded: false, reason: "already_done" };
  }

  // Mark the latest completion. Upsert on the (user_id, mission_id) unique
  // key: fresh row on first-ever award, timestamp refresh on later days —
  // never a duplicate, never a unique-violation crash.
  const completedAt = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from("user_missions")
    .upsert(
      {
        user_id: userId,
        mission_id: mission.id,
        is_completed: true,
        completed_at: completedAt,
      },
      { onConflict: "user_id,mission_id" }
    );

  if (upsertError) {
    console.error(
      `Failed to upsert user_mission (user=${userId}, mission=${code})`,
      upsertError
    );
    return { awarded: false, reason: "already_done" };
  }

  // อ่านแถว journey — ลองรวม season_points (migration 0041) ก่อน ถ้า
  // column ยังไม่มีให้อ่านแบบ legacy แล้ว dual-write ข้างล่างจะเขียนแค่
  // total_points (แต้ม lifetime ไม่หาย).
  let seasonSupported = true;
  let journey: {
    id: unknown;
    total_points: unknown;
    season_points?: unknown;
  } | null = null;

  {
    const attempt = await supabase
      .from("healthy_journey")
      .select("id, total_points, season_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (attempt.error) {
      const code = (attempt.error as { code?: string }).code;
      const msg =
        typeof (attempt.error as { message?: unknown }).message === "string"
          ? ((attempt.error as { message?: string }).message ?? "")
          : "";
      if (code === "PGRST204" || msg.includes("season_points")) {
        seasonSupported = false;
        const legacy = await supabase
          .from("healthy_journey")
          .select("id, total_points")
          .eq("user_id", userId)
          .maybeSingle();
        journey = legacy.data;
      } else {
        console.error(
          `Failed to read healthy_journey (user=${userId}, code=${code})`,
          attempt.error
        );
        return { awarded: false, reason: "already_done" };
      }
    } else {
      journey = attempt.data;
    }
  }

  if (!journey) {
    // Brand-new journey row (eggs don't exist yet until the first award).
    // season_points เริ่มเท่ากับแต้มแรก — อันดับ season เริ่มนับตรงนี้.
    const baseRow = {
      user_id: userId,
      total_points: points,
      level: levelFromPoints(points),
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      avatar_name: DEFAULT_AVATAR_NAME,
    };
    const insertRow = seasonSupported
      ? { ...baseRow, season_points: points }
      : baseRow;
    const { data: created, error: createError } = await supabase
      .from("healthy_journey")
      .insert(insertRow)
      .select("total_points, level")
      .single();

    if (createError || !created) {
      console.error(
        `Failed to create healthy_journey row (user=${userId}, code=${code})`,
        createError
      );
      return { awarded: false, reason: "already_done" };
    }
    return {
      awarded: true,
      reason: "awarded",
      totalPoints: Number(created.total_points),
      level: Number(created.level),
    };
  }

  // Dual-write: lifetime (total_points, ไม่รีเซ็ต — level/ไข่คงเดิม) +
  // season นี้ (season_points, รีเซ็ตทุก quarter — อันดับ season).
  // pre-migration (seasonSupported=false) เขียนแค่ total_points.
  const totalPoints = Number(journey.total_points) + points;
  const seasonPoints =
    Number(
      (journey as { season_points?: unknown }).season_points ?? 0
    ) + points;

  const updateRow = seasonSupported
    ? {
        total_points: totalPoints,
        season_points: seasonPoints,
        level: levelFromPoints(totalPoints),
      }
    : {
        total_points: totalPoints,
        level: levelFromPoints(totalPoints),
      };
  const { data: updated, error: updateError } = await supabase
    .from("healthy_journey")
    .update(updateRow)
    .eq("user_id", userId)
    .select("total_points, level")
    .single();

  if (updateError || !updated) {
    console.error(
      `Failed to update healthy_journey points (user=${userId}, code=${code})`,
      updateError
    );
    return { awarded: false, reason: "already_done" };
  }

  // แบ่งแต้มให้ไข่ตัว active ด้วย — คง invariant "user EXP = ผลรวม EXP ไข่":
  // total_points กับ egg_exp ถูกบวกพร้อมกันเสมอ. ถ้ายังไม่มีตัว active
  // (ยังไม่เคยสุ่มได้ไข่) แต้มอยู่แค่ total_points แบบเดิม. ขั้นนี้ล้มเหลว
  // ไม่ถือว่า award ล้ม (total ถูกบวกไปแล้ว) แค่ log ไว้ไล่ทีหลัง.
  // หมายเหตุ: read-modify-write ไม่ atomic — award พร้อมกัน 2 มิชชันอาจ
  // ทับกันได้ (เสียสูงสุด 50 แต้ม/ครั้ง, เกิดยากเพราะกันฟาร์มรายวันอยู่แล้ว).
  const { data: activeEgg } = await supabase
    .from("egg_draws")
    .select("id, egg_exp")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (activeEgg) {
    const { error: eggError } = await supabase
      .from("egg_draws")
      .update({ egg_exp: Number(activeEgg.egg_exp) + points })
      .eq("id", activeEgg.id);
    if (eggError) {
      console.error(
        `Failed to credit active egg (user=${userId}, code=${code})`,
        eggError
      );
    }
  }

  return {
    awarded: true,
    reason: "awarded",
    totalPoints: Number(updated.total_points),
    level: Number(updated.level),
  };
}
