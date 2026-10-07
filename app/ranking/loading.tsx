/**
 * Skeleton ระหว่างเปิดหน้า /ranking (Next.js แสดงอัตโนมัติตอน Server
 * Component กำลังโหลด) — โครงเดียวกับหน้าจริงกันจอกระตุกตอนข้อมูลมา.
 */
export default function RankingLoading() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <div className="relative flex items-center justify-center">
            <div className="h-7 w-24 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="mx-auto mt-2 h-4 w-40 animate-pulse rounded bg-zinc-100" />
        </header>
        <div
          aria-hidden="true"
          className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-zinc-100 p-4 [&:not(:first-child)]:border-t"
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-100" />
              <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-100" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-4 w-2/3 rounded bg-zinc-100" />
                <div className="h-3 w-1/3 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
