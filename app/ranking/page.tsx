import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { getLeaderboard } from "@/lib/ranking-service";
import BackButton from "@/components/BackButton";
import RankingList from "@/components/RankingList";

export const dynamic = "force-dynamic";

/** หน้าแรกโชว์ top-10 ปุ่มดูเพิ่มเติมต่อทีละ 10 (ต้องตรงกับที่ใช้ใน RankingList). */
const PAGE_SIZE = 10;

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

  const { entries, myRank, myPoints, myAvatarUrl, total } = await getLeaderboard(
    userId,
    PAGE_SIZE,
    0
  );

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <div className="relative flex items-center justify-center">
            <div className="absolute left-0">
              <BackButton fallback="/my-egg" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              อันดับ EXP
            </h1>
          </div>
          <p className="mt-1 text-center text-sm text-zinc-500">
            สะสม EXP จากภารกิจเพื่อไต่อันดับ
          </p>
        </header>

        <RankingList
          initialEntries={entries}
          total={total}
          myRank={myRank}
          myPoints={myPoints}
          myAvatarUrl={myAvatarUrl}
          pageSize={PAGE_SIZE}
        />
      </div>
    </main>
  );
}
