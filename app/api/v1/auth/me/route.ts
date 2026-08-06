import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const supabase = createServiceClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (userError || !user) {
    return apiError("User not found", 404, "NOT_FOUND");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();

  return apiSuccess({ user, profile });
}
