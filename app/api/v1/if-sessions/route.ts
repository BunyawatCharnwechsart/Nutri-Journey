import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { sessionIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * GET /api/v1/if-sessions?month=YYYY-MM
 *
 * Lists the user's fasting sessions within a given month (inclusive of the
 * whole month, based on start_time). Returns an array, ordered by start time.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return apiError("month ต้องเป็นรูปแบบ YYYY-MM", 400, "VALIDATION_ERROR");
  }

  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));

  const supabase = createServiceClient();
  const { data: sessions, error } = await supabase
    .from("if_sessions")
    .select("*")
    .eq("user_id", auth.userId)
    .gte("fasting_start_time", start.toISOString())
    .lt("fasting_start_time", end.toISOString())
    .order("fasting_start_time", { ascending: true });

  if (error) {
    return apiError("Failed to load IF sessions", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ sessions: sessions ?? [] }, { status: 200 });
}

/**
 * DELETE /api/v1/if-sessions
 *
 * Cancels (deletes) a session. Only allowed while the session is still
 * active; completed sessions are kept as history.
 */
export async function DELETE(request: Request) {
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

  const parsed = sessionIdSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR");
  }

  const { sessionId } = parsed.data;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("if_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!session) {
    return apiError("ไม่พบเซสชัน IF นี้", 404, "NOT_FOUND");
  }

  if (session.status !== "active") {
    return apiError("ยกเลิกได้เฉพาะเซสชันที่ยังไม่สิ้นสุด", 409, "CONFLICT");
  }

  const { error } = await supabase
    .from("if_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", auth.userId);

  if (error) {
    return apiError("Failed to cancel IF session", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ success: true }, { status: 200 });
}