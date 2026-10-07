import { requireAuth } from "@/lib/auth";
import { getDrawStatus } from "@/lib/egg-draw-service";
import { apiError, apiSuccess } from "@/lib/response";

export const runtime = "nodejs";

/**
 * GET /api/v1/egg-draws/status
 *
 * สถานะสุ่มไข่: ติดกันกี่วัน (progress/3), สิทธิ์ค้างกี่ครั้ง,
 * กดสุ่มได้ไหม, และตู้สะสมที่เคยได้. ไม่รับ input ใดจาก client.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const status = await getDrawStatus(auth.userId);
    return apiSuccess(status);
  } catch (error) {
    console.error(`GET /api/v1/egg-draws/status failed (user=${auth.userId})`, error);
    return apiError("โหลดสถานะสุ่มไข่ไม่สำเร็จ", 500, "EGG_STATUS_FAILED");
  }
}
