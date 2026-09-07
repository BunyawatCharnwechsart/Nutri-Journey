import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import {
  deleteProgressPhoto,
  signedProgressPhotoUrl,
  uploadProgressPhoto,
} from "@/lib/supabase/storage";
import {
  detectImageMime,
  getRecordedMonthKey,
  monthKeyFromRecordDate,
  MAX_PHOTO_BYTES,
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@/lib/progress-photo";
import { progressPhotoQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * GET /api/v1/progress-photos?months=12
 *
 * Returns every photo set (front/side/back) across the last `months` calendar
 * months (default 12, max 24), newest first, grouped per month. Each photo row
 * carries a freshly-signed URL so the client can render it immediately.
 *
 * Every row is scoped to the authenticated user; only `months` is
 * client-controlled and it is validated + rescaled with Zod.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = progressPhotoQuerySchema.safeParse(params);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const now = Date.now();
  const fromMonth = new Date(now);
  // Anchor to the current month's first day, then move `months - 1` months back.
  fromMonth.setUTCDate(1);
  fromMonth.setUTCMonth(fromMonth.getUTCMonth() - (parsed.data.months - 1), 1);
  const fromKey = getRecordedMonthKey(fromMonth.getTime());

  // Hide future months from the API too (matches the page): only show up to
  // the current month.
  const currentMonthKey = getRecordedMonthKey(now);

  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from("progress_photos")
    .select("id, recorded_month, view, photo_path")
    .eq("user_id", auth.userId)
    .gte("recorded_month", fromKey)
    .lte("recorded_month", currentMonthKey)
    .order("recorded_month", { ascending: false });

  if (error) {
    return apiError("ดึงรูปถ่ายความคืบหน้าไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  // Resolve all signed URLs in parallel (one round-trip each) instead of
  // awaiting them serially inside the grouping loop.
  const resolved = await Promise.all(
    (rows ?? []).map(async (row) => ({
      row,
      url: await signedProgressPhotoUrl(row.photo_path),
    }))
  );

  // Group per month. A missing/expired object contributes no entry (null url).
  const sets: Record<
    string,
    { month: string; photos: Record<ProgressPhotoView, { id: string; url: string } | null> }
  > = {};
  for (const { row, url } of resolved) {
    const month = monthKeyFromRecordDate(row.recorded_month);
    const view = row.view as ProgressPhotoView;
    sets[month] ??= {
      month,
      photos: { front: null, side: null, back: null },
    };
    if (view in sets[month].photos && url) {
      sets[month].photos[view] = { id: row.id, url };
    }
  }

  return apiSuccess({ sets: Object.values(sets) });
}

/**
 * POST /api/v1/progress-photos
 *
 * Uploads one complete photo set (front/side/back) for the current ICT month.
 *
 * Enforced server-side: a month is LOCKED once it has any recorded view —
 * re-uploading or editing the same month is rejected (409). The rule cannot be
 * bypassed by calling the API directly because it is re-checked here even
 * though the client hides the upload button.
 *
 * The three images are uploaded atomically: if any upload or DB insert fails,
 * already-uploaded objects are deleted so a partial month never persists.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("Invalid multipart body", 400, "VALIDATION_ERROR");
  }

  // Collect + validate the three images (front/side/back).
  const files = new Map<ProgressPhotoView, File>();
  for (const view of PROGRESS_PHOTO_VIEWS) {
    const entry = form.get(view);
    if (!(entry instanceof File) || entry.size === 0) {
      return apiError(
        `กรุณาแนบรูปภาพมุม ${viewLabel(view)}`,
        400,
        "VALIDATION_ERROR"
      );
    }
    // Reject oversized files BEFORE reading them into memory (a spoofed
    // client could otherwise stream many large files to exhaust memory).
    if (entry.size > MAX_PHOTO_BYTES) {
      return apiError(
        `รูปมุม ${viewLabel(view)} ต้องมีขนาดไม่เกิน 5 MB`,
        400,
        "VALIDATION_ERROR"
      );
    }
    files.set(view, entry);
  }

  // Read every image into memory BEFORE uploading, so the real content (magic
  // bytes) can be verified server-side instead of trusting the client-sent
  // `File.type` which is spoofable.
  const images = new Map<ProgressPhotoView, { buffer: ArrayBuffer; mime: string }>();
  for (const [view, file] of files) {
    const buffer = await file.arrayBuffer();
    const mime = detectImageMime(buffer);
    if (!mime) {
      return apiError(
        `รูปมุม ${viewLabel(view)} ต้องเป็นไฟล์ภาพ JPG/PNG/WEBP ที่ถูกต้อง`,
        400,
        "VALIDATION_ERROR"
      );
    }
    images.set(view, { buffer, mime });
  }

  const now = Date.now();
  const recordedMonthKey = getRecordedMonthKey(now);

  const supabase = createServiceClient();

  // ------------------------------------------------------------------
  // Atomic month-lock via a placeholder insert.
  //
  // We reserve the month with empty photo_path rows FIRST. If two requests
  // race through the earlier read-check, only one survives here — the loser
  // hits the unique (user_id, month, view) index and fails. This is the real
  // guard against double-submit, unlike a read-then-write check alone.
  // ------------------------------------------------------------------
  const placeholderRows = PROGRESS_PHOTO_VIEWS.map((view) => ({
    user_id: auth.userId,
    recorded_month: recordedMonthKey,
    view,
    photo_path: "",
  }));

  const { error: reserveError } = await supabase
    .from("progress_photos")
    .insert(placeholderRows);

  // 23505 = unique_violation — another request already reserved this month.
  if (reserveError?.code === "23505") {
    return apiError(
      "เดือนนี้ได้บันทึกรูปถ่ายแล้ว ต้องรอเดือนถัดไป",
      409,
      "PROGRESS_PHOTO_MONTH_LOCKED"
    );
  }
  if (reserveError) {
    return apiError("บันทึกรูปถ่ายไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  // Rollback helper: remove placeholder rows + any uploaded objects so a
  // failed month never leaves an orphaned half-set behind.
  async function rollback(uploadedPaths: string[]) {
    await supabase
      .from("progress_photos")
      .delete()
      .eq("user_id", auth.userId)
      .eq("recorded_month", recordedMonthKey);
    await Promise.all(uploadedPaths.map((p) => deleteProgressPhoto(p)));
  }

  // Upload all three images, then point the reserved rows at them.
  const uploadedPaths: string[] = [];
  try {
    for (const view of PROGRESS_PHOTO_VIEWS) {
      const image = images.get(view)!;
      const { path } = await uploadProgressPhoto({
        userId: auth.userId,
        monthKey: recordedMonthKey,
        view,
        buffer: image.buffer,
        mime: image.mime,
      });
      uploadedPaths.push(path);
    }
  } catch (e) {
    await rollback(uploadedPaths);
    return apiError(
      `อัปโหลดรูปไม่สำเร็จ ${e instanceof Error ? `: ${e.message}` : ""}`,
      500,
      "INTERNAL_ERROR"
    );
  }

  const { error: updateError } = await supabase
    .from("progress_photos")
    .upsert(
      PROGRESS_PHOTO_VIEWS.map((view, index) => ({
        user_id: auth.userId,
        recorded_month: recordedMonthKey,
        view,
        photo_path: uploadedPaths[index],
      })),
      { onConflict: "user_id,recorded_month,view" }
    );

  if (updateError) {
    await rollback(uploadedPaths);
    return apiError("บันทึกรูปถ่ายไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ recordedMonth: recordedMonthKey }, { status: 201 });
}

function viewLabel(view: ProgressPhotoView): string {
  switch (view) {
    case "front":
      return "ด้านหน้า";
    case "side":
      return "ด้านข้าง";
    case "back":
      return "ด้านหลัง";
  }
}
