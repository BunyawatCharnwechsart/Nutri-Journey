"use client";

import { useEffect, useState } from "react";

import {
  formatResetDate,
  formatSeasonCountdown,
} from "@/lib/season";

/**
 * แถบนับถอยหลังจบ season (หน้า /ranking) — server คำนวณ seasonKey/endsAt
 * มาให้แล้ว ฝั่ง client แค่อัปเดตตัวเลขทุกวินาที.
 */
export default function SeasonCountdown({
  seasonKey,
  endsAtIso,
}: {
  seasonKey: string;
  endsAtIso: string;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const endsMs = new Date(endsAtIso).getTime();
  const expired = nowMs >= endsMs;

  return (
    <section
      aria-label="เวลานับถอยหลังจบ season"
      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#F5B301]/40 bg-[#FFFDF3] px-4 py-3"
    >
      <p className="text-sm font-semibold text-zinc-900">
        Season {seasonKey}
        <span className="ml-2 text-xs font-normal text-zinc-500">
          รีเซ็ต {formatResetDate(endsAtIso)}
        </span>
      </p>
      {expired ? (
        <p className="text-sm font-medium text-[#B7791F]">
          กำลังเริ่ม season ใหม่…
        </p>
      ) : (
        <p
          className="text-sm font-bold tabular-nums text-[#B7791F]"
          aria-live="off"
        >
          เหลืออีก {formatSeasonCountdown(endsMs - nowMs)}
        </p>
      )}
    </section>
  );
}
