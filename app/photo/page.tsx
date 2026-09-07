import EggIconLink from "@/components/EggIconLink";
import PhotoIcon from "@/components/PhotoIcon";

export const dynamic = "force-dynamic";

export default function PhotoPage() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              รูปภาพ
            </h1>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              ภาพถ่ายความคืบหน้า
            </p>
          </div>
          <EggIconLink />
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-200 px-6 py-14 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <PhotoIcon className="h-8 w-8 text-zinc-400" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                ยังไม่มีรูปถ่ายความคืบหน้า
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                ภาพถ่ายความคืบหน้าของคุณจะปรากฏที่นี่
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}