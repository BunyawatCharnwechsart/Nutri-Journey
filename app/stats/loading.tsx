export default function StatsLoading() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-28 animate-pulse rounded bg-zinc-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
          </div>
          <div className="h-[30px] w-[30px] animate-pulse rounded-full bg-zinc-200" />
        </header>

        <div className="h-10 animate-pulse rounded-2xl bg-zinc-200" />

        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-5 w-20 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="h-9 w-28 animate-pulse rounded-full bg-zinc-200" />
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 sm:h-72" />
        </section>
      </div>
    </main>
  );
}