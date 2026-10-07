import "server-only";

import { toICTDateKey } from "@/lib/timezone";
import { createServiceClient } from "@/lib/supabase/service";
import { currentProgress } from "@/lib/egg-draw";

export interface CollectedEgg {
  id: string;
  eggType: string;
  eggName: string;
  /** ชื่อที่ตั้งให้ฟองนี้ (null = ยังไม่เคยตั้ง). */
  nickname: string | null;
  /** ชื่อที่ UI ควรโชว์: nickname → (active ? ชื่อรวม avatar_name : null) → ชื่อชนิด. */
  displayName: string;
  eggExp: number;
  isActive: boolean;
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
 * ชื่อที่ UI ควรโชว์ต่อฟอง: nickname ของมันเองก่อน ถ้าไม่มีและเป็นตัว active
 * ใช้ชื่อรวม (avatar_name) ถ้าไม่มีอีกใช้ชื่อชนิดไข่ — pure แยกไว้เทสต์ได้.
 */
export function resolveDisplayName(
  nickname: string | null,
  isActive: boolean,
  legacyName: string | null,
  typeName: string
): string {
  return nickname ?? (isActive ? legacyName : null) ?? typeName;
}

/**
 * สถานะสุ่มไข่ของ user: progress ปัจจุบัน + สิทธิ์ค้าง + ตู้สะสม.
 * นับวัน success ใหม่ทุกครั้ง (ไม่มี streak cache ให้เน่า).
 */
export async function getDrawStatus(userId: string): Promise<DrawStatus> {
  const supabase = createServiceClient();
  const todayKey = toICTDateKey(new Date());

  const [keys, lastCycleEnd, pending, claimed, journey] = await Promise.all([
    loadSuccessKeys(supabase, userId),
    loadLastCycleEnd(supabase, userId),
    countPending(supabase, userId),
    supabase
    .from("egg_draws")
    .select("id, egg_type, egg_exp, is_active, claimed_at, nickname")
      .eq("user_id", userId)
      .not("claimed_at", "is", null)
      .order("claimed_at", { ascending: false }),
    supabase
      .from("healthy_journey")
      .select("avatar_name")
      .eq("user_id", userId)
      .maybeSingle(),
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
  const legacyName = (journey.data?.avatar_name as string | null) ?? null;

  return {
    streakDays: progress.streakDays,
    progress: progress.progress,
    pendingDraws: pending,
    canClaim: pending > 0,
    collection: (claimed.data ?? []).map((row) => {
      const isActive = (row.is_active as boolean) ?? false;
      const nickname = (row.nickname as string | null) ?? null;
      const typeName =
        names.get(row.egg_type as string) ?? (row.egg_type as string);
      return {
        id: row.id as string,
        eggType: row.egg_type as string,
        eggName: typeName,
        nickname,
        displayName: resolveDisplayName(nickname, isActive, legacyName, typeName),
        eggExp: Number(row.egg_exp ?? 0),
        isActive,
        claimedAt: row.claimed_at as string,
      };
    }),
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

  // ฟองแรกที่เคยได้ = ตัวเลี้ยงอัตโนมัติ (ถ้ายังไม่มีตัว active).
  // unique index กัน 2 คนชนกัน — ชนแล้วข้าม (แต้มได้แล้ว แค่ active ไม่เปลี่ยน).
  const { data: existingActive } = await supabase
    .from("egg_draws")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!existingActive) {
    const { error: activeError } = await supabase
      .from("egg_draws")
      .update({ is_active: true })
      .eq("id", claimedRow.id as string);
    if (activeError && activeError.code !== "23505") {
      console.error(`Failed to auto-activate egg (user=${userId})`, activeError);
    }
  }

  return { ok: true, reason: "claimed", eggType: picked.code, eggName: picked.name };
}

export type SetActiveReason = "moved" | "not_found" | "conflict";

export interface SetActiveResult {
  ok: boolean;
  reason: SetActiveReason;
}

/**
 * ย้ายตัวเลี้ยง (ตัวรับ EXP จากภารกิจ) — ได้เฉพาะไข่ของตัวเองที่ claim แล้ว.
 * ล้างตัวเก่าก่อนแล้วเปิดตัวใหม่; unique index กันกดพร้อมกัน 2 เครื่อง
 * (ชนแล้วตอบ conflict ให้กดใหม่).
 */
export async function setActiveEgg(
  userId: string,
  drawId: string
): Promise<SetActiveResult> {
  const supabase = createServiceClient();

  const { data: own } = await supabase
    .from("egg_draws")
    .select("id")
    .eq("id", drawId)
    .eq("user_id", userId)
    .not("claimed_at", "is", null)
    .maybeSingle();

  if (!own) {
    return { ok: false, reason: "not_found" };
  }

  await supabase
    .from("egg_draws")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data: moved, error: moveError } = await supabase
    .from("egg_draws")
    .update({ is_active: true })
    .eq("id", drawId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (moveError || !moved) {
    console.error(`Failed to move active egg (user=${userId})`, moveError);
    return { ok: false, reason: moveError?.code === "23505" ? "conflict" : "not_found" };
  }

  return { ok: true, reason: "moved" };
}

/**
 * เปลี่ยนชื่อไข่ — มีผลเฉพาะฟองที่เลี้ยงอยู่ (แถว active) ฟองอื่นชื่อเดิม
 * ไม่เปลี่ยน. ถ้ายังไม่มีไข่เลย (user ใหม่) fallback เขียน avatar_name
 * แบบเดิมเพื่อให้หน้า egg มีชื่อโชว์.
 */
export async function renameEggDraw(
  userId: string,
  name: string
): Promise<string> {
  const supabase = createServiceClient();

  const { data: renamed } = await supabase
    .from("egg_draws")
    .update({ nickname: name })
    .eq("user_id", userId)
    .eq("is_active", true)
    .select("nickname")
    .maybeSingle();

  if (renamed) {
    return renamed.nickname as string;
  }

  // ไม่มีตัว active → legacy path (avatar_name รวมของ user).
  const { data: legacy } = await supabase
    .from("healthy_journey")
    .update({ avatar_name: name })
    .eq("user_id", userId)
    .select("avatar_name")
    .maybeSingle();

  if (legacy) {
    return legacy.avatar_name as string;
  }

  // ไม่มีแถว journey เลย → สร้างแถว level-0 พร้อมชื่อ (พฤติกรรมเดิม).
  const { data: created, error: createError } = await supabase
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

  if (createError || !created) {
    throw new Error("Failed to rename egg");
  }
  return created.avatar_name as string;
}
