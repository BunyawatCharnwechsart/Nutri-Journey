import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { startOfDay, endOfDay } from "date-fns";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { formatMinutes, getIfPattern } from "@/lib/if";
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

  // Aggregate stats across completed sessions (active ones are not counted).
  const { data: completed } = await supabase
    .from("if_sessions")
    .select("duration_minutes")
    .eq("user_id", userId)
    .eq("status", "completed");

  const sessionCount = completed?.length ?? 0;
  const totalMinutes =
    completed?.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) ?? 0;

  // Active session (for the "today" card).
  const { data: activeSession } = await supabase
    .from("if_sessions")
    .select("id, start_time, if_pattern")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Today's latest completed session.
  const { data: todaySession } = await supabase
    .from("if_sessions")
    .select("start_time, duration_minutes, if_pattern")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("start_time", startOfDay(new Date()).toISOString())
    .lte("start_time", endOfDay(new Date()).toISOString())
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  const displayName = user?.display_name ?? "นักเดินทางสุขภาพ";

  const activePattern = activeSession
    ? getIfPattern(activeSession.if_pattern)
    : null;
  const todayPattern = todaySession ? getIfPattern(todaySession.if_pattern) : null;

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
              <h1 className="text-xl font-bold text-zinc-900">
                {displayName}
              </h1>
            </div>
          </div>
          <LogoutButton />
        </header>

        <section className="grid gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              สถานะ IF วันนี้
            </h2>
            {activeSession ? (
              <>
                <p className="text-sm text-zinc-500">
                  กำลังอดอาหารอยู่ · รูปแบบ{" "}
                  {activePattern?.label ?? "IF"}
                </p>
                <Link
                  href="/if"
                  className="text-sm font-medium text-[#18A659]"
                >
                  ไปที่ตัวจับเวลา →
                </Link>
              </>
            ) : todaySession ? (
              <>
                <p className="text-sm text-zinc-500">
                  วันนี้ทำ IF ไปแล้ว {formatMinutes(todaySession.duration_minutes)}{" "}
                  · รูปแบบ {todayPattern?.label ?? "IF"}
                </p>
                <Link
                  href="/if"
                  className="text-sm font-medium text-[#18A659]"
                >
                  เริ่ม Fasting ใหม่ →
                </Link>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                ยังไม่มีเซสชันวันนี้ เริ่มติดตามการอดอาหารของคุณได้เลย
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4">
              <span className="text-sm text-zinc-500">IF ครั้งที่ทำ</span>
              <span className="text-2xl font-bold text-zinc-900">
                {sessionCount}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4">
              <span className="text-sm text-zinc-500">ชั่วโมงสะสม</span>
              <span className="text-2xl font-bold text-zinc-900">
                {formatMinutes(totalMinutes)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}