import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { editTimeSchema, isValidEditTime } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
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

    const parsed = editTimeSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      return apiError(message, 400, "VALIDATION_ERROR");
    }

    const { sessionId, newStartTime } = parsed.data;
    const newTime = new Date(newStartTime);

    // กัน API ถูกยิงตรงโดยข้าม UI input: เวลาต้องไม่อยู่ในอนาคต และไม่เก่าเกิน
    // MAX_EDIT_TIME_AGE_MS (7 วัน) — ไม่งั้นจะทำ fasting duration / notification /
    // calendar เพี้ยนได้.
    if (!isValidEditTime(newTime.getTime(), Date.now())) {
      return apiError("เวลาไม่ถูกต้อง (ห้ามเป็นอนาคต หรือย้อนหลังเกิน 7 วัน)", 400, "BAD_REQUEST");
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

    type IfSessionUpdate = {
      fasting_start_time?: string;
      fasting_end_time?: string;
      fasting_duration_minutes?: number;
      eating_start_time?: string;
    };

    let updatePayload: IfSessionUpdate = {};

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
      console.error("Failed to update IF session time", error);
      return apiError("เกิดข้อผิดพลาดในการอัปเดตเวลา", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ session: updated });
  } catch {
    return apiError("Internal server error", 500, "INTERNAL_ERROR");
  }
}
