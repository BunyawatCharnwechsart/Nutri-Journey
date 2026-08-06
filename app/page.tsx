import LineLoginButton from "@/components/LineLoginButton";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06C755] text-3xl font-bold text-white">
          NJ
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nutri Journey
        </h1>
        <p className="max-w-xs text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          ติดตามการทำ Intermittent Fasting และสุขภาพของคุณในที่เดียว
        </p>
      </div>

      <LineLoginButton />
    </main>
  );
}
