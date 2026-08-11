import Link from "next/link";

import LineLoginButton from "@/components/LineLoginButton";

export default function LoggedOutPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18A659] text-3xl font-bold text-white">
          NJ
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          ออกจากระบบแล้ว
        </h1>
        <p className="max-w-xs text-sm leading-6 text-zinc-600">
          คุณออกจากระบบเรียบร้อยแล้ว กดเข้าสู่ระบบอีกครั้งเพื่อใช้งานต่อ
        </p>
      </div>

      <LineLoginButton autoLogin={false} />

      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 underline-offset-4 hover:underline"
      >
        กลับไปหน้าแรก
      </Link>
    </main>
  );
}
