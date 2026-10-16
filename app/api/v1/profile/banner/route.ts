import { requireAuth } from "@/lib/auth";
import { getOwnedBanners, setActiveBanner } from "@/lib/banner-service";
import { apiError, apiSuccess } from "@/lib/response";
import { bannerEquipSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * PATCH /api/v1/profile/banner
 *
 * สวม/ถอด Banner (ครั้งละ 1 ชิ้น) — รับ { rankingId } (เจาะจงสมัย) หรือ
 * { banner } (type / betatester / null ถอดออก).
 * ownership ตรวจฝั่ง server ใน setActiveBanner — สวมของที่ไม่มีจริง
 * จะได้ 403 NOT_OWNED. ตอบกลับพร้อมป้ายปัจจุบันเพื่ออัปเดต UI ทันที.
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400, "VALIDATION_ERROR");
  }

  const parsed = bannerEquipSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const input =
    "rankingId" in parsed.data
      ? { rankingId: parsed.data.rankingId }
      : { banner: parsed.data.banner };
  const result = await setActiveBanner(auth.userId, input);

  if (!result.ok) {
    if (result.error === "NOT_OWNED") {
      return apiError("คุณยังไม่มี Banner นี้", 403, "NOT_OWNED");
    }
    return apiError("บันทึก Banner ไม่สำเร็จ", 500, "BANNER_SAVE_FAILED");
  }

  // อ่านป้ายปัจจุบันกลับไป — client อัปเดต UI ได้เลยไม่ต้องยิง GET ซ้ำ.
  try {
    const owned = await getOwnedBanners(auth.userId);
    return apiSuccess({
      banner: owned.active,
      rankingId: owned.activeRankingId,
      seasonKey: owned.activeSeasonKey,
      streak: owned.activeStreak,
    });
  } catch (error) {
    console.error(`PATCH /api/v1/profile/banner reload failed (user=${auth.userId})`, error);
    return apiSuccess({ banner: null, rankingId: null, seasonKey: null, streak: null });
  }
}
