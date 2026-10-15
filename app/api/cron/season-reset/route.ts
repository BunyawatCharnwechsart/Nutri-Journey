import { createServiceClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/response";
import {
  bannerForRank,
  getQuarterBounds,
  getSeasonKey,
  parseSeasonKey,
} from "@/lib/season";

export const runtime = "nodejs";

// ============================================================================
// GET|POST /api/cron/season-reset (Authorization: Bearer <CRON_SECRET>)
//
// ปิด season quarter ปัจจุบัน (ICT) + เปิด season ใหม่ — รันทุกวันที่ 1
// ม.ค./เม.ย./ก.ค./ต.ค. 00:05 ICT (ดู supabase/scheduled_season_reset.sql).
//
// ขั้นตอน (idempotent — ยิงซ้ำไม่เบิ้ล):
//   1. หา season_key ของ quarter ปัจจุบัน (เช่น "2026-Q4").
//   2. upsert seasons แถวนั้นเป็น 'active' (ถ้ายังไม่มี) — debut ครั้งแรก.
//   3. ถ้าเพิ่งขึ้น quarter ใหม่: ปิด season เก่า ('closed' + closed_at),
//      snapshot ทุกคนจาก healthy_journey (ORDER BY season_points DESC,
//      user_id ASC — tie-break เดียวกับ ranking) ลง season_rankings
//      (Top 1-3 ได้ banner gold/silver/bronze), แล้ว reset
//      healthy_journey.season_points = 0 ทั้งระบบ.
//   4. active_banner ของ user ไม่แตะ — ของสะสมถาวร.
// ============================================================================

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  // Secret ผ่าน header อย่างเดียว — ห้าม query string (ติด log).
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const supabase = createServiceClient();
  const now = new Date();
  const currentKey = getSeasonKey(now);
  const { year, quarter } = parseSeasonKey(currentKey);
  const { startsAtIso, endsAtIso } = getQuarterBounds(year, quarter);

  // 1-2. season ปัจจุบันต้อง active เสมอ (debut / self-heal ถ้าหาย).
  const { data: current, error: currentError } = await supabase
    .from("seasons")
    .upsert(
      {
        season_key: currentKey,
        year,
        quarter,
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        status: "active",
      },
      { onConflict: "season_key" }
    )
    .select("id, season_key, status")
    .single();

  if (currentError || !current) {
    console.error("[Season reset] upsert current failed", currentError);
    return apiError("รีเซ็ต Season ไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  // 3. หา season active อื่นที่ค้าง (quarter เก่าที่ยังไม่ปิด).
  const { data: stale, error: staleError } = await supabase
    .from("seasons")
    .select("id, season_key, year, quarter")
    .eq("status", "active")
    .neq("id", current.id);

  if (staleError) {
    console.error("[Season reset] stale query failed", staleError);
    return apiError("รีเซ็ต Season ไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  if (!stale || stale.length === 0) {
    return apiSuccess({ season: currentKey, closed: [] });
  }

  const closed: Array<{ season: string; participants: number }> = [];

  for (const old of stale) {
    // กันยิงซ้ำ: ถ้ามี snapshot แล้ว = ปิดไปแล้วรอบก่อน → แค่ mark closed.
    const { count: existing } = await supabase
      .from("season_rankings")
      .select("id", { count: "exact", head: true })
      .eq("season_id", old.id);

    if ((existing ?? 0) === 0) {
      // Snapshot ทุกคนที่มีแต้ม season (0 แต้มไม่ต้องเก็บ — ไม่มีผลอันดับ).
      const { data: journeys, error: journeyError } = await supabase
        .from("healthy_journey")
        .select("user_id, season_points")
        .gt("season_points", 0)
        .order("season_points", { ascending: false })
        .order("user_id", { ascending: true });

      if (journeyError) {
        console.error(`[Season reset] snapshot failed (${old.season_key})`, journeyError);
        continue;
      }

      const rows = (journeys ?? []).map((j, index) => {
        const rank = index + 1;
        return {
          season_id: old.id,
          user_id: j.user_id,
          rank,
          season_points: Number(j.season_points ?? 0),
          banner: bannerForRank(rank),
        };
      });

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("season_rankings")
          .insert(rows);

        if (insertError) {
          console.error(`[Season reset] insert failed (${old.season_key})`, insertError);
          continue;
        }
      }

      closed.push({ season: old.season_key, participants: rows.length });
    } else {
      closed.push({ season: old.season_key, participants: existing ?? 0 });
    }

    await supabase
      .from("seasons")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", old.id);
  }

  // Reset แต้ม season ทั้งระบบทีเดียว (lifetime ไม่แตะ — level/ไข่คงเดิม).
  // รันเฉพาะเมื่อมีการปิด season จริง — ไม่ใช่ทุกครั้งที่ cron ยิง.
  const { error: resetError } = await supabase
    .from("healthy_journey")
    .update({ season_points: 0 })
    .gt("season_points", 0);

  if (resetError) {
    console.error("[Season reset] reset season_points failed", resetError);
    return apiError("รีเซ็ต Season ไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ season: currentKey, closed });
}
