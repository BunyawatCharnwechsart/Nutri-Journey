export default function DashboardLoading() {
  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-zinc-200" />
            <div className="flex flex-col gap-2">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
              <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 animate-pulse rounded-full bg-zinc-200" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200" />
          </div>
        </header>
        <div className="flex flex-col gap-4">
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
            <div className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
          </div>
        </div>
      </div>
    </main>
  );
}