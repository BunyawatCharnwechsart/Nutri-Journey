# Software Design Specification (SDS)

## Nutri Journey

---

**ชื่อโครงการ :** แพลตฟอร์มอัจฉริยะเพื่อการติดตามสุขภาพและการทำ Intermittent Fasting

**ชื่อระบบ :** Nutri Journey

**ที่ปรึกษาโครงการ :** อาจารย์ชลติพันธ์ เปล่งวิทยา

**ผู้จัดทำ :**
1. 67022669 นายบุณยวัจน์ ชาญเวชศาสตร์
2. 67027136 นายกุลพัทธ์ สร้อยเสพ
3. 67022760 นางสาวภัทรพร ตั้งแต่ง

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์ของเอกสาร
เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายการออกแบบเชิงเทคนิคของระบบ Nutri Journey ซึ่งเป็น LINE Mini App สำหรับติดตามสุขภาพ โดยครอบคลุมสถาปัตยกรรมของระบบ โครงสร้างฐานข้อมูล การออกแบบส่วนติดต่อ ขั้นตอนการทำงานของแต่ละฟีเจอร์ และการเชื่อมต่อกับบริการภายนอก เพื่อใช้เป็นแนวทางในการพัฒนาและทดสอบระบบให้เป็นไปในทิศทางเดียวกัน

### 1.2 ขอบเขตของระบบ
ระบบ Nutri Journey เป็นเว็บแอปพลิเคชัน (LINE Mini App) ที่ทำงานภายใน LINE Application ผ่าน LIFF สำหรับติดตามการทำ Intermittent Fasting (IF) รองรับการเข้าสู่ระบบผ่านบัญชี LINE และมีระบบกระตุ้นพฤติกรรม (Gamification) เพื่อเสริมแรงจูงใจให้ผู้ใช้งาน

ฟังก์ชันหลักของระบบ:
- ติดตามการทำ Intermittent Fasting (IF Tracker)
- ดูประวัติการทำ IF แบบปฏิทิน (IF Calendar)
- ตั้งเป้าหมายน้ำหนักและติดตามความคืบหน้า (Weight Goal)
- บันทึกน้ำหนักรายวัน (Weight Log)
- แสดงข้อมูลสรุปสุขภาพ (Health Dashboard)
- ระบบสะสมคะแนนและติดตามความก้าวหน้า (Healthy Journey)
- แจ้งเตือนผ่าน LINE Official Account

### 1.3 คำนิยามศัพท์

| คำศัพท์ | ความหมาย |
|---|---|
| IF | Intermittent Fasting การจำกัดช่วงเวลาการรับประทานอาหาร |
| LIFF | LINE Front-end Framework สำหรับสร้างเว็บแอปที่ทำงานภายใน LINE |
| OA | Official Account - บัญชีทางการของ LINE |
| SDS | System Design Specification |
| Supabase | บริการ backend-as-a-service ที่ใช้ PostgreSQL |
| BMI | Body Mass Index - ดัชนีมวลกาย คำนวณจากน้ำหนัก (กก.) หารด้วยส่วนสูง (ม.) ยกกำลังสอง |
| BMR | Basal Metabolic Rate - อัตราการเผาผลาญพลังงานขั้นพื้นฐานของร่างกายขณะพัก |
| IF Calendar | ปฏิทินแสดงประวัติการทำ IF รายเดือน (วันที่ทำสำเร็จ/ล้มเหลว/ไม่อด) |
| Weight Goal | เป้าหมายน้ำหนักที่ตั้งไว้ ภายในกรอบเวลา (สัปดาห์/เดือน) พร้อมติดตามความคืบหน้า |
| Weight Log | บันทึกน้ำหนักรายวันของผู้ใช้ |
| Health Dashboard | หน้าสรุปข้อมูลสุขภาพ |

### 1.4 เอกสารอ้างอิง
- LINE LIFF Documentation - https://developers.line.biz/en/docs/liff/
- LINE Messaging API Documentation - https://developers.line.biz/en/docs/messaging-api/
- Supabase Documentation - https://supabase.com/docs
- Next.js Documentation - https://nextjs.org/docs
- Project Proposal: Nutri Journey (ระบบติดตามสุขภาพและการทำ Intermittent Fasting)

---

## 2. ภาพรวมระบบ (System Overview)

### 2.1 เทคโนโลยีที่ใช้

| ส่วนงาน | เทคโนโลยี |
|---|---|
| Requirement | Miro, Google Form |
| UI/UX Design | Figma |
| Frontend / Backend | Next.js (React, TypeScript) |
| Login / Mini App | LINE LIFF |
| Database & Auth | Supabase (PostgreSQL) |
| ข้อมูลสุขภาพ | Supabase (Weight Logs) |
| การแจ้งเตือน | LINE Messaging API |
| Deploy | Vercel, GitHub |
| Testing | Postman, Playwright |

### 2.2 สถาปัตยกรรมระบบ (System Architecture)

ระบบ Nutri Journey มีสถาปัตยกรรมแบบ Client-Server โดยฝั่ง Client ทำงานบน LINE Mini App ผ่าน LIFF (เว็บแอปพลิเคชันที่ทำงานภายใน LINE Application) และฝั่ง Server ใช้ Next.js Framework ในการจัดการทั้ง Frontend และ Backend API Routes โดยมี Supabase เป็นฐานข้อมูลหลัก

