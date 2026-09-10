import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import EggAvatarCard from "@/components/EggAvatarCard";
import {
  DEFAULT_AVATAR_NAME,
  MISSION_CODES,
  avatarForLevel,
  expForNextLevel,
  expInLevel,
  levelFromPoints,
  progressRatio,
  type MissionCode,
} from "@/lib/healthy-journey";
import { createServiceClient } from "@/lib/supabase/service";
import { getICTDayBounds } from "@/lib/timezone";

export const dynamic = "force-dynamic";

interface MissionRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  points: number | null;
  is_daily: boolean;
}

export default async function MyEggPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();

  const [{ data: journey }, { data: missions }, { data: doneToday }] =
    await Promise.all([
      supabase
        .from("healthy_journey")
        .select("total_points, avatar_name")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("missions")
        .select("id, code, title, description, points, is_daily"),
      supabase
        .from("user_missions")
        .select("mission_id")
        .eq("user_id", userId)
        .eq("is_completed", true)
        .gte("completed_at", getICTDayBounds(new Date()).startIso)
        .lt("completed_at", getICTDayBounds(new Date()).endIso),
    ]);

  const missionRows = (missions ?? []) as MissionRow[];
  // Keep the fixed spec order: เริ่ม IF → อดครบ → บันทึกความรู้สึก → ดูสถิติ.
  const codeOrder = MISSION_CODES as readonly (MissionCode | string)[];
  const ordered = [...missionRows].sort((a, b) => {
    const ia = codeOrder.indexOf(a.code);
    const ib = codeOrder.indexOf(b.code);
    const rank = (i: number) => (i === -1 ? codeOrder.length : i);
    return rank(ia) - rank(ib);
  });

  const totalPoints = Number(journey?.total_points ?? 0);
  const level = levelFromPoints(totalPoints);
  const needNext = expForNextLevel(level);
  const fillPercent = Math.round(progressRatio(totalPoints) * 100);

  const doneMissionIds = new Set((doneToday ?? []).map((row) => row.mission_id));
  const doneCount = ordered.filter((mission) => doneMissionIds.has(mission.id)).length;

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            ไข่ของคุณ
          </h1>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-end justify-between gap-4">
            <p className="text-xl font-bold text-zinc-900">เลเวล {level}</p>
            <p className="text-sm text-zinc-500">
              {expInLevel(totalPoints)} / {needNext ?? "MAX"} exp
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={fillPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="ความคืบหน้าเลเวล"
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-[#18A659] transition-all"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </section>

        <EggAvatarCard
          avatarSrc={avatarForLevel(level)}
          name={journey?.avatar_name ?? DEFAULT_AVATAR_NAME}
          level={level}
        />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-semibold text-zinc-900">
              ภารกิจประจำวัน
            </h2>
            <p className="text-sm text-zinc-500">
              ทำสำเร็จแล้ว {doneCount}/{ordered.length}
            </p>
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {ordered.map((mission, index) => {
              const done = doneMissionIds.has(mission.id);
              return (
                <article
                  key={mission.id}
                  className={`flex items-center justify-between gap-3 p-4 ${
                    index > 0 ? "border-t border-zinc-100" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-zinc-900">
                      {mission.title}
                    </h3>
                    {mission.description && (
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {mission.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
                      +{mission.points ?? 50} exp
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        done ? "bg-[#18A659]" : "bg-zinc-200"
                      }`}
                    >
                      {done && (
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M4 10.5l4 4 8-9" />
                        </svg>
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}