import { Suspense } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import LogoutButton from "@/components/LogoutButton";
import EggIconLink from "@/components/EggIconLink";
import DashboardStats from "@/components/DashboardStats";
import DashboardStatsSkeleton from "@/components/DashboardStatsSkeleton";

export const dynamic = "force-dynamic";

const COMING_SOON_FEATURES = [
  "สถิติการทำ IF แบบละเอียด",
  "เชื่อมต่อ Google Health API",
  "ระบบไข่และภารกิจ",
];

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  const displayName = user?.display_name ?? "นักเดินทางสุขภาพ";

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt="โปรไฟล์"
                width={48}
                height={48}
                className="rounded-full"
                priority
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#18A659] text-lg font-bold text-white">
                NJ
              </div>
            )}
            <div>
              <p className="text-sm text-zinc-500">สวัสดี</p>
              <h1 className="text-xl font-bold text-zinc-900">{displayName}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LogoutButton />
            <EggIconLink />
          </div>
        </header>

        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats userId={userId} />
        </Suspense>

        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-900">กำลังพัฒนา</h2>
            <span className="shrink-0 rounded-full bg-[#FFAE00]/15 px-3 py-1 text-xs font-medium text-[#B07C00]">
              เร็วๆ นี้
            </span>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-zinc-500">
            {COMING_SOON_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#18A659]" />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}