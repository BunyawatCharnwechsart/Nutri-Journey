import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import IfTracker from "@/components/IfTracker";

export const dynamic = "force-dynamic";

export default async function IfPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <IfTracker />
      </div>
    </main>
  );
}