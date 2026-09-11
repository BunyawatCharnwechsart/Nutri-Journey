import { redirect } from "next/navigation";
import Link from "next/link";

import { getSessionUserId } from "@/lib/auth";
import BellButton from "@/components/BellButton";
import EggIconLink from "@/components/EggIconLink";
import EggLevelCard from "@/components/EggLevelCard";
import IfTracker from "@/components/IfTracker";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();
  const { data: journey } = await supabase
    .from("healthy_journey")
    .select("total_points")
    .eq("user_id", userId)
    .maybeSingle();

  const totalPoints = Number(journey?.total_points ?? 0);

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Dashboard
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[#18A659]">
            <BellButton />
            <EggIconLink />
          </div>
        </header>
        <IfTracker allowEditTime={false} />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-semibold text-zinc-900">
              ไข่ของฉัน
            </h2>
            <Link
              href="/my-egg"
              className="text-sm font-medium text-[#18A659] transition-opacity hover:opacity-70"
            >
              ดูทั้งหมด &gt;&gt;
            </Link>
          </div>
          <EggLevelCard totalPoints={totalPoints} />
        </section>
      </div>
    </main>
  );
}