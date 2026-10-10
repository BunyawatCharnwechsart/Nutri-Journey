import Link from "next/link";

import type { RankingEntry } from "@/lib/ranking-service";
import RankingPodium from "@/components/RankingPodium";

interface MiniRankingProps {
  entries: RankingEntry[];
  myRank: number | null;
  myPoints: number;
}

/**
 * ตารางอันดับย่อท้ายหน้า egg: โพเดียม top-3 + แถบอันดับของฉัน
 * (ซ่อนแถบถ้ายังไม่มีแต้ม) + ลิงก์ดูเพิ่มเติมไป /ranking.
 * ข้อมูลมาจาก page (ดึง top-3 ฝั่ง server ครั้งเดียวกับอย่างอื่น).
 */
export default function MiniRanking({ entries, myRank, myPoints }: MiniRankingProps) {
  return (
    <section aria-label="ตารางอันดับ" className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold text-zinc-900">ตารางอันดับ</h2>
        <Link
          href="/ranking"
          className="text-sm font-medium text-[#18A659] transition-opacity hover:opacity-70"
        >
          ดูเพิ่มเติม &gt;&gt;
        </Link>
      </div>

      {entries.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-2 py-2">
          <RankingPodium entries={entries} />
          {myRank !== null && (
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-[#E8F5EC] p-3">
              <span className="w-6 shrink-0 text-center text-base font-bold text-[#128A48]">
                {myRank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
                คุณ
              </span>
              <span className="shrink-0 text-sm text-zinc-600">
                {myPoints} exp
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
          ยังไม่มีผู้ติดอันดับ
        </p>
      )}
    </section>
  );
}