```
┌─────────────────────────────┐
│      ผู้ใช้งาน (User)         │
│   Browser / LINE Application │
└──────────────┬───────────────┘
               │ HTTPS
┌──────────────▼───────────────┐
│     Next.js Application       │
│  (Frontend + API Routes /     │
│         Server)               │
└──────────┬──────────────┬─────┘
           │              │
┌──────────▼─────┐  ┌─────▼─────────┐
│   Supabase     │  │  LINE LIFF /   │
│  (DB/Auth/     │  │  LINE OA       │
│   Storage)     │  │  (Login/Notify)│
└──────────┬─────┘  └────────────────┘
```

- **Next.js** ทำหน้าที่เป็นทั้ง Frontend (แสดงผล UI) และ Backend (API Routes จัดการ Business Logic)
- **Supabase** ใช้เป็นฐานข้อมูลหลัก (PostgreSQL), ระบบ Authentication และ Storage
- **LINE LIFF / LINE Official Account** ใช้สำหรับ Login และส่งการแจ้งเตือน

### 2.3 แผนผังบริบทของระบบ (Context Diagram)

ผู้ใช้โต้ตอบกับระบบผ่าน LINE Application โดยมีช่องทางดังนี้
- ผ่าน LIFF App (หน้าเว็บแอปภายใน LINE) สำหรับฟังก์ชันหลักทั้งหมด
- ผ่าน LINE OA Chat สำหรับรับการแจ้งเตือนและข้อความจากระบบ

ระบบเชื่อมต่อกับบริการภายนอกดังนี้
- Supabase Database สำหรับจัดเก็บข้อมูล
- LINE Platform สำหรับ Login และส่งข้อความ

---

## 3. ความต้องการของระบบ (System Requirements)

### 3.1 Use Case Diagram (คำอธิบาย)

**Actor:** ผู้ใช้งาน (User)

| Use Case | คำอธิบาย |
|---|---|
| สมัครสมาชิก/เข้าสู่ระบบ | ผู้ใช้ลงทะเบียนหรือเข้าสู่ระบบผ่าน LINE Login |
| จัดการข้อมูลส่วนตัว | แก้ไขข้อมูล น้ำหนัก ส่วนสูง เป้าหมายสุขภาพ |
| คำนวณ BMI/BMR | คำนวณค่าดัชนีมวลกายและอัตราการเผาผลาญจากข้อมูลส่วนตัว |
| ตั้งเป้าหมายน้ำหนัก | ตั้งค่าน้ำหนักเป้าหมายและกรอบเวลา พร้อมติดตามความคืบหน้า |
| บันทึกน้ำหนักรายวัน | บันทึกและแก้ไขน้ำหนักประจำวันย้อนหลังได้ |
| เริ่ม/สิ้นสุด IF | ตั้งค่าและติดตามช่วงเวลาการทำ IF |
| ดู IF Calendar | ดูประวัติการทำ IF แบบปฏิทินรายเดือน |
| ดู Health Dashboard | ดูสรุปข้อมูลสุขภาพและสถานะ IF |
| เล่น Healthy Journey | ทำเควสและสะสมคะแนน |
| รับการแจ้งเตือน | รับแจ้งเตือนช่วง IF และกิจกรรมระบบผ่าน LINE |

### 3.2 Functional Requirements

**3.2.1 การเข้าสู่ระบบด้วย LINE Login**
- ผู้ใช้สามารถเข้าสู่ระบบโดยใช้บัญชี LINE ของตนเองผ่าน LIFF SDK
- ระบบจะขอสิทธิ์ (scope) ในการเข้าถึง profile ของผู้ใช้ (userId, displayName, profile picture)
- เมื่อเข้าสู่ระบบสำเร็จ ระบบจะบันทึก userId ในฐานข้อมูล Supabase
- ผู้ใช้ที่ไม่เคยเข้าใช้งานมาก่อนจะถูกสร้างบัญชีใหม่โดยอัตโนมัติ

**3.2.2 การติดตาม IF (IF Tracker)**
- ผู้ใช้สามารถตั้งค่าโปรไฟล์การทำ IF (รูปแบบการอด เช่น 16:8, 18:6)
- ระบบบันทึกเวลาเริ่มต้นและสิ้นสุดการอดอาหาร
- ระบบแสดงสถานะการอดแบบ real-time
- ระบบแสดงสถิติการทำ IF ย้อนหลัง

**3.2.3 การแสดงข้อมูลสุขภาพ (Health Dashboard)**
- ระบบแสดงสรุปข้อมูลสุขภาพ (สถิติการทำ IF)
- ระบบแสดงสถิติการทำ IF (จำนวนครั้ง, ชั่วโมงอดสะสม)
- ระบบแสดงข้อมูลเปรียบเทียบระหว่างวัน/สัปดาห์/เดือน

**3.2.4 Healthy Journey (Gamification)**
- ผู้ใช้สามารถทำภารกิจ (missions) เพื่อรับคะแนน
- ภารกิจ เช่น ทำ IF ครบตามกำหนด, เดินครบเป้าขั้นตอน, ดื่มน้ำครบตามเป้า
- ผู้ใช้สามารถดูระดับ (level) และความคืบหน้า
- ระบบแสดง badges หรือรางวัลเมื่อบรรลุเป้าหมาย

**3.2.5 การแจ้งเตือนผ่าน LINE OA**
- ระบบส่งการแจ้งเตือนสถานะการทำ IF (เริ่ม/สิ้นสุด/ใกล้ครบกำหนด)
- ระบบส่งสรุปประจำวัน (Daily Summary)

