import { requireAuth } from "@/lib/auth";
import { setActiveEgg } from "@/lib/egg-draw-service";
import { apiError, apiSuccess } from "@/lib/response";
import { eggDrawIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * PATCH /api/v1/egg-draws/active
 *
 * ย้ายตัวเลี้ยง (ไข่ที่รับ EXP จากภารกิจ) — ได้เฉพาะไข่ของตัวเองที่ claim
 * แล้ว. กดพร้อมกัน 2 เครื่อง: คนชน unique ได้ 409 ให้กดใหม่.
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
    return apiError("ข้อมูลไม่ถูกต้อง", 400, "VALIDATION_ERROR");
  }

  const parsed = eggDrawIdSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  try {
    const result = await setActiveEgg(auth.userId, parsed.data.drawId);
    if (!result.ok) {
      const message =
        result.reason === "conflict"
          ? "มีการเปลี่ยนตัวเลี้ยงพร้อมกัน ลองใหม่"
          : "ไม่พบไข่ฟองนี้";
      return apiError(message, result.reason === "conflict" ? 409 : 404, "SET_ACTIVE_REJECTED");
    }
    return apiSuccess({ moved: true });
  } catch (error) {
    console.error(`PATCH /api/v1/egg-draws/active failed (user=${auth.userId})`, error);
    return apiError("ย้ายตัวเลี้ยงไม่สำเร็จ", 500, "SET_ACTIVE_FAILED");
  }
}
