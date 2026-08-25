import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const { sessionId, newStartTime } = body;

    if (!sessionId || !newStartTime) {
      return apiError("Missing sessionId or newStartTime", 400, "BAD_REQUEST");
    }

    const newTime = new Date(newStartTime);
    if (isNaN(newTime.getTime())) {
      return apiError("Invalid time format", 400, "BAD_REQUEST");
    }

    const supabase = createServiceClient();

    // Fetch the active session
    const { data: session } = await supabase
      .from("if_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (!session) {
      return apiError("ไม่พบเซสชัน IF นี้", 404, "NOT_FOUND");
    }

    if (session.status !== "active") {
      return apiError("ไม่สามารถแก้ไขเซสชันที่สิ้นสุดไปแล้วได้", 409, "CONFLICT");
    }

    // Determine current phase
    const isEatingPhase = session.fasting_end_time !== null;

    let updatePayload: any = {};

    if (!isEatingPhase) {
      // Fasting phase: just update the fasting_start_time
      updatePayload = {
        fasting_start_time: newTime.toISOString(),
      };
    } else {
      // Eating phase: update eating_start_time AND fasting_end_time
      // and recalculate fasting_duration_minutes
      const fastingStart = new Date(session.fasting_start_time).getTime();
      const newFastingEnd = newTime.getTime();

      if (newFastingEnd < fastingStart) {
        return apiError("เวลากินไม่สามารถเกิดก่อนเวลาเริ่มอดได้", 400, "BAD_REQUEST");
      }

      const fastingDurationMinutes = Math.max(
        0,
        Math.round((newFastingEnd - fastingStart) / 60000)
      );

      updatePayload = {
        fasting_end_time: newTime.toISOString(),
        fasting_duration_minutes: fastingDurationMinutes,
        eating_start_time: newTime.toISOString(),
      };
    }

    const { data: updated, error } = await supabase
      .from("if_sessions")
      .update(updatePayload)
      .eq("id", sessionId)
      .eq("user_id", auth.userId)
      .select("*")
      .single();

    if (error || !updated) {
      console.error("[edit-time] update error:", error);
      return apiError("เกิดข้อผิดพลาดในการอัปเดตเวลา", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ session: updated });
  } catch (error: any) {
    console.error("[edit-time] catch:", error);
    return apiError("Internal server error", 500, "INTERNAL_ERROR");
  }
}