**3.2.6 การคำนวณ BMI และ BMR**
- ระบบคำนวณ BMI อัตโนมัติจากน้ำหนักและส่วนสูงของผู้ใช้ และแสดงหมวดหมู่ (น้ำหนักน้อย/ปกติ/เกิน/อ้วน)
- ระบบคำนวณ BMR ด้วยสูตร Mifflin-St Jeor จากเพศ อายุ น้ำหนัก และส่วนสูงของผู้ใช้
- ค่าที่คำนวณได้จะแสดงผลบนหน้า Dashboard และหน้า Profile

**3.2.7 การตั้งเป้าหมายน้ำหนัก (Weight Goal)**
- ผู้ใช้สามารถตั้งค่าน้ำหนักเป้าหมาย (target_weight) และวันครบกำหนด (target_date) ภายในสัปดาห์หรือเดือน
- ระบบติดตามความคืบหน้าโดยเปรียบเทียบน้ำหนักล่าสุดจาก Weight Log กับน้ำหนักเป้าหมาย
- ระบบแสดงผลความคืบหน้าเป็นเปอร์เซ็นต์และสถานะ (ถึงเป้า/ใกล้เป้า/ห่างเป้า) บนหน้า Dashboard

**3.2.8 บันทึกน้ำหนักรายวัน (Weight Log)**
- ผู้ใช้สามารถบันทึกน้ำหนักของแต่ละวันได้
- ผู้ใช้สามารถดูและแก้ไขบันทึกน้ำหนักย้อนหลังได้
- บันทึกน้ำหนักจะถูกนำไปใช้คำนวณ BMI, BMR และความคืบหน้าเป้าหมายน้ำหนัก

**3.2.9 ปฏิทินการทำ IF (IF Calendar)**
- ระบบแสดงปฏิทินรายเดือนของประวัติการทำ IF
- แต่ละวันแสดงสถานะการทำ IF เช่น สำเร็จ/ล้มเหลว/ไม่อด พร้อมจำนวนชั่วโมงที่ทำได้

### 3.3 Non-functional Requirements

**3.3.1 Performance (ประสิทธิภาพ)**
- หน้ายืนยันตัวตนและหน้า Dashboard ต้องโหลดภายใน 3 วินาที
- ระบบสามารถรองรับผู้ใช้พร้อมกันอย่างน้อย 100 คน

**3.3.2 Security (ความปลอดภัย)**
- ข้อมูลส่วนบุคคลและข้อมูลสุขภาพของผู้ใช้ต้องถูกจัดเก็บอย่างปลอดภัย
- การเชื่อมต่อทั้งหมดต้องใช้ HTTPS
- ใช้ LINE Login เป็นระบบยืนยันตัวตนหลัก โดยต้องตรวจสอบ Token ที่ Backend ทุกครั้ง
- ใช้ Row Level Security (RLS) กับทุกตาราง เพื่อให้ผู้ใช้เข้าถึงได้เฉพาะข้อมูลของตนเอง
- ข้อมูลสุขภาพต้องถูกส่งผ่าน API แบบเข้ารหัส

**3.3.3 Usability (การใช้งาน)**
- ส่วนติดต่อผู้ใช้ต้องใช้งานง่าย รองรับภาษาไทย และ Mobile Responsive
- ผู้ใช้สามารถเข้าถึงฟังก์ชันหลักได้ภายใน 2 คลิก
- ระบบต้องแสดงสถานะการทำงานและข้อผิดพลาดอย่างชัดเจน

**3.3.4 Reliability (ความน่าเชื่อถือ)**
- ระบบมีความพร้อมใช้งาน (uptime) อย่างน้อย 99%
- ระบบต้องสามารถกู้คืนข้อมูลได้หากเกิดข้อผิดพลาด
- ข้อมูลสุขภาพและบันทึก IF ต้องไม่สูญหายเมื่อเกิดข้อผิดพลาดในการเชื่อมต่อ

---

## 4. Workflow การทำงานของแต่ละฟีเจอร์ (Feature Workflows)

### 4.1 สมัครสมาชิก / เข้าสู่ระบบ (Authentication)
1. ผู้ใช้กดปุ่ม "เข้าสู่ระบบด้วย LINE"
2. ระบบเรียก LINE LIFF SDK เพื่อขอสิทธิ์ (Authorization)
3. LINE ส่ง Token กลับมายังระบบ
4. Next.js API Route ตรวจสอบ Token และสร้าง/ค้นหาผู้ใช้ในตาราง `users` ของ Supabase
5. หากเป็นผู้ใช้ใหม่ ระบบให้กรอกข้อมูลส่วนตัวเพิ่มเติม (น้ำหนัก ส่วนสูง เป้าหมาย)
6. สร้าง Session และนำผู้ใช้เข้าสู่หน้า Dashboard หลัก

### 4.2 การจัดการข้อมูลส่วนตัว (Profile Management)
1. ผู้ใช้เข้าหน้า "โปรไฟล์"
2. ระบบดึงข้อมูลปัจจุบันจากตาราง `profiles` มาแสดง
3. ผู้ใช้แก้ไขข้อมูล (น้ำหนัก ส่วนสูง เพศ วันเกิด เป้าหมาย รูปแบบ IF ที่ต้องการ)
4. กดบันทึก → ระบบอัปเดตข้อมูลผ่าน Supabase และคำนวณค่าที่เกี่ยวข้องใหม่ (เช่น BMI, BMR)
   - **BMI** = น้ำหนัก (กก.) / ส่วนสูง (ม.)²
   - **BMR** (Mifflin-St Jeor):
     - ชาย: 10×น้ำหนัก (กก.) + 6.25×ส่วนสูง (ซม.) − 5×อายุ (ปี) + 5
     - หญิง: 10×น้ำหนัก (กก.) + 6.25×ส่วนสูง (ซม.) − 5×อายุ (ปี) − 161
