import Link from "next/link";
import { endOfDay, startOfDay } from "date-fns";

import { createServiceClient } from "@/lib/supabase/service";
import { formatMinutes, getIfPattern } from "@/lib/if";

/**
 * Renders the "today" card + lifetime stats for the dashboard.
 *
 * It is a separate async server component so the page can stream it inside
 * <Suspense>: the header renders first, then this section fills in. The three
 * Supabase queries run in parallel (Promise.all) instead of one-after-another,
 * and the lifetime totals come from a Postgres aggregate RPC rather than
 * downloading every completed session row.
 */
export default async function DashboardStats({ userId }: { userId: string }) {
  const supabase = createServiceClient();

  const [statsResult, activeResult, todayResult] = await Promise.all([
    supabase.rpc("get_if_session_stats", { p_user_id: userId }),
    supabase
      .from("if_sessions")
      .select("id, fasting_start_time, if_pattern")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("fasting_start_time", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("if_sessions")
      .select("fasting_start_time, fasting_duration_minutes, if_pattern")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("fasting_start_time", startOfDay(new Date()).toISOString())
      .lte("fasting_start_time", endOfDay(new Date()).toISOString())
      .order("fasting_start_time", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const sessionCount = Number(statsResult.data?.[0]?.session_count ?? 0);
  const totalMinutes = Number(statsResult.data?.[0]?.total_minutes ?? 0);
  const activeSession = activeResult.data ?? null;
  const todaySession = todayResult.data ?? null;

  const activePattern = activeSession
    ? getIfPattern(activeSession.if_pattern)
    : null;
  const todayPattern = todaySession ? getIfPattern(todaySession.if_pattern) : null;

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">สถานะ IF วันนี้</h2>
        {activeSession ? (
          <>
            <p className="text-sm text-zinc-500">
              กำลังอดอาหารอยู่ · รูปแบบ {activePattern?.label ?? "IF"}
            </p>
            <Link href="/if" className="text-sm font-medium text-[#18A659]">
              ไปที่ตัวจับเวลา →
            </Link>
          </>
        ) : todaySession ? (
          <>
            <p className="text-sm text-zinc-500">
              วันนี้ทำ IF ไปแล้ว{" "}
              {formatMinutes(todaySession.fasting_duration_minutes)} · รูปแบบ{" "}
              {todayPattern?.label ?? "IF"}
            </p>
            <Link href="/if" className="text-sm font-medium text-[#18A659]">
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
          <span className="text-2xl font-bold text-zinc-900">{sessionCount}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4">
          <span className="text-sm text-zinc-500">ชั่วโมงสะสม</span>
          <span className="text-2xl font-bold text-zinc-900">
            {formatMinutes(totalMinutes)}
          </span>
        </div>
      </div>
    </section>
  );
}