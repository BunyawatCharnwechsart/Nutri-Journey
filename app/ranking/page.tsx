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
    <main className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#DFF0E4] via-[#F4FAF6] to-white px-6 pt-6 pb-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-5 h-32 w-9 bg-gradient-to-b from-[#18A659] to-[#18A659]/5 [clip-path:polygon(0_0,100%_0,100%_100%,50%_84%,0_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-5 h-32 w-9 bg-gradient-to-b from-[#18A659] to-[#18A659]/5 [clip-path:polygon(0_0,100%_0,100%_100%,50%_84%,0_100%)]"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <div className="relative flex items-center justify-center">
            <div className="absolute left-0">
              <BackButton fallback="/my-egg" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              ตารางอันดับ
            </h1>
          </div>
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
