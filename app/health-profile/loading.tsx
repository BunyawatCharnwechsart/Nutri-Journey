export default function HealthProfileLoading() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="h-28 w-28 animate-pulse rounded-full bg-zinc-200" />
          <div className="h-9 w-40 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="h-5 w-20 animate-pulse rounded bg-zinc-200" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 animate-pulse rounded-xl bg-zinc-200" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-200" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-200" />
            </div>
          </div>
          <div className="h-12 animate-pulse rounded-xl bg-zinc-200" />
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-xl bg-zinc-200" />
            <div className="h-20 animate-pulse rounded-xl bg-zinc-200" />
          </div>
          <div className="h-20 animate-pulse rounded-xl bg-zinc-200" />
        </div>
        <div className="h-12 animate-pulse rounded-full bg-zinc-200" />
      </div>
    </main>
  );
}