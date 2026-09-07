import "server-only";

import { randomUUID } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Supabase Storage bucket that holds progress photos (private).
 * Kept private so images are never publicly addressable — access is only via
 * short-lived signed URLs generated with the service role.
 */
export const PROGRESS_PHOTO_BUCKET = "progress-photos";

function storage() {
  return createServiceClient().storage.from(PROGRESS_PHOTO_BUCKET);
}

/**
 * Uploads one image for a user and returns the object path (stored in
 * progress_photos.photo_path). The path embeds a random UUID so object keys
 * cannot be guessed; the user_id prefix is a human-readible namespacing aid.
 */
export async function uploadProgressPhoto(options: {
  userId: string;
  monthKey: string; // "yyyy-MM-01"
  view: string; // front | side | back
  buffer: ArrayBuffer;
  mime: string;
}): Promise<{ path: string }> {
  const path = `${options.userId}/${options.monthKey}/${options.view}-${randomUUID()}.${extFromMime(
    options.mime
  )}`;

  const { error } = await storage().upload(path, options.buffer, {
    contentType: options.mime,
    upsert: false,
  });

  if (error) {
    throw new Error(`upload failed: ${error.message}`);
  }

  return { path };
}

/**
 * Deletes one stored object. Used to roll back any uploaded image if a later
 * step of the month-set upload fails (keeps a broken month atomic).
 */
export async function deleteProgressPhoto(path: string): Promise<void> {
  const { error } = await storage().remove([path]);
  if (error) {
    // Swallow: cleanup is best-effort, the caller already surfaces the real
    // failure to the user.
  }
}

/**
 * Returns a short-lived public (signed) URL for a stored object, so the
 * client's <img> can display it without needing a Supabase auth token.
 * The URL expires after `expiresInSeconds` (default 24h).
 */
export async function signedProgressPhotoUrl(
  path: string,
  expiresInSeconds = 86_400
): Promise<string | null> {
  const { data, error } = await storage().createSignedUrl(
    path,
    expiresInSeconds
  );
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}
