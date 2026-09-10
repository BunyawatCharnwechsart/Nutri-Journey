/**
 * Pure rules for the Healthy Journey feature ("ไข่ของฉัน").
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested without touching the database. The database writes live in
 * lib/healthy-journey-service.ts.
 *
 * Leveling (from the SDS, confirmed with the product owner):
 *   - 9 levels total: level 0 → level 9 (inclusive), matching the avatar
 *     images `public/avatar/level0.svg … level9.svg`.
 *   - Reaching the next level L requires 150 × L more XP than the previous
 *     one: cumulative threshold for level L = 150 × (1 + 2 + … + L).
 *       cum(0) = 0   (nothing to spend to spawn)
 *       cum(1) = 150
 *       cum(2) = 450
 *       …
 *       cum(9) = 6750  (level cap)
 *   - XP is cumulative (`total_points`), never spent down.
 */

/** Highest level a user can reach (matches public/avatar/level0..9.svg). */
export const HEALTHY_JOURNEY_LEVEL_CAP = 9;

/** XP granted per completed daily mission (SDS 4.5: +50 exp each). */
export const DAILY_MISSION_POINTS = 50;

/** XP delta per level-up step: L→L+1 costs 150 × (L+1), starting at 150. */
const POINTS_PER_LEVEL = 150;

/** Fallback egg name used until the owner renames it in the modal. */
export const DEFAULT_AVATAR_NAME = "ไข่";

/** Stable programmatic keys — never key missions by their Thai title. */
export const MISSION_CODES = [
  "start_if",
  "fasting_complete",
  "record_mood",
  "view_stats",
] as const;

export type MissionCode = (typeof MISSION_CODES)[number];

/**
 * Cumulative XP required to reach `level` (inclusive of all previous levels).
 * cum(0) = 0, cum(1) = 150, cum(2) = 450, …, cum(9) = 6750.
 */
export function cumulativeThreshold(level: number): number {
  return (POINTS_PER_LEVEL * level * (level + 1)) / 2;
}

/**
 * Highest level whose cumulative threshold the XP already covers, capped at
 * HEALTHY_JOURNEY_LEVEL_CAP. Rejects bogus input (NaN / negative) as level 0.
 */
export function levelFromPoints(points: number): number {
  if (!Number.isFinite(points) || points < 0) {
    return 0;
  }
  let level = 0;
  for (let l = 1; l <= HEALTHY_JOURNEY_LEVEL_CAP; l++) {
    if (points >= cumulativeThreshold(l)) {
      level = l;
    } else {
      break;
    }
  }
  return level;
}

/** XP earned inside the current level (points already "spent" on level-ups
 * subtracted). e.g. 320 total → level 1, expInLevel = 320 - 150 = 170. */
export function expInLevel(points: number): number {
  const level = levelFromPoints(points);
  return Math.max(0, Math.floor(points) - cumulativeThreshold(level));
}

/**
 * XP still needed to finish the current level (i.e. to reach the next one).
 * Returns null at the level cap — there is no bar to fill beyond level 9.
 */
export function expForNextLevel(level: number): number | null {
  if (level >= HEALTHY_JOURNEY_LEVEL_CAP) {
    return null;
  }
  return cumulativeThreshold(level + 1) - cumulativeThreshold(level);
}

/** 0..1 fill ratio for the level progress bar (1 when maxed out). */
export function progressRatio(points: number): number {
  const level = levelFromPoints(points);
  const need = expForNextLevel(level);
  if (need === null) {
    return 1;
  }
  return Math.min(1, expInLevel(points) / need);
}

/** Avatar asset for a level, clamped to the 10 available SVGs (0–9). */
export function avatarForLevel(level: number): string {
  const numeric = Math.floor(level);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const clamped = Math.max(0, Math.min(HEALTHY_JOURNEY_LEVEL_CAP, safe));
  return `/avatar/level${clamped}.svg`;
}