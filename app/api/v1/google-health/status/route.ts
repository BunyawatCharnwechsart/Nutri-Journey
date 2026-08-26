import { requireAuth } from "@/lib/auth";
import { apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const supabase = createServiceClient();

  const { data: connection } = await supabase
    .from("google_health_connections")
    .select("connected_at, last_synced_at, revoked_at")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const connected =
    connection !== null &&
    connection.revoked_at === null;

  return apiSuccess({
    connected,
    connectedAt: connected ? connection.connected_at : null,
    lastSyncedAt: connected ? connection.last_synced_at : null,
  });
}
