import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import IfTracker from "@/components/IfTracker";
import EggIconLink from "@/components/EggIconLink";

export const dynamic = "force-dynamic";

export default async function IfPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div aria-hidden="true" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              IF Tracker
            </h1>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              เลือกการทำ IF ที่เหมาะกับคุณ
            </p>
          </div>
          <div className="flex justify-end">
            <EggIconLink />
          </div>
        </header>
        <IfTracker />
      </div>
    </main>
  );
}