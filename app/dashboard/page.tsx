import { redirect } from "next/navigation";
import Image from "next/image";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("*")
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
              <p className="text-sm text-zinc-500">
                สวัสดี
              </p>
              <h1 className="text-xl font-bold text-zinc-900">
                {displayName}
              </h1>
            </div>
          </div>
          <LogoutButton />
        </header>

        <section className="grid gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-5 border-zinc-200">
            <h2 className="text-base font-semibold text-zinc-900">
              สถานะ IF วันนี้
            </h2>
            <p className="text-sm text-zinc-500">
              ยังไม่มีเซสชัน เริ่มติดตามการอดอาหารของคุณได้เลย
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "IF ครั้งที่ทำ", value: "0" },
              { label: "ชั่วโมงสะสม", value: "0 ชม." },
              { label: "ระดับ", value: "1" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-1 rounded-2xl border border-zinc-200 p-4 border-zinc-200"
              >
                <span className="text-sm text-zinc-500">
                  {stat.label}
                </span>
                <span className="text-2xl font-bold text-zinc-900">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
