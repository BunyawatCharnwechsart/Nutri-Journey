export default function PagePlaceholder({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          {action}
        </header>
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-zinc-900">
            ฟีเจอร์นี้อยู่ระหว่างพัฒนา
          </p>
          <p className="text-sm text-zinc-500">เร็วๆ นี้</p>
        </div>
      </div>
    </main>
  );
}