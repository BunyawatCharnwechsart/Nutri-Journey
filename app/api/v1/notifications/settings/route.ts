import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { notificationSettingsSchema } from "@/lib/validation";

export const runtime = "nodejs";

// ============================================================================
// POST /api/v1/notifications/settings
//
// Turns the three LINE notification types on/off independently (migration
// 0030/0031):
//   * ifNotifications → users.line_notifications_enabled  (IF phase reminders)
//   * monthlyReminder → users.monthly_reminder_enabled    (monthly check-in)
//   * photoReminder   → users.photo_reminder_enabled      (monthly photo)
//
// Only fields sent in the body are changed; at least one is required (see
// notificationSettingsSchema). The effective "receive monthly?" value is
// coalesce(monthly_reminder_enabled, line_notifications_enabled), resolved in
// the cron — here we just write the explicit user choice.
//
// Security:
//   * requireAuth() — userId comes from the verified session cookie, never the
//     client. The update is scoped with .eq("user_id", auth.userId).
//   * all input validated with Zod before touching the DB.
//   * response exposes only safe booleans — no oa_user_id / line_user_id.
// ============================================================================

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

  const parsed = notificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR");
  }

  const updates: {
    line_notifications_enabled?: boolean;
    monthly_reminder_enabled?: boolean;
    photo_reminder_enabled?: boolean;
  } = {};
  if (parsed.data.ifNotifications !== undefined) {
    updates.line_notifications_enabled = parsed.data.ifNotifications;
  }
  if (parsed.data.monthlyReminder !== undefined) {
    updates.monthly_reminder_enabled = parsed.data.monthlyReminder;
  }
  if (parsed.data.photoReminder !== undefined) {
    updates.photo_reminder_enabled = parsed.data.photoReminder;
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("user_id", auth.userId);

  if (error) {
    console.error("[notifications/settings] update failed", error);
    return apiError("อัปเดตการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  // Read back only what the client may see (no LINE ids) so the response is
  // the single source of truth for the BellButton state.
  const { data: user, error: readError } = await supabase
    .from("users")
    .select(
      "oa_user_id, line_notifications_enabled, monthly_reminder_enabled, photo_reminder_enabled"
    )
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (readError || !user) {
    return apiError("User not found", 404, "NOT_FOUND");
  }

  return apiSuccess(
    {
      linked: Boolean(
        user.oa_user_id &&
          (user.line_notifications_enabled !== false ||
            user.monthly_reminder_enabled !== false ||
            user.photo_reminder_enabled !== false)
      ),
      ifNotifications: user.line_notifications_enabled !== false,
      monthlyReminder: user.monthly_reminder_enabled !== false,
      photoReminder: user.photo_reminder_enabled !== false,
    },
    { status: 200 }
  );
}