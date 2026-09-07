import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { signedProgressPhotoUrl } from "@/lib/supabase/storage";
import { toICTMonthKey } from "@/lib/timezone";
import {
  canUploadPhotos,
  getRecordedMonthKey,
  monthKeyFromRecordDate,
  nextMonthKey,
  type ProgressPhotoView,
} from "@/lib/progress-photo";
import EggIconLink from "@/components/EggIconLink";
import ProgressPhotoGallery, {
  type ProgressPhotoSet,
} from "@/components/ProgressPhotoGallery";

export const dynamic = "force-dynamic";

export default async function PhotoPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const now = new Date();
  const currentMonthKey = getRecordedMonthKey(now.getTime());

  const supabase = createServiceClient();

  // All recorded months so the compare view is complete.
  const { data: rows, error } = await supabase
    .from("progress_photos")
    .select("recorded_month, view, photo_path")
    .eq("user_id", userId)
    .order("recorded_month", { ascending: true });

  const distinctMonthKeys = new Set<string>();
  const sets: ProgressPhotoSet[] = [];
  const setsByMonth = new Map<string, ProgressPhotoSet>();

  // Hide any future month (recorded_month beyond the current month) — only
  // show มกราคม up to the current month.
  const currentMonth = toICTMonthKey(now);

  const visibleRows = (rows ?? []).filter((row) => {
    const month = monthKeyFromRecordDate(row.recorded_month);
    return month <= currentMonth;
  });

  // Resolve all signed URLs in parallel (one round-trip each).
  const resolved = await Promise.all(
    visibleRows.map(async (row) => ({
      month: monthKeyFromRecordDate(row.recorded_month),
      view: row.view as ProgressPhotoView,
      url: await signedProgressPhotoUrl(row.photo_path),
    }))
  );

  for (const row of rows ?? []) {
    distinctMonthKeys.add(row.recorded_month);
  }

  if (!error) {
    for (const { month, view, url } of resolved) {
      let set = setsByMonth.get(month);
      if (!set) {
        set = { month, front: null, side: null, back: null };
        setsByMonth.set(month, set);
        sets.push(set);
      }
      set[view] = url ? { url } : null;
    }
  }

  const canUpload = canUploadPhotos(now.getTime(), [...distinctMonthKeys]);
  const hasAnyPhoto = sets.length > 0;

  // Trailing card = เดือนที่จะบันทึกต่อไป: เดือนนี้ถ้ายังไม่บันทึก, ไม่งั้นเดือนถัดไป.
  const nextRecordableMonthKey = canUpload
    ? currentMonthKey
    : nextMonthKey(currentMonthKey);

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              รูปภาพ
            </h1>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              ภาพถ่ายความคืบหน้า
            </p>
          </div>
          <EggIconLink />
        </header>

        <ProgressPhotoGallery
          sets={sets}
          canUpload={canUpload}
          nextRecordableMonthKey={nextRecordableMonthKey}
          hasAnyPhoto={hasAnyPhoto}
        />
      </div>
    </main>
  );
}
