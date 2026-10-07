import { requireAuth } from "@/lib/auth";
import { claimDraw } from "@/lib/egg-draw-service";
import { apiError, apiSuccess } from "@/lib/response";

export const runtime = "nodejs";

/**
 * POST /api/v1/egg-draws/claim
 *
 * กดสุ่มไข่ 1 ครั้ง (ไม่รับ body — สิทธิ์คำนวณใหม่ฝั่ง server ทุกครั้ง).
 * สำเร็จ → { eggType, eggName }; สิทธิ์ไม่พอ → 409; กดซ้ำ/แข่งกัน → 409.
 */
export async function POST() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const result = await claimDraw(auth.userId);
    if (!result.ok) {
      const message =
        result.reason === "not_eligible"
          ? "อดติดกันยังไม่ครบ 3 วัน"
          : "รับสิทธิ์นี้ไปแล้ว";
      return apiError(message, 409, "CLAIM_REJECTED");
    }
    return apiSuccess({ eggType: result.eggType, eggName: result.eggName });
  } catch (error) {
    console.error(`POST /api/v1/egg-draws/claim failed (user=${auth.userId})`, error);
    return apiError("สุ่มไข่ไม่สำเร็จ", 500, "EGG_CLAIM_FAILED");
  }
}
