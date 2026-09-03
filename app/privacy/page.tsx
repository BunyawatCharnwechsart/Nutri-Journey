import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nutri-journey-hazel.vercel.app";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว - Nutri Journey",
  description: "นโยบายความเป็นส่วนตัวของแอปพลิเคชัน Nutri Journey",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">นโยบายความเป็นส่วนตัว</h1>
      <p className="mb-8 text-sm text-zinc-500">อัปเดตล่าสุด: 27 สิงหาคม 2569</p>

      <div className="space-y-8 text-[15px] leading-7 text-zinc-700">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">1. บทนำ</h2>
          <p>
            Nutri Journey (&ldquo;แอปพลิเคชัน&rdquo;) ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งาน
            นโยบายฉบับนี้อธิบายว่าเราเก็บ ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณอย่างไร
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">2. ข้อมูลที่เราเก็บรวบรวม</h2>
          <p className="mb-2">เราเก็บข้อมูลประเภทต่างๆ ดังนี้:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong>ข้อมูลบัญชี LINE:</strong> LINE User ID, ชื่อที่แสดง (Display Name), และรูปโปรไฟล์
              เพื่อใช้สำหรับการเข้าสู่ระบบและแสดงผลในแอป
            </li>
            <li>
              <strong>ข้อมูลสุขภาพ:</strong> น้ำหนัก, ช่วงเวลาอดอาหาร (IF Sessions),
              เป้าหมายน้ำหนัก, และข้อมูลสุขภาพประจำวัน
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">3. วัตถุประสงค์การใช้ข้อมูล</h2>
          <p className="mb-2">เราใช้ข้อมูลของคุณเพื่อ:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>ให้บริการติดตามการทำ Intermittent Fasting และสุขภาพ</li>
            <li>แสดงผลสถิติและปฏิทินการทำ IF</li>
            <li>พัฒนาและปรับปรุงประสบการณ์การใช้งาน</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">4. การแบ่งปันข้อมูล</h2>
          <p>
            เรา<strong>ไม่จำหน่าย</strong>และ<strong>ไม่แบ่งปัน</strong>ข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สาม
            ยกเว้นกรณีที่จำเป็นตามกฎหมาย หรือได้รับความยินยอมจากคุณ
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">5. การเก็บรักษาข้อมูล</h2>
          <p>
            ข้อมูลของคุณจะถูกเก็บรักษาไว้ตราบเท่าที่คุณยังมีบัญชีอยู่ในระบบ
            หากคุณลบบัญชี ข้อมูลทั้งหมดจะถูกลบอย่างถาวรภายใน 30 วัน
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">6. สิทธิของผู้ใช้</h2>
          <p className="mb-2">คุณมีสิทธิ์ในการ:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>เข้าถึงและดาวน์โหลดข้อมูลของคุณ</li>
            <li>แก้ไขข้อมูลส่วนบุคคลของคุณ</li>
            <li>ลบบัญชีและข้อมูลของคุณ</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">7. ความปลอดภัย</h2>
          <p>
            เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม รวมถึงการเข้ารหัสข้อมูลในระหว่างการส่งผ่าน
            (HTTPS) และการจัดเก็บข้อมูลที่เข้ารหัสบนเซิร์ฟเวอร์ที่ปลอดภัย
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">8. การติดต่อ</h2>
          <p>
            หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว กรุณาติดต่อเราผ่าน LINE Official Account ของ Nutri Journey
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-400">
        <Link href="/" className="text-[#18A659] hover:underline">
          กลับสู่หน้าหลัก
        </Link>
      </div>
    </main>
  );
}
