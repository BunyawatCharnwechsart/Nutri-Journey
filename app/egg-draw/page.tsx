import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { getDrawStatus } from "@/lib/egg-draw-service";
import BackButton from "@/components/BackButton";
import EggClaimButton from "@/components/EggClaimButton";
import EggCollection from "@/components/EggCollection";
import EggRatesButton from "@/components/EggRatesButton";

export const dynamic = "force-dynamic";

/**
 * หน้าสุ่มไข่ — แสดงความคืบหน้าอดติดกัน, ปุ่มกดสุ่ม (เมื่อมีสิทธิ์),
 * และตู้สะสมไข่ที่เคยได้. โหลดสถานะฝั่ง server ตรงๆ ไม่ยิง HTTP วนกลับ.
 */
export default async function EggDrawPage() {
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
              สุ่มไข่
            </h1>
          </div>
          <p className="mt-1 text-center text-sm text-zinc-500">
            อด success ติดกันทุก 3 วัน (วันปฏิทิน) รับสิทธิ์สุ่ม 1 ครั้ง
          </p>
        </header>

        <section
          aria-label="ความคืบหน้า"
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="flex items-end justify-between gap-4">
            <p className="text-xl font-bold text-zinc-900">
              ติดกัน {status.streakDays} วัน
            </p>
            <p className="text-sm text-zinc-500">
              {status.progress}/3 · สิทธิ์คงเหลือ {status.pendingDraws} ครั้ง
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={status.progress}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-label="ความคืบหน้าอดติดกัน"
            className="mt-3 flex gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full ${
                  i < status.progress ? "bg-[#6C4FD8]" : "bg-zinc-100"
                }`}
              />
            ))}
          </div>
        </section>

        <EggClaimButton canClaim={status.canClaim} />

        <div className="flex justify-center">
          <EggRatesButton rates={status.rates} />
        </div>

        <section aria-label="ตู้สะสมไข่">
          <h2 className="px-1 text-base font-semibold text-zinc-900">
            ตู้สะสม ({status.collection.length})
          </h2>
          <EggCollection collection={status.collection} />
        </section>
      </div>
    </main>
  );
}
