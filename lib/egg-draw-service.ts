import "server-only";

import { toICTDateKey } from "@/lib/timezone";
import { createServiceClient } from "@/lib/supabase/service";
import { currentProgress } from "@/lib/egg-draw";
import { levelFromPoints } from "@/lib/healthy-journey";

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

export interface DropRate {
  code: string;
  name: string;
  /** โอกาสออกเป็น % (ทศนิยม 1 ตำแหน่ง). */
  percent: number;
}

/**
 * แปลง catalog เป็นเรท % จาก rarity_weight — pure แยกไว้เทสต์ได้.
 * ชนิดที่ weight 0 (ปลดระวาง) ไม่นับไม่โชว์; catalog ว่างคืน []
 * (UI ซ่อนปุ่มเรทเอง).
 */
export function toDropRates(
  types: { code: string; name: string; rarity_weight: number }[]
): DropRate[] {
  const live = types.filter((t) => t.rarity_weight > 0);
  const total = live.reduce((sum, t) => sum + t.rarity_weight, 0);
  if (live.length === 0 || total <= 0) {
    return [];
  }
  return live.map((t) => ({
    code: t.code,
    name: t.name,
    percent: Math.round((t.rarity_weight / total) * 1000) / 10,
  }));
}

export interface DrawStatus {
  streakDays: number;
  progress: number;
  /** จำนวนสิทธิ์สุ่มที่ค้าง (ยังไม่กด). */
  pendingDraws: number;
  canClaim: boolean;
  /** เรทการสุ่มแต่ละชนิด (ไว้โชว์ใน popup). */
  rates: DropRate[];
  /** code ชนิดไข่ที่สุ่มได้ (weight > 0) — ไว้สร้างแถบ spinner. */
  spinTypes: string[];
  /** ประวัติไข่ที่สุ่มได้แล้ว (ตู้สะสม). */
  collection: CollectedEgg[];
}

export type ClaimReason = "claimed" | "not_eligible" | "already_claimed";

/**
 * กติกาการสุ่ม 3 ข้อ (ล็อกไว้กันแก้พัง):
 * 1. ครบ 3 วัน → แจกสิทธิ์ใหม่ 1 ครั้ง (granted=true มาจากหน้าต่างที่เพิ่งแจก).
 * 2. สิทธิ์ค้างกดได้เลย ไม่ต้องรอครบรอบ (claimed=true ได้โดย granted=false ได้).
 * 3. ไม่มีอะไรให้กดเลย → not_eligible (ไม่ใช่ already_claimed).
 * pure แยกไว้เทสต์ตารางตัดสินใจได้โดยไม่ต่อ DB.
 */
export function resolveClaimOutcome(
  granted: boolean,
  claimed: boolean
): ClaimReason {
  if (claimed) {
    return "claimed";
  }
  return granted ? "already_claimed" : "not_eligible";
}

export interface ClaimResult {
  ok: boolean;
  reason: ClaimReason;
  eggType?: string;
  eggName?: string;
  /** true = ได้ชนิดเดิมซ้ำ → ไม่เพิ่มฟองใหม่ แต่แปลงเป็น EXP ให้ฟองเดิม. */
  duplicate?: boolean;
  /** EXP ที่แปลงให้ (เฉพาะเส้น duplicate). */
  expGranted?: number;
}

