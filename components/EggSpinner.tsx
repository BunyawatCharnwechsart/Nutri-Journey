"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { avatarForEgg } from "@/lib/healthy-journey";
import {
  buildSpinStrip,
  spinOffsetPx,
  type SpinStrip,
} from "@/lib/egg-spin";

/** ความกว้าง 1 ช่อง (px) — ต้องตรงกับ class w-28 ของ cell. */
const CELL_WIDTH = 112;
/** เวลาหมุน (ms) — ช้าหน่อยให้ลุ้นแบบ CSGO. */
const SPIN_MS = 6000;

interface EggSpinnerProps {
  canClaim: boolean;
  spinTypes: string[];
}

interface SpinResult {
  eggType: string;
  eggName: string;
  duplicate: boolean;
  expGranted: number;
}

type SpinPhase =
  | { name: "idle" }
  | { name: "spinning"; strip: SpinStrip; offset: number; result: SpinResult }
  | ({ name: "done" } & SpinResult)
  | { name: "rejected"; message: string };

/**
 * ที่สุ่มสไตล์ CSGO: กด → POST เอาผลจาก server ก่อน → สร้างแถบโดยล็อกช่อง
 * ที่ชนะไว้ใต้เข็ม → วิ่งชะลอหยุด → เฉลย. animation เป็นแค่ละครล้วนๆ
 * เปลี่ยนผลไม่ได้ (ผลตายตัวตั้งแต่ POST ตอบ).
 */
export default function EggSpinner({ canClaim, spinTypes }: EggSpinnerProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<SpinPhase>({ name: "idle" });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function finish(result: SpinResult) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPhase({ name: "done", ...result });
    router.refresh();
  }

  async function spin() {
    if (phase.name === "spinning") {
      return;
    }
    let res: Response;
    try {
      res = await fetch("/api/v1/egg-draws/claim", { method: "POST" });
    } catch {
      setPhase({ name: "rejected", message: "เครือข่ายมีปัญหา ลองใหม่" });
      return;
    }

    const body = (await res.json().catch(() => null)) as {
      success: boolean;
      data?: {
        eggType?: string;
        eggName?: string;
        duplicate?: boolean;
        expGranted?: number;
      };
      error?: { message?: string };
    } | null;

    if (!res.ok || !body?.success) {
      setPhase({
        name: "rejected",
        message: body?.error?.message ?? "สุ่มไม่สำเร็จ",
      });
      return;
    }

    const result: SpinResult = {
      eggType: body.data?.eggType ?? "mystery",
      eggName: body.data?.eggName ?? "ไข่",
      duplicate: body.data?.duplicate ?? false,
      expGranted: body.data?.expGranted ?? 0,
    };

    // ผู้ใช้ตั้งลด motion → ข้าม animation โชว์ผลเลย.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finish(result);
      return;
    }

    const strip = buildSpinStrip(result.eggType, spinTypes);
    const viewportWidth = viewportRef.current?.clientWidth ?? 320;
    const offset = spinOffsetPx(
      strip.winIndex,
      CELL_WIDTH,
      viewportWidth,
      strip.jitter
    );
    setPhase({ name: "spinning", strip, offset, result });
    // กัน onTransitionEnd หลุด (tab แอบ, browser เก่า) — ครบเวลาบังคับจบ.
    timeoutRef.current = setTimeout(() => finish(result), SPIN_MS + 500);
  }

  if (phase.name === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
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
        <img
          src={avatarForEgg(phase.eggType, 0)}
          alt={phase.eggName}
          width={96}
          height={96}
          className="mx-auto h-24 w-24 object-contain"
        />
        <p className="mt-2 text-base font-semibold text-zinc-900">
          {phase.duplicate
            ? `ได้${phase.eggName}ซ้ำ! แปลงเป็น +${phase.expGranted} EXP แล้ว`
            : `ยินดีด้วย! ได้${phase.eggName}`}
        </p>
        <p className="mt-1 text-sm text-zinc-500">ดูได้ในกระเป๋าสัตว์เลี้ยง</p>
      </div>
    );
  }

  if (phase.name === "spinning") {
    const { strip, offset, result } = phase;
    return (
      <div className="flex flex-col gap-2">
        <div
          ref={viewportRef}
          className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white py-4"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-[#F5B301]"
          />
          <SpinTrack
            strip={strip}
            offset={offset}
            onDone={() => finish(result)}
          />
        </div>
        <p aria-live="polite" className="text-center text-sm text-zinc-500">
          กำลังสุ่ม…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void spin()}
        disabled={!canClaim}
        className="min-h-[52px] rounded-2xl bg-[#18A659] px-4 py-3 text-base font-semibold text-white transition-colors active:bg-[#128A48] disabled:opacity-40"
      >
        กดสุ่มไข่เลย
      </button>
      {phase.name === "rejected" && (
        <p role="alert" className="text-center text-sm text-zinc-500">
          {phase.message}
        </p>
      )}
    </div>
  );
}

/**
 * รางแถบวิ่ง — เริ่มที่ offset 0 เฟรมถัดไปค่อยวิ่ง (ไม่นั้น transition
 * ไม่ทำงาน) จบ transition เรียก onDone.
 */
function SpinTrack({
  strip,
  offset,
  onDone,
}: {
  strip: SpinStrip;
  offset: number;
  onDone: () => void;
}) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setStarted(true))
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      onTransitionEnd={onDone}
      className="flex w-max touch-none"
      style={{
        transform: started ? `translateX(${-offset}px)` : "translateX(0px)",
        transition: started
          ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.08, 1)`
          : undefined,
      }}
    >
      {strip.cells.map((cell, i) => (
        <div key={i} className="flex w-28 shrink-0 flex-col items-center px-2">
          <img
            src={avatarForEgg(cell.eggType, cell.level)}
            alt=""
            width={72}
            height={72}
            draggable={false}
            className="h-[72px] w-[72px] object-contain"
          />
        </div>
      ))}
    </div>
  );
}