5. ผู้ใช้ตั้งค่าเป้าหมายน้ำหนัก (`target_weight`) และวันครบกำหนด (`target_date`) เพื่อติดตามการลด/เพิ่มน้ำหนัก
6. ผู้ใช้สามารถบันทึกน้ำหนักรายวันลงในตาราง `weight_logs` และแก้ไขย้อนหลังได้
7. ระบบแสดงผล BMI พร้อมหมวดหมู่ (น้ำหนักน้อย/ปกติ/เกิน/อ้วน) ค่า BMR และความคืบหน้าเป้าหมายน้ำหนักให้ผู้ใช้เห็น

### 4.3 เริ่ม/สิ้นสุดการทำ Intermittent Fasting (IF Tracker)
1. ผู้ใช้เลือกรูปแบบ IF (เช่น 16:8, 18:6) หรือกำหนดเอง
2. ผู้ใช้กด "เริ่ม Fasting" → ระบบบันทึกเวลาเริ่มต้นลงตาราง `if_sessions`
3. ระบบแสดง Timer นับถอยหลัง/นับเวลาที่ผ่านไปแบบ Real-time บนหน้าจอ
4. เมื่อครบกำหนดหรือผู้ใช้กด "สิ้นสุด Fasting" ระบบบันทึกเวลาสิ้นสุด และคำนวณระยะเวลาที่ทำได้จริง (duration_minutes)
5. ข้อมูลเซสชันจะถูกส่งไปแสดงผลรวมใน Health Dashboard และใช้ตรวจสอบภารกิจใน Healthy Journey

### 4.4 Health Dashboard
1. ระบบดึงข้อมูลจากตาราง `if_sessions` และ `profiles` มาประมวลผลรวม
2. คำนวณสรุปรายวัน/รายสัปดาห์ เช่น ระยะเวลา IF เฉลี่ย, ก้าวเดิน, ระยะทาง, แคลอรี่ที่เผาผลาญ, แนวโน้มน้ำหนัก
3. แสดงค่า BMI พร้อมหมวดหมู่ และค่า BMR ที่คำนวณจากข้อมูลโปรไฟล์
4. แสดงผลเป็นกราฟและการ์ดสรุป (Chart/Widget) บนหน้า Dashboard

### 4.5 Healthy Journey (ระบบเควสและคะแนน)
1. ระบบตรวจสอบพฤติกรรมผู้ใช้ (เช่น ทำ IF ครบตามเป้า, เดินครบเป้า) เทียบกับเงื่อนไขภารกิจในตาราง `missions`
2. เมื่อผู้ใช้ทำเงื่อนไขสำเร็จ ระบบเพิ่มคะแนน/รางวัลลงตาราง `healthy_journey`
3. หน้า Healthy Journey แสดงภารกิจที่ทำได้ ภารกิจที่ยังไม่สำเร็จ และคะแนนสะสมทั้งหมด
4. คะแนนสะสมอาจใช้แลกเป็น Badge หรือ Level เพื่อสร้างแรงจูงใจต่อเนื่อง

### 4.6 ระบบแจ้งเตือน (Notification)
1. ระบบมี Scheduler/Cron Job ตรวจสอบสถานะผู้ใช้ (เช่น ใกล้ครบเวลา Fasting)
2. เมื่อเข้าเงื่อนไข ระบบเรียก LINE Messaging API เพื่อส่งข้อความแจ้งเตือนผ่าน LINE Official Account
3. ผู้ใช้กดที่ข้อความแจ้งเตือนเพื่อเปิดกลับเข้าสู่ระบบ (Deep Link ผ่าน LIFF)

### 4.7 การตั้งเป้าหมายน้ำหนักและบันทึกน้ำหนักรายวัน (Weight Goal & Weight Log)
1. ผู้ใช้ตั้งเป้าหมายน้ำหนัก (`target_weight`) และวันครบกำหนด (`target_date`) ที่หน้า Profile
2. ผู้ใช้บันทึกน้ำหนักประจำวันลงตาราง `weight_logs` (สามารถแก้ไขย้อนหลังได้)
3. ระบบคำนวณความคืบหน้าโดยเปรียบเทียบน้ำหนักล่าสุดกับเป้าหมาย
4. ระบบแสดงผลความคืบหน้าเป็นเปอร์เซ็นต์และสถานะบนหน้า Dashboard และแจ้งเตือนเมื่อถึงเป้าหมาย

### 4.8 ปฏิทินการทำ IF (IF Calendar)
1. ผู้ใช้เข้าหน้า "IF Calendar"
2. ระบบดึงข้อมูลจากตาราง `if_sessions` ตามเดือนที่เลือก
3. ระบบประมวลผลสถานะของแต่ละวัน (สำเร็จ/ล้มเหลว/ไม่อด) พร้อมจำนวนชั่วโมงที่ทำได้
4. แสดงผลเป็นปฏิทินรายเดือนให้ผู้ใช้ดูประวัติย้อนหลัง

