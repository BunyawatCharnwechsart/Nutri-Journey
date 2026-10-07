import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { getLeaderboard } from "@/lib/ranking-service";
import RankingList from "@/components/RankingList";

export const dynamic = "force-dynamic";

/** ต้องตรงกับ limit หน้าแรกที่ส่งให้ RankingList (ปุ่มดูเพิ่มเติมต่อ offset จากตรงนี้). */
const PAGE_SIZE = 20;

/**
 * หน้า Ranking — โผ EXP รวมทั้งระบบ + อันดับของตัวเอง.
 *
 * โหลดหน้าแรกฝั่ง server ตรงๆ (ไม่ยิง HTTP วนกลับ) ส่วนหน้าถัดไป
 * RankingList จะยิง /api/v1/ranking เอง. ไม่มี session เด้งกลับหน้าแรก.
 */
export default async function RankingPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const { entries, myRank, myPoints, total } = await getLeaderboard(
    userId,
    PAGE_SIZE,
    0
  );

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            อันดับ EXP
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            สะสม EXP จากภารกิจเพื่อไต่อันดับ
          </p>
        </header>

        <RankingList
          initialEntries={entries}
          total={total}
          myRank={myRank}
          myPoints={myPoints}
          pageSize={PAGE_SIZE}
        />
      </div>
    </main>
  );
}
