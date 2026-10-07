"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClaimPhase =
  | { name: "idle" }
  | { name: "loading" }
  | { name: "done"; eggName: string }
  | { name: "rejected"; message: string };

/**
 * ปุ่มกดสุ่มไข่ 1 ครั้ง — ยิง POST /api/v1/egg-draws/claim (ไม่มี body,
 * สิทธิ์คำนวณฝั่ง server) สำเร็จโชว์ชื่อไข่ที่ได้ + refresh หน้าให้สิทธิ์
 * กับตู้สะสมอัปเดต.
 */
export default function EggClaimButton({ canClaim }: { canClaim: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<ClaimPhase>({ name: "idle" });

  async function claim() {
    if (phase.name === "loading") {
      return;
    }
    setPhase({ name: "loading" });
    try {
      const res = await fetch("/api/v1/egg-draws/claim", { method: "POST" });
      const body = (await res.json()) as {
        success: boolean;
        data?: { eggName?: string };
        error?: { message?: string };
      };
      if (res.ok && body.success) {
        setPhase({ name: "done", eggName: body.data?.eggName ?? "ไข่" });
        router.refresh();
      } else {
        setPhase({
          name: "rejected",
          message: body.error?.message ?? "สุ่มไม่สำเร็จ",
        });
      }
    } catch {
      setPhase({ name: "rejected", message: "เครือข่ายมีปัญหา ลองใหม่" });
    }
  }

  if (phase.name === "done") {
    return (
      <div
        role="status"
        className="relative rounded-2xl border border-[#18A659] bg-[#E8F5EC] p-5 text-center"
      >
        <button
          type="button"
          onClick={() => setPhase({ name: "idle" })}
          aria-label="ปิดผลการสุ่ม"
          className="absolute top-2 right-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-xl text-zinc-500 active:bg-zinc-200"
        >
          <span aria-hidden="true">×</span>
        </button>
        <p className="text-4xl" aria-hidden="true">
          🥚
        </p>
        <p className="mt-2 text-base font-semibold text-zinc-900">
          ยินดีด้วย! ได้{phase.eggName}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          ดูได้ในตู้สะสมด้านล่าง
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={claim}
        disabled={!canClaim || phase.name === "loading"}
        className="min-h-[52px] rounded-2xl bg-[#18A659] px-4 py-3 text-base font-semibold text-white transition-colors active:bg-[#128A48] disabled:opacity-40"
      >
        {phase.name === "loading" ? "กำลังสุ่ม…" : "กดสุ่มไข่เลย"}
      </button>
      {phase.name === "rejected" && (
        <p role="alert" className="text-center text-sm text-zinc-500">
          {phase.message}
        </p>
      )}
    </div>
  );
}
