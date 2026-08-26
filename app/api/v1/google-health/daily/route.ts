import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { googleHealthDailySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return apiError("ต้องระบุ from และ to", 400, "VALIDATION_ERROR");
  }

  const parsed = googleHealthDailySchema.safeParse({ from, to });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const supabase = createServiceClient();

  const { data: daily, error } = await supabase
    .from("daily_metrics")
    .select("date, steps, distance_meters, kcal, updated_at")
    .eq("user_id", auth.userId)
    .gte("date", parsed.data.from)
    .lte("date", parsed.data.to)
    .order("date", { ascending: true });

  if (error) {
    return apiError("ไม่สามารถดึงข้อมูลได้", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ daily: daily ?? [] });
}
