import type { Metadata } from "next";
import Link from "next/link";
import LineLoginButton from "@/components/LineLoginButton";

export const metadata: Metadata = {
  title: "Nutri Journey - แอปติดตาม Intermittent Fasting",
  description:
    "Nutri Journey แอปติดตามการทำ Intermittent Fasting และสุขภาพของคุณในที่เดียว จับเวลา ดูสถิติ และติดตามผลลัพธ์",
};

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: "\u23F1\uFE0F",
    title: "จับเวลา IF",
    description: "ตั้งและจับเวลาช่วงอดอาหารได้ง่ายๆ พร้อมแจ้งเตือนเมื่อถึงเวลา",
  },
  {
    icon: "\uD83D\uDCC5",
    title: "ปฏิทิน",
    description: "ดูประวัติการทำ IF แบบ Calendar เห็นภาพรวมทั้งเดือนในที่เดียว",
  },
  {
    icon: "\uD83D\uDCCA",
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
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18A659] text-3xl font-bold text-white">
            NJ
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Nutri Journey
          </h1>
          <p className="max-w-xs text-sm leading-6 text-zinc-600">
            ติดตามการทำ Intermittent Fasting และสุขภาพของคุณในที่เดียว
          </p>
        </div>

        <LineLoginButton />
      </section>

      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-xl font-bold text-zinc-900">
            ฟีเจอร์หลัก
          </h2>
          <p className="mb-10 text-center text-sm text-zinc-500">
            ทุกสิ่งที่คุณต้องการสำหรับการทำ IF ในที่เดียว
          </p>
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-zinc-200 bg-white p-5"
              >
                <div className="mb-3 text-2xl">{feature.icon}</div>
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
            <Link href="/privacy" className="text-[#18A659] hover:underline">
              นโยบายความเป็นส่วนตัว
            </Link>
            <Link href="/terms" className="text-[#18A659] hover:underline">
              ข้อตกลงการใช้งาน
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
