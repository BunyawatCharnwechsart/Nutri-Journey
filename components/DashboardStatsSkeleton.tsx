/**
 * Loading skeleton for DashboardStats. Matches the card layout so the page
 * does not jump when the real stats stream in.
 */
export default function DashboardStatsSkeleton() {
  return (
    <section className="grid gap-4" aria-busy="true" aria-label="กำลังโหลดสถิติ">
      <div className="flex h-28 animate-pulse flex-col justify-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-100 p-5">
        <div className="h-4 w-28 rounded bg-zinc-200" />
        <div className="h-3 w-56 rounded bg-zinc-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
        <div className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
      </div>
    </section>
  );
}