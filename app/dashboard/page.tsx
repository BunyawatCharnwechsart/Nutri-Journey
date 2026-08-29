import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import BellButton from "@/components/BellButton";
import EggIconLink from "@/components/EggIconLink";
import GoogleHealthSection from "@/components/GoogleHealthSection";

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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Dashboard
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[#18A659]">
            <BellButton />
            <EggIconLink />
          </div>
        </header>
        <GoogleHealthSection />
      </div>
    </main>
  );
}