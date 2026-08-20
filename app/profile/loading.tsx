export default function ProfileLoading() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-44 animate-pulse rounded bg-zinc-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-zinc-200" />
          </div>
          <div className="h-[30px] w-[30px] animate-pulse rounded-full bg-zinc-200" />
        </header>
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
        <div className="flex flex-col gap-6">
          <div className="h-56 animate-pulse rounded-2xl bg-zinc-200" />
          <div className="h-44 animate-pulse rounded-2xl bg-zinc-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-200" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-10 animate-pulse rounded-full bg-zinc-200" />
          <div className="h-10 animate-pulse rounded-full bg-zinc-200" />
        </div>
      </div>
    </main>
  );
}