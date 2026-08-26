import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  revokeGoogleAccess,
  GoogleHealthError,
} from "@/lib/google-health";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const supabase = createServiceClient();

  const { data: connection } = await supabase
    .from("google_health_connections")
    .select("refresh_token")
    .eq("user_id", auth.userId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!connection) {
    return apiError("ไม่พบการเชื่อมต่อ Google Health", 404, "NOT_FOUND");
  }

  try {
    if (connection.refresh_token) {
      await revokeGoogleAccess(connection.refresh_token);
    }
  } catch (error) {
    if (error instanceof GoogleHealthError) {
      console.error("[Google Health Revoke]", error.message);
    }
  }

  const { error } = await supabase
    .from("google_health_connections")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", auth.userId);

  if (error) {
    return apiError("ไม่สามารถยกเลิกการเชื่อมต่อได้", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ success: true });
}
