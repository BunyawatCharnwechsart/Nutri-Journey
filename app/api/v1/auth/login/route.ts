import { cookies } from "next/headers";

import { verifyLineIdToken } from "@/lib/line";
import { createServiceClient } from "@/lib/supabase/service";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { isProfileComplete } from "@/lib/profile";
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
  // The LINE user id is identical across the login and OA channels because
  // both channels live under the same provider. Binding oa_user_id here makes
  // every logged-in user ready to receive push notifications (only adding the
  // OA as a friend is left for the user to do).
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        line_user_id: lineUser.sub,
        oa_user_id: lineUser.sub,
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

  // Ensure a profile row exists (brand-new users) and read it back for the
  // completeness check. Both queries only depend on user_id, so they run in
  // parallel instead of one-after-another. `ignoreDuplicates` turns the old
  // "select-then-insert" into a single round trip and also prevents a primary
  // key conflict if the same new user logs in twice at the same time.
  const [profileUpsert, profileRead] = await Promise.all([
    supabase
      .from("profiles")
      .upsert(
        { user_id: user.user_id },
        { onConflict: "user_id", ignoreDuplicates: true }
      ),
    supabase
      .from("profiles")
      .select("gender, birth_date, height, activity_level")
      .eq("user_id", user.user_id)
      .maybeSingle(),
  ]);

  if (profileUpsert.error) {
    return apiError("Failed to create profile", 500, "INTERNAL_ERROR");
  }

  const profile = profileRead.data ?? null;
  const profileComplete = isProfileComplete(profile);

  const sessionToken = await createSessionToken(user.user_id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);

  return apiSuccess({ user, profileComplete }, { status: 200 });
}
