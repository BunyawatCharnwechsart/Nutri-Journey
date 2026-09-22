import type { Metadata } from "next";
import Link from "next/link";
import LineLoginButton from "@/components/LineLoginButton";

export const metadata: Metadata = {
  title: "Nutri Journey - แอปติดตาม Intermittent Fasting",
  description:
    "Nutri Journey แอปติดตามการทำ Intermittent Fasting และสุขภาพของคุณในที่เดียว จับเวลา ดูสถิติ และติดตามผลลัพธ์",
};

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="10" x2="14" y1="2" y2="2" />
        <line x1="12" x2="15" y1="14" y2="11" />
        <circle cx="12" cy="14" r="8" />
      </svg>
    ),
    title: "จับเวลา IF",
    description: "ตั้งและจับเวลาช่วงอดอาหารได้ง่ายๆ พร้อมแจ้งเตือนเมื่อถึงเวลา",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "ปฏิทิน",
    description: "ดูประวัติการทำ IF แบบ Calendar เห็นภาพรวมทั้งเดือนในที่เดียว",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
    title: "สถิติ",
    description: "วิเคราะห์ผลลัพธ์ ดูกราฟแนวโน้มน้ำหนัก และระยะเวลาอดอาหาร",
  },
];

interface Step {
  number: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: "สมัครผ่าน LINE",
    description: "เข้าสู่ระบบด้วยบัญชี LINE ของคุณ ไม่ต้องกรอกข้อมูลเพิ่ม",
  },
  {
    number: 2,
    title: "ตั้งเวลาอดอาหาร",
    description: "เลือกช่วงเวลา IF ที่เหมาะกับคุณ เช่น 16:8 หรือ 18:6",
  },
  {
    number: 3,
    title: "ดูสถิติและพัฒนา",
    description: "ติดตามผลลัพธ์ ดูกราฟแนวโน้ม และปรับปรุงอย่างต่อเนื่อง",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-4 mt-5">
          <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-sm font-medium text-[#16A34A]">
            ติดตามสุขภาพของคุณ
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900">
            Nutri Journey
          </h1>
          <h2 className="text-xl font-medium text-zinc-900">ติดตามการทำ</h2>
          <span className="text-4xl font-bold tracking-tight text-[#18A659]">
            Intermittent <br /> Fasting
          </span>
          <div className="bg-[#16A34A] h-1 w-10 rounded-2xl mt-3 mb-3"></div>
          <p className="text-sm leading-6 text-zinc-500">
            และสุขภาพของคุณในที่เดียว
            <br />
            พร้อมสถิติการทำ IF ของคุณ
          </p>
        </div>
        
        <LineLoginButton subtitle="ฟรี ไม่มีค่าใช้จ่าย" />
      </section>

      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-xl font-bold text-zinc-900">
            ฟีเจอร์เด่น
          </h2>
          <p className="mb-10 text-center text-sm text-zinc-500">
            ทุกสิ่งที่คุณต้องการสำหรับการทำ IF ในที่เดียว
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={`rounded-xl border border-zinc-200 bg-white p-5 ${
                  index === FEATURES.length - 1
                    ? "col-span-2 sm:col-span-1"
                    : ""
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-[#16A34A]">
                  {feature.icon}
                </div>
                <h3 className="mb-1 text-sm font-semibold text-zinc-900">
                  {feature.title}
                </h3>
                <p className="text-xs leading-5 text-zinc-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-xl font-bold text-zinc-900">
            วิธีใช้งาน
          </h2>
          <p className="mb-10 text-center text-sm text-zinc-500">
            เริ่มต้นง่ายๆ ใน 3 ขั้นตอน
          </p>
          <div className="flex flex-col gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#18A659] text-sm font-bold text-white">
                  {step.number}
                </div>
                <div className="pt-1">
                  <h3 className="mb-1 text-sm font-semibold text-zinc-900">
                    {step.title}
                  </h3>
                  <p className="text-xs leading-5 text-zinc-500">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50 px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-xl font-bold text-zinc-900">
            เกี่ยวกับ Nutri Journey
          </h2>
          <p className="mb-6 text-sm leading-6 text-zinc-600">
            Nutri Journey เป็นแอปพลิเคชันสำหรับติดตามการทำ Intermittent
            Fasting (IF) และสุขภาพโดยรวม ออกแบบมาให้ใช้งานง่ายบนมือถือ
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="rounded text-[#18A659] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18A659]"
            >
              นโยบายความเป็นส่วนตัว
            </Link>
            <Link
              href="/terms"
              className="rounded text-[#18A659] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18A659]"
            >
              ข้อตกลงการใช้งาน
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
