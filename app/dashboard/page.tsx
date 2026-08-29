import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import EggIconLink from "@/components/EggIconLink";
import GoogleHealthSection from "@/components/GoogleHealthSection";
import LineNotificationSection from "@/components/LineNotificationSection";
import LineStatusDot from "@/components/LineStatusDot";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Dashboard
              </h1>
              <LineStatusDot />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[#18A659]">
            <EggIconLink />
          </div>
        </header>
        <GoogleHealthSection />
        <LineNotificationSection />
      </div>
    </main>
  );
}