export default function IfLoading() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div aria-hidden="true" />
          <div className="h-7 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="flex justify-end">
            <div className="h-[30px] w-[30px] animate-pulse rounded-full bg-zinc-200" />
          </div>
        </header>
        <div className="flex flex-col items-center gap-6">
          <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-zinc-200" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200" />
        </div>
      </div>
    </main>
  );
}