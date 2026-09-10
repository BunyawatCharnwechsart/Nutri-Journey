import { requireAuth } from "@/lib/auth";
import { renameAvatar } from "@/lib/healthy-journey-service";
import { apiError, apiSuccess } from "@/lib/response";
import { avatarNameSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * PATCH /api/v1/healthy-journey
 *
 * Renames the user's egg (avatar). The userId comes from the verified
 * session cookie — never from the body — and the request body is validated
 * with zod before it reaches the database.
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

  const parsed = avatarNameSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  try {
    const avatarName = await renameAvatar(auth.userId, parsed.data.avatarName);
    return apiSuccess({ avatarName }, { status: 200 });
  } catch {
    return apiError("Failed to rename avatar", 500, "INTERNAL_ERROR");
  }
}