---

## 5. การออกแบบฐานข้อมูล (Database Design)

### 5.1 ตารางหลักในระบบ (Supabase / PostgreSQL)

**users**
- เก็บข้อมูลบัญชีผู้ใช้ระบบ
- ฟิลด์: user_id (UUID, PK), line_user_id (text, unique), display_name (text), avatar_url (text), email (text), created_at (timestamp)

**profiles**
- เก็บข้อมูลส่วนตัว/สุขภาพของผู้ใช้
- ฟิลด์: user_id (UUID, FK → users.user_id), weight (number), height (number), gender (text: male/female), birth_date (date), goal (text), if_pattern (text เช่น 16:8), target_weight (number), target_date (date)

**weight_logs**
- เก็บบันทึกน้ำหนักรายวันของผู้ใช้
- ฟิลด์: id (UUID, PK), user_id (UUID, FK → users.user_id), weight (number), logged_at (timestamp)

**if_sessions**
- เก็บข้อมูลการทำ IF ของผู้ใช้ ครอบคลุมทั้งช่วงกินและช่วงอดในรอบเดียว
- ฟิลด์: id (UUID, PK), user_id (UUID, FK → users.user_id), fasting_start_time (timestamp, จุดเริ่มอด), fasting_end_time (timestamp or null, จุดสิ้นสุดอด), fasting_duration_minutes (number, นาทีที่อดจริง), eating_start_time (timestamp or null, จุดเริ่มกิน), eating_end_time (timestamp or null, จุดสิ้นสุดกิน), eating_duration_minutes (number or null, นาทีที่กินจริง), status (text: active/completed), if_pattern (text เช่น 16:8), created_at (timestamp)

**healthy_journey**
- เก็บคะแนนและระดับของผู้ใช้
- ฟิลด์: id (UUID, PK), user_id (UUID, FK → users.user_id), total_points (number), level (number), current_streak (number), longest_streak (number), last_active_date (date), created_at (timestamp)

**missions**
- เก็บภารกิจที่ผู้ใช้ต้องทำ
- ฟิลด์: id (UUID, PK), title (text), description (text), points (number), mission_type (text), is_daily (boolean), created_at (timestamp)

**user_missions**
- เก็บสถานะภารกิจของผู้ใช้
- ฟิลด์: id (UUID, PK), user_id (UUID, FK → users.user_id), mission_id (UUID, FK → missions.id), completed_at (timestamp or null), is_completed (boolean)

**notifications**
- เก็บประวัติการแจ้งเตือนของผู้ใช้
- ฟิลด์: id (UUID, PK), user_id (UUID, FK → users.user_id), type (text), sent_at (timestamp), status (text)

### 5.2 ความสัมพันธ์ระหว่างตาราง (Relationship)
- `users` 1—1 `profiles`
- `users` 1—N `weight_logs`
- `users` 1—N `if_sessions`
- `users` 1—1 `healthy_journey`
- `users` 1—N `user_missions`
- `missions` 1—N `user_missions`
- `users` 1—N `notifications`

---

## 6. การออกแบบส่วนติดต่อ (Interface Design)

### 6.1 ส่วนติดต่อผู้ใช้ (UI Overview)

LINE Mini App จะพัฒนาโดยใช้ Next.js และ LIFF SDK ทำงานภายใน LIFF Browser บน LINE Application

หน้าหลักของระบบประกอบด้วย:

1. **หน้า Dashboard** - แสดงสรุปข้อมูลสุขภาพประจำวัน ได้แก่ สถานะ IF และความคืบหน้า Healthy Journey
2. **หน้า IF Tracker** - แสดงสถานะการอดแบบ real-time จับเวลา และประวัติการทำ IF
3. **หน้า IF Calendar** - แสดงปฏิทินรายเดือนของประวัติการทำ IF พร้อมสถานะแต่ละวัน
4. **หน้า Health Dashboard** - แสดงกราฟและสถิติข้อมูลสุขภาพรายสัปดาห์/รายเดือน รวมถึง BMI และ BMR
5. **หน้า Healthy Journey** - แสดงภารกิจ คะแนนสะสม ระดับ และ badges
6. **หน้า Profile** - แสดงข้อมูลผู้ใช้ การตั้งค่า IF การตั้งเป้าหมายน้ำหนัก การบันทึกน้ำหนักรายวัน และการตั้งค่าการแจ้งเตือน พร้อมแสดงค่า BMI และ BMR

### 6.2 ส่วนติดต่อระบบภายนอก

**6.2.1 LINE LIFF API**
- ใช้ `liff.init()` เพื่อเริ่มต้น LIFF App
- ใช้ `liff.getProfile()` เพื่อรับข้อมูลผู้ใช้
- ใช้ `liff.login()` สำหรับการเข้าสู่ระบบ
- ใช้ `liff.getDecodedIDToken()` เพื่อตรวจสอบ userId ฝั่ง Frontend

**6.2.2 Supabase API**
- ใช้ Supabase Client (JavaScript SDK) สำหรับเชื่อมต่อฐานข้อมูล
- ใช้ Row Level Security (RLS) สำหรับควบคุมการเข้าถึงข้อมูล
- จัดเก็บและเรียกใช้ข้อมูลผู้ใช้ ข้อมูล IF และความก้าวหน้า

