import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/v1/if-sessions/active
 *
 * Returns the user's currently active fasting session, or null when there
 * is none. Used by the IF tracker on page load to restore a running timer.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const supabase = createServiceClient();
  const { data: session, error } = await supabase
    .from("if_sessions")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("fasting_start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return apiError("Failed to load active session", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ session: session ?? null }, { status: 200 });
}