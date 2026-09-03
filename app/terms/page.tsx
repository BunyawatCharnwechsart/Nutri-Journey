import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nutri-journey-hazel.vercel.app";

export const metadata: Metadata = {
  title: "ข้อตกลงการใช้งาน - Nutri Journey",
  description: "ข้อตกลงและเงื่อนไขการใช้งานแอปพลิเคชัน Nutri Journey",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">ข้อตกลงการใช้งาน</h1>
      <p className="mb-8 text-sm text-zinc-500">อัปเดตล่าสุด: 27 สิงหาคม 2569</p>

      <div className="space-y-8 text-[15px] leading-7 text-zinc-700">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">1. การยอมรับข้อตกลง</h2>
          <p>
            การเข้าถึงและใช้งาน Nutri Journey (&ldquo;แอปพลิเคชัน&rdquo;) ถือว่าคุณยอมรับข้อตกลงและเงื่อนไขเหล่านี้
            หากคุณไม่ยอมรับ กรุณาหยุดใช้งานแอปพลิเคชัน
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">2. คำจำกัดความ</h2>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li><strong>ผู้ใช้</strong> หมายถึง บุคคลที่เข้าถึงและใช้งานแอปพลิเคชัน</li>
            <li><strong>บริการ</strong> หมายถึง ฟีเจอร์ต่างๆ ของ Nutri Journey รวมถึงการติดตาม IF, ปฏิทิน, และสถิติ</li>
            <li><strong>ข้อมูลสุขภาพ</strong> หมายถึง น้ำหนัก, ช่วงเวลาอดอาหาร, และข้อมูลสุขภาพอื่นๆ</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">3. ข้อจำกัดความรับผิดชอบทางการแพทย์</h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-800">ข้อสำคัญ:</p>
            <p className="mt-1 text-amber-700">
              Nutri Journey เป็นเครื่องมือสำหรับ <strong>การติดตามเท่านั้น</strong> ไม่ใช่คำแนะนำทางการแพทย์
              ข้อมูลที่แสดงในแอปไม่ควรใช้ทดแทนคำปรึกษาจากแพทย์หรือผู้เชี่ยวชาญด้านสุขภาพ
              ควรปรึกษาแพทย์ก่อนเริ่มโปรแกรม Intermittent Fasting หรือเปลี่ยนแปลงพฤติกรรมการกิน
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">4. การใช้งานที่ยอมรับได้</h2>
          <p className="mb-2">คุณตกลงที่จะ:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>ใช้งานแอปพลิเคชันตามวัตถุประสงค์ที่ออกแบบไว้</li>
            <li>รักษาความปลอดภัยของบัญชีผู้ใช้ของคุณ</li>
            <li>ไม่ใช้งานแอปพลิเคชันในทางที่อาจก่อให้เกิดความเสียหายต่อผู้อื่น</li>
            <li>ไม่พยายามเข้าถึงระบบหรือข้อมูลของผู้ใช้อื่นโดยไม่ได้รับอนุญาต</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">5. การเชื่อมต่อบุคคลที่สาม</h2>
          <p>
            แอปพลิเคชันเชื่อมต่อกับ LINE Login
            การใช้งานบริการของบุคคลที่สามอยู่ภายใต้ข้อตกลงของบริการนั้นๆ
            เราไม่รับผิดชอบต่อความเสียหายที่เกิดจากบริการของบุคคลที่สาม
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">6. การระงับบัญชี</h2>
          <p>
            เราสงวนสิทธิ์ในการระงับหรือลบบัญชีของคุณหากพบว่ามีการใช้งานที่ละเมิดข้อตกลงเหล่านี้
            หรือก่อให้เกิดความเสียหายต่อแอปพลิเคชันหรือผู้ใช้อื่น
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">7. การเปลี่ยนแปลงข้อตกลง</h2>
          <p>
            เราอาจอัปเดตข้อตกลงการใช้งานเป็นครั้งคราว
            การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนแอปพลิเคชัน
            การใช้งานต่อเนื่องหลังการเปลี่ยนแปลงถือว่าคุณยอมรับข้อตกลงใหม่
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">8. การติดต่อ</h2>
          <p>
            หากคุณมีคำถามเกี่ยวกับข้อตกลงการใช้งาน กรุณาติดต่อเราผ่าน LINE Official Account ของ Nutri Journey
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
