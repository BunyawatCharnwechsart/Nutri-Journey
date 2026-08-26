import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { googleHealthSyncSchema } from "@/lib/validation";
import {
  getValidAccessToken,
  fetchStepsData,
  fetchDistanceData,
  fetchActiveCaloriesData,
  fetchTotalCaloriesData,
  processStepsData,
  processDistanceData,
  processActiveCaloriesData,
  processTotalCaloriesData,
  mergeDailyMetrics,
  GoogleHealthError,
} from "@/lib/google-health";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const parsed = googleHealthSyncSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const { from, to } = parsed.data;

  if (from > to) {
    return apiError("วันที่เริ่มต้องน้อยกว่าวันที่สิ้นสุด", 400, "VALIDATION_ERROR");
  }

  try {
    const accessToken = await getValidAccessToken(auth.userId);

    const [stepsMap, distanceMap, activeCalMap, totalCalMap] =
      await Promise.all([
        fetchStepsData(accessToken, from, to).then(processStepsData),
        fetchDistanceData(accessToken, from, to).then(processDistanceData),
        fetchActiveCaloriesData(accessToken, from, to).then(
          processActiveCaloriesData
        ),
        fetchTotalCaloriesData(accessToken, from, to).then(
          processTotalCaloriesData
        ),
      ]);

    const dailyMetrics = mergeDailyMetrics(
      stepsMap,
      distanceMap,
      activeCalMap,
      totalCalMap
    );

    const supabase = createServiceClient();

    for (const metric of dailyMetrics) {
      await supabase.from("daily_metrics").upsert(
        {
          user_id: auth.userId,
          date: metric.isoDate,
          steps: metric.steps,
          distance_meters: metric.distanceMeters,
          kcal: metric.totalCalories || metric.kcal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      );
    }

    await supabase
      .from("google_health_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", auth.userId);

    return apiSuccess({ synced: dailyMetrics.length });
  } catch (error) {
    if (error instanceof GoogleHealthError) {
      return apiError(error.message, 400, "GOOGLE_HEALTH_ERROR");
    }
    console.error("[Google Health Sync]", error);
    return apiError("ไม่สามารถซิงค์ข้อมูลได้", 500, "INTERNAL_ERROR");
  }
}