/** EXP ที่ได้เมื่อสุ่มซ้ำชนิดเดิม (ตายตัว จำง่ายเท่าภารกิจ). */
export const DUPLICATE_EXP = 50;

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
    .select("code, name, rarity_weight");
  const names = new Map(
    (types ?? []).map((t) => [t.code as string, t.name as string])
  );
  const rates = toDropRates(
    (types ?? []).map((t) => ({
      code: t.code as string,
      name: t.name as string,
      rarity_weight: Number(t.rarity_weight) || 0,
    }))
  );
  // ชนิดที่สุ่มได้จริง (weight > 0) — ตรงกับที่ rates โชว์.
  const spinTypes = rates.map((r) => r.code);

  const progress = currentProgress(keys, lastCycleEnd, todayKey);
  const legacyName = (journey.data?.avatar_name as string | null) ?? null;

  return {
    streakDays: progress.streakDays,
    progress: progress.progress,
    pendingDraws: pending,
    canClaim: pending > 0,
    rates,
    spinTypes,
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
 * บวก EXP ให้ไข่ฟองหนึ่ง + user พร้อมกัน (คง invariant "user EXP = ผลรวมไข่").
 * ฟองเป้าหมายหายไปแล้ว (แข่งกันลบ) ตกไปเข้าตัว active แทน — ถ้าไม่มี active
 * เลยแต้มอยู่แค่ total_points. ล้มเหลวให้ throw (caller จัดการ).
 */
async function creditEggExp(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  drawId: string | null,
  points: number
): Promise<void> {
  let targetId = drawId;
  if (targetId) {
    const { data: exists } = await supabase
      .from("egg_draws")
      .select("id, egg_exp")
      .eq("id", targetId)
      .eq("user_id", userId)
      .maybeSingle();
    if (exists) {
      const { error } = await supabase
        .from("egg_draws")
        .update({ egg_exp: Number(exists.egg_exp) + points })
        .eq("id", targetId);
      if (error) throw error;
    } else {
      targetId = null;
    }
  }

  if (!targetId) {
    const { data: active } = await supabase
      .from("egg_draws")
      .select("id, egg_exp")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (active) {
      const { error } = await supabase
        .from("egg_draws")
        .update({ egg_exp: Number(active.egg_exp) + points })
        .eq("id", active.id as string);
      if (error) throw error;
    }
  }

  const { data: journey } = await supabase
    .from("healthy_journey")
    .select("total_points")
    .eq("user_id", userId)
    .maybeSingle();
  const total = Number(journey?.total_points ?? 0) + points;
  const { error: totalError } = await supabase
    .from("healthy_journey")
    .update({ total_points: total, level: levelFromPoints(total) })
    .eq("user_id", userId);
  if (totalError) throw totalError;
}

/**
 * กดสุ่มไข่ 1 ครั้ง: คำนวณสิทธิ์ใหม่ฝั่ง server เสมอ (ไม่เชื่อ client),
 * ถ้ารอบปัจจุบันครบแจกหน้าต่างเพิ่ม แล้ว claim แถวเก่าสุดที่ค้างอยู่ —
 * สิทธิ์ค้าง (เช่น ของขวัญ) กดได้เลยไม่ต้องรอครบรอบใหม่.
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
  // จำไว้ว่าเพิ่งแจกหน้าต่างใหม่หรือไม่ (ไว้แยก already_claimed/not_eligible).
  let justGranted = false;
  if (progress.eligible && progress.cycleStart && progress.cycleEnd) {
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
    justGranted = true;
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

  // Claim แถวค้างที่เก่าสุดแบบ 2 ขั้น (PostgREST เมิน limit บน UPDATE —
  // เคย update โดนหลายแถวพร้อมกันแล้ว maybeSingle ระเบิดเป็น 500):
  // 1) เลือก id เก่าสุดก่อน 2) update ทีละ id พร้อม guard claimed_at is null
  // (กันกดพร้อมกัน — ใคร update ได้ก่อนชนะ อีกคนได้ 0 แถว).
  const { data: oldest } = await supabase
    .from("egg_draws")
    .select("id")
    .eq("user_id", userId)
    .is("claimed_at", null)
    .order("granted_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!oldest) {
    return {
      ok: false,
      reason: resolveClaimOutcome(justGranted, false),
    };
  }

  // เส้นซ้ำ: มีชนิดนี้ในตู้แล้ว → ไม่เพิ่มฟองใหม่ แปลงเป็น EXP เข้าฟองเดิม
  // ชนิดเดียวกันที่ได้ก่อนสุด (+ user ด้วยพร้อมกัน คง invariant ผลรวม).
  const { data: ownedSame } = await supabase
    .from("egg_draws")
    .select("id, egg_exp")
    .eq("user_id", userId)
    .eq("egg_type", picked.code)
    .not("claimed_at", "is", null)
    .order("claimed_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedSame) {
    // กินสิทธิ์ที่ใช้กด (ลบแถวค้าง) — ลบไม่ได้แปลว่าโดนแย่งพร้อมกัน.
    const { data: consumed } = await supabase
      .from("egg_draws")
      .delete()
      .eq("id", oldest.id as string)
      .eq("user_id", userId)
      .is("claimed_at", null)
      .select("id")
      .maybeSingle();

    if (!consumed) {
      return { ok: false, reason: "already_claimed" };
    }

    try {
      await creditEggExp(supabase, userId, ownedSame.id as string, DUPLICATE_EXP);
    } catch (error) {
      console.error(`Failed to credit duplicate exp (user=${userId})`, error);
      throw new Error("Failed to claim egg draw");
    }
    return {
      ok: true,
      reason: "claimed",
      eggType: picked.code,
      eggName: picked.name,
      duplicate: true,
      expGranted: DUPLICATE_EXP,
    };
  }

  const { data: claimedRow, error: claimError } = await supabase
    .from("egg_draws")
    .update({ claimed_at: new Date().toISOString(), egg_type: picked.code })
    .eq("id", oldest.id as string)
    .eq("user_id", userId)
    .is("claimed_at", null)
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error(`Failed to claim egg draw (user=${userId})`, claimError);
    throw new Error("Failed to claim egg draw");
  }

  if (!claimedRow) {
    // แถวค้างไม่เหลือแล้ว: ถ้าเพิ่งแจกหน้าต่างใหม่แปลว่าโดนแย่งพร้อมกัน
    // (already_claimed) ถ้าไม่ได้แจกอะไรเลยแปลว่าไม่มีสิทธิ์แต่แรก.
    return {
      ok: false,
      reason: resolveClaimOutcome(justGranted, false),
    };
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