**6.2.3 LINE Messaging API**
- ใช้ LINE Messaging API สำหรับส่ง Push Notification ถึงผู้ใช้
- ใช้ Rich Menu สำหรับสร้างเมนูใน LINE OA Chat
- ใช้ Reply Token สำหรับตอบกลับข้อความอัตโนมัติ

---

## 7. การออกแบบสถาปัตยกรรมระบบ (System Architecture Design)

### 7.1 Component Diagram

ระบบแบ่งออกเป็น 5 ส่วนหลัก:

1. **Frontend Component (LIFF App)**
   - รับผิดชอบการแสดงผลและการโต้ตอบกับผู้ใช้
   - ทำงานบน Next.js Frontend
   - เรียกใช้ LIFF SDK สำหรับ LINE Integration
   - ส่ง requests ไปยัง API Routes

2. **API Routes Component (Next.js Backend)**
   - รับผิดชอบการประมวลผล business logic
   - จัดการ authentication middleware (ตรวจสอบ idToken จาก LINE)
   - เชื่อมต่อกับ Supabase
   - แบ่งเป็น modules: auth, if, journey, notification

3. **Database Component (Supabase)**
   - รับผิดชอบการจัดเก็บและเรียกใช้ข้อมูล
   - ใช้ Row Level Security (RLS) สำหรับความปลอดภัย
   - จัดการ Realtime subscriptions

4. **External Service Component**
   - LINE Platform (LIFF + Messaging API)

5. **Scheduler Component**
   - ตรวจสอบเวลาและสถานะผู้ใช้เป็นระยะ (Cron Job)
   - สั่งให้ส่งการแจ้งเตือนผ่าน LINE Messaging API

### 7.2 Data Flow Diagram

**Flow การติดตาม IF:**

1. ผู้ใช้กดเริ่มการอดอาหารที่หน้า IF Tracker
2. Frontend ส่ง request ไปยัง API Route `/api/if/start`
3. API Route สร้าง record ใหม่ใน `if_sessions` โดยมี status = "active"
4. ระบบตอบกลับ start_time และ session_id
5. Frontend แสดง timer แบบ real-time
6. เมื่อผู้ใช้กดสิ้นสุดการอด ส่ง request ไปยัง API Route `/api/if/end`
7. API Route คำนวณ duration และอัปเดต record
8. API Route ตรวจสอบและอัปเดตคะแนนใน `healthy_journey`
9. ระบบตอบกลับผลลัพธ์

**Flow การตั้งเป้าหมายน้ำหนักและบันทึกน้ำหนักรายวัน:**

1. ผู้ใช้ตั้งค่า `target_weight` และ `target_date` ที่หน้า Profile
2. ผู้ใช้บันทึกน้ำหนักประจำวันลงตาราง `weight_logs`
3. API Route คำนวณความคืบหน้าเปรียบเทียบน้ำหนักล่าสุดกับเป้าหมาย
4. แสดงผลเป็นเปอร์เซ็นต์และสถานะบนหน้า Dashboard

**Flow การแสดง IF Calendar:**

1. ผู้ใช้เข้าหน้า "IF Calendar" และเลือกเดือน
2. Frontend ส่ง request ไปยัง API Route `/api/if/calendar?month=...`
3. API Route ดึงข้อมูลจากตาราง `if_sessions` ตามช่วงเดือนที่เลือก
4. API Route คำนวณสถานะรายวัน (สำเร็จ/ล้มเหลว/ไม่อด) และตอบกลับ Frontend
5. Frontend แสดงผลเป็นปฏิทินรายเดือน

### 7.3 Sequence Flow

**Login Flow:**

1. ผู้ใช้เปิด LINE Mini App → LIFF App โหลด → `liff.init()` → LINE Platform
2. `liff.getProfile()` → LINE Platform ส่งคืนข้อมูลผู้ใช้ (userId, displayName, avatar)
3. Frontend ส่ง idToken ไปยัง API Route `/api/auth/login`
4. API Route ตรวจสอบ (verify) idToken และค้นหา userId ใน Supabase `users` table
5. หากไม่พบ → สร้าง user record ใหม่ใน Supabase
6. API Route ตอบกลับ user data และ session
7. Frontend นำทางไปยังหน้า Dashboard

**Notification Flow:**

1. ระบบ Backend มี Cron Job หรือ Scheduled Task ตรวจสอบเวลา
2. เรียกใช้ LINE Messaging API เพื่อส่ง Push Message
3. LINE Platform ส่งข้อความไปยัง LINE OA Chat ของผู้ใช้
4. ผู้ใช้ได้รับแจ้งเตือนผ่าน LINE Notification

---

## 8. การออกแบบความปลอดภัย (Security Design)

- ใช้ LINE Login (OAuth 2.0) เป็นช่องทางยืนยันตัวตนหลัก ลดความเสี่ยงจากการจัดการรหัสผ่านเอง
- ตรวจสอบ idToken จาก LIFF ที่ Backend ทุกครั้งด้วย `jose` หรือ `jsonwebtoken` ก่อนเชื่อถือ userId (ป้องกันการปลอมแปลง token)
- ใช้ Supabase Row Level Security (RLS) เพื่อจำกัดให้ผู้ใช้เข้าถึงได้เฉพาะข้อมูลของตนเองในทุกตาราง
- Validate ทุก input จาก Client ด้วย Zod ก่อนส่งไปยัง Database
- ใช้ Next.js Server Actions CSRF protection และ Rate Limiting เพื่อป้องกันการใช้งานที่ไม่เหมาะสม
- การเชื่อมต่อทั้งหมดใช้ HTTPS และกำหนด Environment Variables ใน Vercel Dashboard

