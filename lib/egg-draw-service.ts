import "server-only";

import { toICTDateKey } from "@/lib/timezone";
import { createServiceClient } from "@/lib/supabase/service";
import { currentProgress } from "@/lib/egg-draw";

export interface CollectedEgg {
  eggType: string;
  eggName: string;
  claimedAt: string;
}

export interface DrawStatus {
  streakDays: number;
  progress: number;
  /** จำนวนสิทธิ์สุ่มที่ค้าง (ยังไม่กด). */
  pendingDraws: number;
  canClaim: boolean;
  /** ประวัติไข่ที่สุ่มได้แล้ว (ตู้สะสม). */
  collection: CollectedEgg[];
}

export type ClaimReason = "claimed" | "not_eligible" | "already_claimed";

export interface ClaimResult {
  ok: boolean;
  reason: ClaimReason;
  eggType?: string;
  eggName?: string;
}

/** ดึงย้อนหลังแค่ 120 วันก็พอตัดสิน streak (กันตารางโตแล้วช้า). */
const SUCCESS_LOOKBACK_DAYS = 120;

interface EggTypeRow {
  code: string;
  name: string;
  rarity_weight: number;
}

/** สุ่มชนิดไข่ถ่วงน้ำหนักตาม rarity_weight (ของเล่น — ไม่ใช่สายเปย์). */
export function pickEggType(
  types: EggTypeRow[],
  random: () => number = Math.random
): EggTypeRow | null {
  const total = types.reduce((sum, t) => sum + Math.max(0, t.rarity_weight), 0);
  if (types.length === 0 || total <= 0) {
    return null;
  }
  let roll = random() * total;
  for (const t of types) {
    roll -= Math.max(0, t.rarity_weight);
    if (roll < 0) {
      return t;
    }
  }
  return types[types.length - 1] ?? null;
}

async function loadSuccessKeys(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<string[]> {
  const since = new Date(Date.now() - SUCCESS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("if_sessions")
    .select("fasting_start_time")
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("result", "success")
    .gte("fasting_start_time", since.toISOString());

  if (error) {
    console.error(`Failed to load success days (user=${userId})`, error);
    throw new Error("Failed to load egg draw status");
  }

  return (data ?? [])
    .filter((row) => row.fasting_start_time != null)
    .map((row) => toICTDateKey(new Date(row.fasting_start_time as string)));
}

async function loadLastCycleEnd(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("egg_draws")
    .select("cycle_end")
    .eq("user_id", userId)
    .order("cycle_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load last draw cycle (user=${userId})`, error);
    throw new Error("Failed to load egg draw status");
  }
  return (data?.cycle_end as string | null) ?? null;
}

async function countPending(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("egg_draws")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("claimed_at", null);

  if (error) {
    console.error(`Failed to count pending draws (user=${userId})`, error);
    throw new Error("Failed to load egg draw status");
  }
  return count ?? 0;
}

/**
 * สถานะสุ่มไข่ของ user: progress ปัจจุบัน + สิทธิ์ค้าง + ตู้สะสม.
 * นับวัน success ใหม่ทุกครั้ง (ไม่มี streak cache ให้เน่า).
 */
export async function getDrawStatus(userId: string): Promise<DrawStatus> {
  const supabase = createServiceClient();
  const todayKey = toICTDateKey(new Date());

  const [keys, lastCycleEnd, pending, claimed] = await Promise.all([
    loadSuccessKeys(supabase, userId),
    loadLastCycleEnd(supabase, userId),
    countPending(supabase, userId),
    supabase
      .from("egg_draws")
      .select("egg_type, claimed_at")
      .eq("user_id", userId)
      .not("claimed_at", "is", null)
      .order("claimed_at", { ascending: false }),
  ]);

  if (claimed.error) {
    console.error(`Failed to load egg collection (user=${userId})`, claimed.error);
    throw new Error("Failed to load egg draw status");
  }

  const { data: types } = await supabase
    .from("egg_types")
    .select("code, name");
  const names = new Map(
    (types ?? []).map((t) => [t.code as string, t.name as string])
  );

  const progress = currentProgress(keys, lastCycleEnd, todayKey);

  return {
    streakDays: progress.streakDays,
    progress: progress.progress,
    pendingDraws: pending,
    canClaim: pending > 0,
    collection: (claimed.data ?? []).map((row) => ({
      eggType: row.egg_type as string,
      eggName: names.get(row.egg_type as string) ?? (row.egg_type as string),
      claimedAt: row.claimed_at as string,
    })),
  };
}

/**
 * กดสุ่มไข่ 1 ครั้ง: คำนวณสิทธิ์ใหม่ฝั่ง server เสมอ (ไม่เชื่อ client),
 * แจกหน้าต่างที่ครบ (กันซ้ำด้วย unique) แล้ว claim แถวเก่าสุดที่ค้างอยู่.
 * กดพร้อมกัน 2 ครั้ง: ครั้งที่สองเจอแถวไม่เหลือ → already_claimed.
 */
export async function claimDraw(userId: string): Promise<ClaimResult> {
  const supabase = createServiceClient();
  const todayKey = toICTDateKey(new Date());

  const [keys, lastCycleEnd] = await Promise.all([
    loadSuccessKeys(supabase, userId),
    loadLastCycleEnd(supabase, userId),
  ]);

  const progress = currentProgress(keys, lastCycleEnd, todayKey);
  if (!progress.eligible || !progress.cycleStart || !progress.cycleEnd) {
    return { ok: false, reason: "not_eligible" };
  }

  // แจกหน้าต่างที่ครบ — ถ้ามีแถวนี้แล้ว (กดซ้ำ/แข่งกัน) unique จะกันให้.
  const { error: grantError } = await supabase.from("egg_draws").insert({
    user_id: userId,
    cycle_start: progress.cycleStart,
    cycle_end: progress.cycleEnd,
  });

  if (grantError && grantError.code !== "23505") {
    console.error(`Failed to grant egg draw (user=${userId})`, grantError);
    throw new Error("Failed to claim egg draw");
  }

  const { data: types, error: typesError } = await supabase
    .from("egg_types")
    .select("code, name, rarity_weight");

  if (typesError || !types || types.length === 0) {
    console.error(`No egg types configured (user=${userId})`, typesError);
    throw new Error("Failed to claim egg draw");
  }

  const picked = pickEggType(
    types.map((t) => ({
      code: t.code as string,
      name: t.name as string,
      rarity_weight: Number(t.rarity_weight) || 0,
    }))
  );

  if (!picked) {
    throw new Error("Failed to claim egg draw");
  }

  // Claim แถวค้างที่เก่าสุด — where claimed_at is null กันกดพร้อมกัน:
  // ใคร update ได้แถวก่อนชนะ อีกคนได้ 0 แถว.
  const { data: claimedRow, error: claimError } = await supabase
    .from("egg_draws")
    .update({ claimed_at: new Date().toISOString(), egg_type: picked.code })
    .eq("user_id", userId)
    .is("claimed_at", null)
    .order("granted_at", { ascending: true })
    .limit(1)
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error(`Failed to claim egg draw (user=${userId})`, claimError);
    throw new Error("Failed to claim egg draw");
  }

  if (!claimedRow) {
    return { ok: false, reason: "already_claimed" };
  }

  return { ok: true, reason: "claimed", eggType: picked.code, eggName: picked.name };
}
