import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { getDrawStatus } from "@/lib/egg-draw-service";
import BackButton from "@/components/BackButton";
import EggCollection from "@/components/EggCollection";

export const dynamic = "force-dynamic";

/**
 * หน้ากระเป๋าสัตว์เลี้ยง — ตู้สะสมไข่ทั้งหมดอย่างเดียว (ย้ายออกมาจาก
 * /egg-draw เพื่อแยกหน้าที่กัน: สุ่มอยู่หน้านั้น สะสมอยู่หน้านี้).
 */
export default async function BagPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const status = await getDrawStatus(userId);

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <div className="relative flex items-center justify-center">
            <div className="absolute left-0">
              <BackButton fallback="/my-egg" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              กระเป๋าสัตว์เลี้ยง
            </h1>
          </div>
          <p className="mt-1 text-center text-sm text-zinc-500">
            ไข่ทั้งหมด {status.collection.length} ฟอง
          </p>
        </header>

        <EggCollection collection={status.collection} />
      </div>
    </main>
  );
}
