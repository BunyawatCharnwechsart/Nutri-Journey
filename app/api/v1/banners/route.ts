import { requireAuth } from "@/lib/auth";
import { getOwnedBanners } from "@/lib/banner-service";
import { apiError, apiSuccess } from "@/lib/response";

export const runtime = "nodejs";

/**
 * GET /api/v1/banners
 *
 * Banner ที่ตัวเองเป็นเจ้าของ (นับจาก season_rankings) + ตัวที่สวมอยู่.
 * ต้อง login ทุกครั้ง — userId มาจาก JWT ไม่ใช่ request body.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const banners = await getOwnedBanners(auth.userId);
    return apiSuccess({ banners });
  } catch (error) {
    console.error(`GET /api/v1/banners failed (user=${auth.userId})`, error);
    return apiError("โหลด Banner ไม่สำเร็จ", 500, "BANNERS_FAILED");
  }
}