---

## 9. แผนการทดสอบระบบ (Testing Plan)

| ประเภทการทดสอบ | เครื่องมือ | ขอบเขต |
|---|---|---|
| API Testing | Postman | ทดสอบ API Routes ของ Next.js เช่น Auth, IF Session, IF Calendar, Weight Log |
| End-to-End Testing | Playwright | ทดสอบ Flow การใช้งานจริงผ่านหน้าเว็บ เช่น Login → เริ่ม IF → ดู Dashboard |
| UI/UX Testing | LINE Official Account Emulator | ทดสอบการแสดงผลและการทำงานภายใน LINE Mini App |

---

## 10. แผนการดำเนินงาน (Project Timeline)

| ขั้นตอน | กิจกรรม | ระยะเวลา |
|---|---|---|
| 1 | ศึกษาและวิเคราะห์ความต้องการ | สัปดาห์ที่ 1-2 |
| 2 | ออกแบบ UI/UX ด้วย Figma | สัปดาห์ที่ 2-3 |
| 3 | ติดตั้งและตั้งค่าโครงการ Next.js + Supabase | สัปดาห์ที่ 3-4 |
| 4 | พัฒนาระบบยืนยันตัวตน (LINE Login) | สัปดาห์ที่ 4-5 |
| 5 | พัฒนาระบบ IF Tracker | สัปดาห์ที่ 5-6 |
| 6 | พัฒนาระบบ Healthy Journey (Gamification) | สัปดาห์ที่ 6-7 |
| 7 | พัฒนาระบบเป้าหมายน้ำหนักและบันทึกน้ำหนักรายวัน | สัปดาห์ที่ 7-8 |
| 8 | พัฒนาระบบแจ้งเตือนผ่าน LINE OA | สัปดาห์ที่ 8-9 |
| 9 | พัฒนาระบบ Health Dashboard และ IF Calendar | สัปดาห์ที่ 9-10 |
| 10 | ทดสอบระบบและแก้ไขข้อผิดพลาด | สัปดาห์ที่ 10-12 |
| 11 | จัดทำเอกสารและนำเสนอโครงการ | สัปดาห์ที่ 12-13 |

---

## 11. เครื่องมือที่ใช้ (Tools)

### 11.1 Requirement
- Miro
- Google Form

### 11.2 Design
- Figma

### 11.3 Code
- Zed
- Visual Studio Code
- Next.js
- LINE LIFF SDK
- Supabase JavaScript SDK
- TypeScript

### 11.4 Deploy
- Vercel
- GitHub

### 11.5 Testing
- Postman
- Playwright
- LINE Official Account Emulator

---

## 12. ประโยชน์ที่คาดว่าจะได้รับ (Expected Benefits)

12.1 ผู้ใช้สามารถติดตามพฤติกรรมการดูแลสุขภาพได้อย่างสะดวกผ่าน LINE

12.2 ผู้ใช้สามารถติดตามการทำ Intermittent Fasting (IF) ได้อย่างเป็นระบบ

12.3 ผู้ใช้ได้รับการแจ้งเตือนผ่าน LINE Official Account เพื่อช่วยสร้างวินัยและความต่อเนื่องในการดูแลสุขภาพ

12.4 ระบบช่วยส่งเสริมการสร้างพฤติกรรมการดูแลสุขภาพที่ดีผ่านฟีเจอร์ Healthy Journey และการติดตามความก้าวหน้า

12.5 ผู้ใช้สามารถตั้งเป้าหมายน้ำหนักและติดตามความคืบหน้าได้อย่างเป็นระบบ พร้อมดูประวัติการทำ IF ย้อนหลังผ่านปฏิทิน

---

## 13. การออกแบบ REST API

### 13.1 ข้อตกลงพื้นฐาน (Conventions)

| ข้อ | รายละเอียด |
|---|---|
| Base URL | `/api/v1` |
| Auth | Custom JWT (sign ด้วย `jose`, HS256) เก็บใน httpOnly cookie ชื่อ `nj_session` อายุ 7 วัน, `SameSite=Lax`, `Secure` |
| Body | JSON ทั้งหมด ผ่าน Zod validation ทุก endpoint |
| Response | Envelope `{ success, data, error }` |
| Timezone | Client ส่ง ISO 8601 (มี offset) → Server เก็บ UTC (`timestamptz`); calendar ส่ง `?month=YYYY-MM&tz=Asia/Bangkok` |
| Pagination | `?page=1&limit=20` (limit ≤ 100) → meta ใน `data` |
| Rate Limit | `proxy.ts` บน `/api/:path*` (60 req/min/IP; `/auth/login` 10 req/min) |
| Webhook | `POST /webhooks/line` ตรวจ `X-Line-Signature` |

**Error envelope** — `{ success: false, error: { code, message, details? } }`

| HTTP Status | Code | ความหมาย |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input ไม่ผ่าน Zod |
| 401 | `UNAUTHORIZED` / `TOKEN_EXPIRED` | ไม่มี session / token หมดอายุ |
| 403 | `FORBIDDEN` | ไม่มีสิทธิ์เข้าถึงข้อมูล |
| 404 | `NOT_FOUND` | ไม่พบ resource |
| 409 | `CONFLICT` | ขัดกับสถานะปัจจุบัน (เช่น มี IF session active อยู่แล้ว) |
| 429 | `RATE_LIMITED` | เกินอัตราการเรียก |
| 500 | `INTERNAL_ERROR` | ข้อผิดพลาดภายในระบบ |

