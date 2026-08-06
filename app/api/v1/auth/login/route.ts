import { cookies } from "next/headers";

import { verifyLineIdToken } from "@/lib/line";
import { createServiceClient } from "@/lib/supabase/service";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400, "VALIDATION_ERROR");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid idToken", 400, "VALIDATION_ERROR");
  }

  let lineUser;
  try {
    lineUser = await verifyLineIdToken(parsed.data.idToken);
  } catch {
    return apiError("Invalid LINE idToken", 401, "UNAUTHORIZED");
  }

  const supabase = createServiceClient();

  // Upsert the user by their LINE userId. Existing users get their latest
  // profile data refreshed; new users are created automatically.
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        line_user_id: lineUser.sub,
        display_name: lineUser.name ?? null,
        avatar_url: lineUser.picture ?? null,
        email: lineUser.email ?? null,
      },
      { onConflict: "line_user_id" }
    )
    .select("user_id")
    .single();

  if (userError || !user) {
    return apiError("Failed to create user", 500, "INTERNAL_ERROR");
  }

  // Create a profile row for brand-new users (default values only).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.user_id)
    .maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ user_id: user.user_id });

    if (profileError) {
      return apiError("Failed to create profile", 500, "INTERNAL_ERROR");
    }
  }

  const sessionToken = await createSessionToken(user.user_id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);

  return apiSuccess({ user }, { status: 200 });
}
