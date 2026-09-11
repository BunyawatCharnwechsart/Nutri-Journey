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
    return { awarded: false, reason: "already_done" };
  }

  const { data: journey } = await supabase
    .from("healthy_journey")
    .select("id, total_points")
    .eq("user_id", userId)
    .maybeSingle();

  if (!journey) {
    // Brand-new journey row (eggs don't exist yet until the first award).
    const { data: created, error: createError } = await supabase
      .from("healthy_journey")
      .insert({
        user_id: userId,
        total_points: points,
        level: levelFromPoints(points),
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null,
        avatar_name: DEFAULT_AVATAR_NAME,
      })
      .select("total_points, level")
      .single();

    if (createError || !created) {
      return { awarded: false, reason: "already_done" };
    }
    return {
      awarded: true,
      reason: "awarded",
      totalPoints: Number(created.total_points),
      level: Number(created.level),
    };
  }

  const totalPoints = Number(journey.total_points) + points;

  const { data: updated, error: updateError } = await supabase
    .from("healthy_journey")
    .update({
      total_points: totalPoints,
      level: levelFromPoints(totalPoints),
    })
    .eq("user_id", userId)
    .select("total_points, level")
    .single();

  if (updateError || !updated) {
    return { awarded: false, reason: "already_done" };
  }

  return {
    awarded: true,
    reason: "awarded",
    totalPoints: Number(updated.total_points),
    level: Number(updated.level),
  };
}

/**
 * Rename the egg. Only updates avatar_name so the user's XP/level are never
 * clobbered — upsert-on-conflict would overwrite the whole row. If no journey
 * row exists yet (user never earned a point) a fresh level-0 row is created.
 */
export async function renameAvatar(
  userId: string,
  name: string
): Promise<string> {
  const supabase = createServiceClient();

  const { data: updated } = await supabase
    .from("healthy_journey")
    .update({ avatar_name: name })
    .eq("user_id", userId)
    .select("avatar_name")
    .maybeSingle();

  if (updated) {
    return updated.avatar_name;
  }

  // No row yet → create a level-0 egg already carrying the chosen name.
  const { data, error } = await supabase
    .from("healthy_journey")
    .insert({
      user_id: userId,
      total_points: 0,
      level: 0,
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      avatar_name: name,
    })
    .select("avatar_name")
    .single();

  if (error || !data) {
    throw new Error("Failed to rename avatar");
  }

  return data.avatar_name;
}