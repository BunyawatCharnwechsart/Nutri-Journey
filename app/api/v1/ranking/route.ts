import { requireAuth } from "@/lib/auth";
import { getLeaderboard } from "@/lib/ranking-service";
import { apiError, apiSuccess } from "@/lib/response";
import { rankingQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * GET /api/v1/ranking?limit=20&offset=0
 *
 * ลีดเดอร์บอร์ดรวมทั้งระบบ เรียงตาม EXP (healthy_journey.total_points)
 * มาก→น้อย พร้อมอันดับของตัวเองใน response เดียวกัน — frontend ไม่ต้องยิง
 * 2 รอบ. แต้มเท่ากันได้อันดับต่างกัน (row number) โดย tie-break ด้วย
 * user_id เพื่อให้ลำดับนิ่งทุกครั้งที่เรียก.
 *
 * Privacy: ส่งกลับแค่ display_name/avatar_url/level/points — ไม่มี
 * line_user_id/email. ต้อง login ทุกครั้ง (requireAuth).
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = rankingQuerySchema.safeParse(params);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  try {
    const result = await getLeaderboard(
      auth.userId,
      parsed.data.limit,
      parsed.data.offset
    );
    return apiSuccess(result);
  } catch (error) {
    console.error(`GET /api/v1/ranking failed (user=${auth.userId})`, error);
    return apiError("โหลดอันดับไม่สำเร็จ", 500, "RANKING_FAILED");
  }
}