**Public (ไม่ต้อง auth):** `/auth/login`, `/webhooks/line` — นอกนั้นทั้งหมดผ่าน `requireAuth()` (verify cookie JWT แล้ว inject `userId` เข้า handler)

### 13.2 ตาราง Endpoints

#### 13.2.1 Auth

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ idToken }` | verify LINE idToken (jose + LINE JWKS) → upsert `users` + `profiles` → set cookie → `data.user` |
| POST | `/auth/logout` | — | clear cookie |
| GET | `/auth/me` | — | `data.user + profile` |

#### 13.2.2 Users / Profiles

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/users/me` | — | profile + คำนวณ `bmi`, `bmr` (Mifflin-St Jeor) |
| PATCH | `/users/me` | `{ weight?, height?, gender?, birth_date?, if_pattern?, goal? }` | updated profile + BMI/BMR |

#### 13.2.3 Weight Logs

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/weight-logs?from&to&page&limit` | — | list |
| POST | `/weight-logs` | `{ weight, logged_at }` | created |
| GET | `/weight-logs/:id` | — | item |
| PATCH | `/weight-logs/:id` | `{ weight?, logged_at? }` | updated |
| DELETE | `/weight-logs/:id` | — | 204 |

#### 13.2.4 Weight Goals

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/weight-goals` | — | goals (active + history) |
| POST | `/weight-goals` | `{ target_weight, target_date, goal_type? }` | created (auto-ปิด active อันเดิม) |
| GET | `/weight-goals/:id/progress` | — | % progress + status (ถึงเป้า/ใกล้/ห่าง) เทียบ weight ล่าสุด |
| PATCH | `/weight-goals/:id` | `{ target_weight?, target_date? }` | updated |
| DELETE | `/weight-goals/:id` | — | 204 |

#### 13.2.5 IF Sessions

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/if-sessions/start` | `{ if_pattern?, started_at? }` | session (`409` ถ้ามี active) |
| POST | `/if-sessions/end` | `{ session_id }` | คำนวณ `duration_minutes`, status completed, auto award points |
| GET | `/if-sessions/active` | — | session active ตัวปัจจุบัน |
| GET | `/if-sessions?from&to&status&page&limit` | — | list |
| GET | `/if-sessions/:id` | — | item |
| DELETE | `/if-sessions/:id` | — | ยกเลิก (เฉพาะยังไม่ completed) |
| GET | `/if-sessions/calendar?month=YYYY-MM&tz` | — | per-day `{ date, status, duration_minutes }` |

#### 13.2.6 Dashboard

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/dashboard?date&tz` | — | สรุปรวม: IF stats, weight progress, health summary, journey |

#### 13.2.7 Journey (Gamification) — อ่านเป็นหลัก, points ถูก auto-award

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/journey` | — | points, level, current/longest streak |
| GET | `/missions` | — | mission list + สถานะสำเร็จของผู้ใช้ |
| GET | `/missions/:id` | — | รายละเอียด + สถานะ |

#### 13.2.8 Notifications

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/notifications?page&limit` | — | ประวัติแจ้งเตือน |
| PATCH | `/notifications/:id/read` | — | mark as read |
| GET | `/notification-settings` | — | settings |
| PATCH | `/notification-settings` | `{ start_hour, end_hour, enabled }` | updated |
| POST | `/webhooks/line` | LINE payload | verify signature → ตอบ 200 |

### 13.3 โครงสร้างไฟล์ (Folder Structure)

```
app/api/v1/
  auth/  login|logout|me/route.ts
  users/ me/route.ts
  weight-logs/  route.ts, [id]/route.ts
  weight-goals/ route.ts, [id]/route.ts, [id]/progress/route.ts
  if-sessions/  route.ts, active/route.ts, start/route.ts, end/route.ts, [id]/route.ts, calendar/route.ts
  dashboard/     route.ts
  journey/       route.ts, missions/route.ts, missions/[id]/route.ts
  notifications/ route.ts, [id]/read/route.ts, settings/route.ts
  webhooks/      line/route.ts
lib/
  auth.ts          verify LINE idToken (jose) + issue/verify JWT session + requireAuth()
  supabase.ts      createServerClient (server-only)
  line.ts          LINE Messaging API
  response.ts      apiSuccess / apiError envelope
  validation.ts    Zod schemas
proxy.ts           rate limiting
```

### 13.4 การเพิ่มเติมฐานข้อมูล (Database Additions)

- `weight_goals` — id, user_id, target_weight, target_date, goal_type, status, timestamps
- เปิด RLS ทุกตาราง + policy ให้ผู้ใช้เข้าถึงเฉพาะข้อมูลของตนเอง (ตามแบบ Custom JWT / app-level check)

### 13.5 Security ที่ฝังในทุก Endpoint

- `requireAuth()` verify JWT cookie ก่อนเข้า handler; `userId` มาจาก cookie ที่ sign โดยระบบ ไม่เชื่อ `liff.getDecodedIDToken()` ตรง ๆ
- Zod validate input ทุกตัว; ใช้ Supabase SDK แทน SQL string concat (ป้องกัน SQL Injection)
- Rate limit ผ่าน `proxy.ts` + webhook ตรวจ `X-Line-Signature`

### 14 Theme

- parent color palette (#FAF8F7, #000000, #18A659, )