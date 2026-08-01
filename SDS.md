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
ระบบ Nutri Journey เป็นเว็บแอปพลิเคชัน (LINE Mini App) ที่ทำงานภายใน LINE Application ผ่าน LIFF สำหรับติดตามการทำ Intermittent Fasting (IF) รองรับการเข้าสู่ระบบผ่านบัญชี LINE เชื่อมต่อข้อมูลสุขภาพจาก Google Health API และมีระบบกระตุ้นพฤติกรรม (Gamification) เพื่อเสริมแรงจูงใจให้ผู้ใช้งาน

ฟังก์ชันหลักของระบบ:
- ติดตามการทำ Intermittent Fasting (IF Tracker)
- เชื่อมต่อและดึงข้อมูลสุขภาพจาก Google Health API
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
| Google Health API | บริการ API ของ Google ที่ตรวจสอบข้อมูลสุขภาพได้ เช่น ก้าวเดิน, ระยะทางเดิน, แคลอรี่ที่เผาผลาญในแต่ละวัน |
| Supabase | บริการ backend-as-a-service ที่ใช้ PostgreSQL |
| BMI | Body Mass Index - ดัชนีมวลกาย คำนวณจากน้ำหนัก (กก.) หารด้วยส่วนสูง (ม.) ยกกำลังสอง |
| BMR | Basal Metabolic Rate - อัตราการเผาผลาญพลังงานขั้นพื้นฐานของร่างกายขณะพัก |
| Health Dashboard | หน้าสรุปข้อมูลสุขภาพ |

### 1.4 เอกสารอ้างอิง
- LINE LIFF Documentation - https://developers.line.biz/en/docs/liff/
- LINE Messaging API Documentation - https://developers.line.biz/en/docs/messaging-api/
- Google Health API Documentation - https://developers.google.com/fit
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
| ข้อมูลสุขภาพ | Google Health API |
| การแจ้งเตือน | LINE Messaging API |
| Deploy | Vercel, GitHub |
| Testing | Postman, Playwright |

### 2.2 สถาปัตยกรรมระบบ (System Architecture)

ระบบ Nutri Journey มีสถาปัตยกรรมแบบ Client-Server โดยฝั่ง Client ทำงานบน LINE Mini App ผ่าน LIFF (เว็บแอปพลิเคชันที่ทำงานภายใน LINE Application) และฝั่ง Server ใช้ Next.js Framework ในการจัดการทั้ง Frontend และ Backend API Routes โดยมี Supabase เป็นฐานข้อมูลหลัก และ Google Health API สำหรับดึงข้อมูลสุขภาพ

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
           │
┌──────────▼─────┐
│  Google        │
│  Health API    │
│  (ข้อมูลสุขภาพ) │
└────────────────┘
```

- **Next.js** ทำหน้าที่เป็นทั้ง Frontend (แสดงผล UI) และ Backend (API Routes จัดการ Business Logic)
- **Supabase** ใช้เป็นฐานข้อมูลหลัก (PostgreSQL), ระบบ Authentication และ Storage
- **Google Health API** ใช้ดึงข้อมูลสุขภาพ เช่น ก้าวเดิน ระยะทาง และแคลอรี่ที่เผาผลาญ
- **LINE LIFF / LINE Official Account** ใช้สำหรับ Login และส่งการแจ้งเตือน

### 2.3 แผนผังบริบทของระบบ (Context Diagram)

ผู้ใช้โต้ตอบกับระบบผ่าน LINE Application โดยมีช่องทางดังนี้
- ผ่าน LIFF App (หน้าเว็บแอปภายใน LINE) สำหรับฟังก์ชันหลักทั้งหมด
- ผ่าน LINE OA Chat สำหรับรับการแจ้งเตือนและข้อความจากระบบ

ระบบเชื่อมต่อกับบริการภายนอกดังนี้
- Google Health API สำหรับดึงข้อมูลสุขภาพของผู้ใช้
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
| เริ่ม/สิ้นสุด IF | ตั้งค่าและติดตามช่วงเวลาการทำ IF |
| ดู Health Dashboard | ดูสรุปข้อมูลสุขภาพ สถานะ IF และข้อมูลจาก Google Health API |
| เชื่อมต่อ Google Health | อนุญาตและดึงข้อมูลสุขภาพจากบัญชี Google |
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

**3.2.3 การเชื่อมต่อ Google Health API**
- ผู้ใช้สามารถเชื่อมต่อบัญชี Google เพื่ออนุญาตให้ระบบเข้าถึงข้อมูลสุขภาพ
- ระบบดึงข้อมูล ก้าวเดิน (steps), ระยะทาง (distance) และแคลอรี่ที่เผาผลาญ (kcal) ต่อวัน
- ข้อมูลที่ดึงมาจะถูกนำไปแสดงผลรวมใน Health Dashboard

**3.2.4 การแสดงข้อมูลสุขภาพ (Health Dashboard)**
- ระบบแสดงสรุปข้อมูลจาก Google Health API (ก้าวเดิน, ระยะทาง, แคลอรี่ที่เผาผลาญ)
- ระบบแสดงสถิติการทำ IF (จำนวนครั้ง, ชั่วโมงอดสะสม)
- ระบบแสดงข้อมูลเปรียบเทียบระหว่างวัน/สัปดาห์/เดือน

**3.2.5 Healthy Journey (Gamification)**
- ผู้ใช้สามารถทำภารกิจ (missions) เพื่อรับคะแนน
- ภารกิจ เช่น ทำ IF ครบตามกำหนด, เดินครบเป้าขั้นตอน, ดื่มน้ำครบตามเป้า
- ผู้ใช้สามารถดูระดับ (level) และความคืบหน้า
- ระบบแสดง badges หรือรางวัลเมื่อบรรลุเป้าหมาย

**3.2.6 การแจ้งเตือนผ่าน LINE OA**
- ระบบส่งการแจ้งเตือนสถานะการทำ IF (เริ่ม/สิ้นสุด/ใกล้ครบกำหนด)
- ระบบส่งสรุปประจำวัน (Daily Summary)

**3.2.7 การคำนวณ BMI และ BMR**
- ระบบคำนวณ BMI อัตโนมัติจากน้ำหนักและส่วนสูงของผู้ใช้ และแสดงหมวดหมู่ (น้ำหนักน้อย/ปกติ/เกิน/อ้วน)
- ระบบคำนวณ BMR ด้วยสูตร Mifflin-St Jeor จากเพศ อายุ น้ำหนัก และส่วนสูงของผู้ใช้
- ค่าที่คำนวณได้จะแสดงผลบนหน้า Dashboard และหน้า Profile

### 3.3 Non-functional Requirements

**3.3.1 Performance (ประสิทธิภาพ)**
- หน้ายืนยันตัวตนและหน้า Dashboard ต้องโหลดภายใน 3 วินาที
- ระบบสามารถรองรับผู้ใช้พร้อมกันอย่างน้อย 100 คน

**3.3.2 Security (ความปลอดภัย)**
- ข้อมูลส่วนบุคคลและข้อมูลสุขภาพของผู้ใช้ต้องถูกจัดเก็บอย่างปลอดภัย
- การเชื่อมต่อทั้งหมดต้องใช้ HTTPS
- ใช้ LINE Login เป็นระบบยืนยันตัวตนหลัก โดยต้องตรวจสอบ Token ที่ Backend ทุกครั้ง
- ใช้ Row Level Security (RLS) กับทุกตาราง เพื่อให้ผู้ใช้เข้าถึงได้เฉพาะข้อมูลของตนเอง
- เก็บ refresh_token ของ Google Health API ไว้ฝั่ง Backend เท่านั้น ไม่เปิดเผยสู่ Client
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
5. ระบบแสดงผล BMI พร้อมหมวดหมู่ (น้ำหนักน้อย/ปกติ/เกิน/อ้วน) และค่า BMR ให้ผู้ใช้เห็น

### 4.3 เริ่ม/สิ้นสุดการทำ Intermittent Fasting (IF Tracker)
1. ผู้ใช้เลือกรูปแบบ IF (เช่น 16:8, 18:6) หรือกำหนดเอง
2. ผู้ใช้กด "เริ่ม Fasting" → ระบบบันทึกเวลาเริ่มต้นลงตาราง `if_sessions`
3. ระบบแสดง Timer นับถอยหลัง/นับเวลาที่ผ่านไปแบบ Real-time บนหน้าจอ
4. เมื่อครบกำหนดหรือผู้ใช้กด "สิ้นสุด Fasting" ระบบบันทึกเวลาสิ้นสุด และคำนวณระยะเวลาที่ทำได้จริง (duration_minutes)
5. ข้อมูลเซสชันจะถูกส่งไปแสดงผลรวมใน Health Dashboard และใช้ตรวจสอบภารกิจใน Healthy Journey

### 4.4 ข้อมูลจาก Google Health API
1. ผู้ใช้ทำการเชื่อมต่อบัญชี Google ผ่าน OAuth 2.0 flow ที่จัดการโดย Backend
2. ระบบรับ `refresh_token` และเก็บไว้ใน Backend อย่างปลอดภัย (ไม่ส่งไปยัง Client)
3. Backend ส่งคำขอไปยัง Google Health API เพื่อดึงข้อมูล ก้าวเดิน (steps), ระยะทาง (distance) และแคลอรี่ที่เผาผลาญ (kcal) ของวันนั้น
4. ระบบนำข้อมูลที่ได้มาบันทึกและแสดงผลรวมใน Health Dashboard ร่วมกับข้อมูล IF

### 4.5 Health Dashboard
1. ระบบดึงข้อมูลจากหลายตาราง (`if_sessions`, `profiles`) และ Google Health API มาประมวลผลรวม
2. คำนวณสรุปรายวัน/รายสัปดาห์ เช่น ระยะเวลา IF เฉลี่ย, ก้าวเดิน, ระยะทาง, แคลอรี่ที่เผาผลาญ, แนวโน้มน้ำหนัก
3. แสดงค่า BMI พร้อมหมวดหมู่ และค่า BMR ที่คำนวณจากข้อมูลโปรไฟล์
4. แสดงผลเป็นกราฟและการ์ดสรุป (Chart/Widget) บนหน้า Dashboard

### 4.6 Healthy Journey (ระบบเควสและคะแนน)
1. ระบบตรวจสอบพฤติกรรมผู้ใช้ (เช่น ทำ IF ครบตามเป้า, เดินครบเป้า) เทียบกับเงื่อนไขภารกิจในตาราง `missions`
2. เมื่อผู้ใช้ทำเงื่อนไขสำเร็จ ระบบเพิ่มคะแนน/รางวัลลงตาราง `healthy_journey`
3. หน้า Healthy Journey แสดงภารกิจที่ทำได้ ภารกิจที่ยังไม่สำเร็จ และคะแนนสะสมทั้งหมด
4. คะแนนสะสมอาจใช้แลกเป็น Badge หรือ Level เพื่อสร้างแรงจูงใจต่อเนื่อง

### 4.7 ระบบแจ้งเตือน (Notification)
1. ระบบมี Scheduler/Cron Job ตรวจสอบสถานะผู้ใช้ (เช่น ใกล้ครบเวลา Fasting)
2. เมื่อเข้าเงื่อนไข ระบบเรียก LINE Messaging API เพื่อส่งข้อความแจ้งเตือนผ่าน LINE Official Account
3. ผู้ใช้กดที่ข้อความแจ้งเตือนเพื่อเปิดกลับเข้าสู่ระบบ (Deep Link ผ่าน LIFF)

---

## 5. การออกแบบฐานข้อมูล (Database Design)

### 5.1 ตารางหลักในระบบ (Supabase / PostgreSQL)

**users**
- เก็บข้อมูลบัญชีผู้ใช้ระบบ
- ฟิลด์: user_id (UUID, PK), line_user_id (text, unique), display_name (text), avatar_url (text), email (text), created_at (timestamp)

**profiles**
- เก็บข้อมูลส่วนตัว/สุขภาพของผู้ใช้
- ฟิลด์: user_id (UUID, FK → users.user_id), weight (number), height (number), gender (text: male/female), birth_date (date), goal (text), if_pattern (text เช่น 16:8)

**if_sessions**
- เก็บข้อมูลการทำ IF ของผู้ใช้
- ฟิลด์: id (UUID, PK), user_id (UUID, FK → users.user_id), start_time (timestamp), end_time (timestamp or null), status (text: active/completed), duration_minutes (number), created_at (timestamp)

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

1. **หน้า Dashboard** - แสดงสรุปข้อมูลสุขภาพประจำวัน ได้แก่ ข้อมูลจาก Google Health API สถานะ IF และความคืบหน้า Healthy Journey
2. **หน้า IF Tracker** - แสดงสถานะการอดแบบ real-time จับเวลา และประวัติการทำ IF
3. **หน้า Health Dashboard** - แสดงกราฟและสถิติข้อมูลสุขภาพรายสัปดาห์/รายเดือน รวมถึงข้อมูลจาก Google Health API, BMI และ BMR
4. **หน้า Healthy Journey** - แสดงภารกิจ คะแนนสะสม ระดับ และ badges
5. **หน้า Profile** - แสดงข้อมูลผู้ใช้ การตั้งค่า IF การเชื่อมต่อ Google Health และการตั้งค่าการแจ้งเตือน พร้อมแสดงค่า BMI และ BMR

### 6.2 ส่วนติดต่อระบบภายนอก

**6.2.1 LINE LIFF API**
- ใช้ `liff.init()` เพื่อเริ่มต้น LIFF App
- ใช้ `liff.getProfile()` เพื่อรับข้อมูลผู้ใช้
- ใช้ `liff.login()` สำหรับการเข้าสู่ระบบ
- ใช้ `liff.getDecodedIDToken()` เพื่อตรวจสอบ userId ฝั่ง Frontend

**6.2.2 Google Health API**
- ใช้ OAuth 2.0 flow สำหรับการเชื่อมต่อบัญชี Google
- เก็บ `refresh_token` ไว้ใน Backend เท่านั้น
- ดึงข้อมูล steps, distance และ kcal ผ่าน API เพื่อแสดงผลใน Health Dashboard

**6.2.3 Supabase API**
- ใช้ Supabase Client (JavaScript SDK) สำหรับเชื่อมต่อฐานข้อมูล
- ใช้ Row Level Security (RLS) สำหรับควบคุมการเข้าถึงข้อมูล
- จัดเก็บและเรียกใช้ข้อมูลผู้ใช้ ข้อมูล IF และความก้าวหน้า

**6.2.4 LINE Messaging API**
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
   - เชื่อมต่อกับ Supabase และ Google Health API
   - แบ่งเป็น modules: auth, if, journey, notification

3. **Database Component (Supabase)**
   - รับผิดชอบการจัดเก็บและเรียกใช้ข้อมูล
   - ใช้ Row Level Security (RLS) สำหรับความปลอดภัย
   - จัดการ Realtime subscriptions

4. **External Service Component**
   - LINE Platform (LIFF + Messaging API)
   - Google Health API

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

**Flow การดึงข้อมูลจาก Google Health API:**

1. ผู้ใช้กด "เชื่อมต่อ Google" ที่หน้า Profile
2. Backend เริ่ม OAuth 2.0 flow และขอสิทธิ์เข้าถึงข้อมูลสุขภาพ
3. ระบบรับ `refresh_token` และเก็บไว้ใน Backend
4. Scheduler หรือคำขอจากผู้ใช้กระตุ้นให้ Backend เรียก Google Health API
5. Backend นำข้อมูล steps, distance, kcal มาประมวลผลและแสดงผลใน Health Dashboard

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
- เก็บ `refresh_token` ของ Google Health API ไว้ใน Backend เท่านั้น (ใช้ `server-only` import) ไม่เปิดเผยสู่ Client
- Validate ทุก input จาก Client ด้วย Zod ก่อนส่งไปยัง Database
- ใช้ Next.js Server Actions CSRF protection และ Rate Limiting เพื่อป้องกันการใช้งานที่ไม่เหมาะสม
- การเชื่อมต่อทั้งหมดใช้ HTTPS และกำหนด Environment Variables ใน Vercel Dashboard

---

## 9. แผนการทดสอบระบบ (Testing Plan)

| ประเภทการทดสอบ | เครื่องมือ | ขอบเขต |
|---|---|---|
| API Testing | Postman | ทดสอบ API Routes ของ Next.js เช่น Auth, IF Session, Google Health |
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
| 6 | พัฒนาการเชื่อมต่อ Google Health API | สัปดาห์ที่ 6-7 |
| 7 | พัฒนาระบบ Healthy Journey (Gamification) | สัปดาห์ที่ 7-8 |
| 8 | พัฒนาระบบแจ้งเตือนผ่าน LINE OA | สัปดาห์ที่ 8-9 |
| 9 | พัฒนาระบบ Health Dashboard | สัปดาห์ที่ 9-10 |
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

12.2 ผู้ใช้สามารถติดตามการทำ Intermittent Fasting (IF) และข้อมูลสุขภาพจาก Google Health API ได้อย่างเป็นระบบ

12.3 ผู้ใช้ได้รับการแจ้งเตือนผ่าน LINE Official Account เพื่อช่วยสร้างวินัยและความต่อเนื่องในการดูแลสุขภาพ

12.4 ระบบช่วยส่งเสริมการสร้างพฤติกรรมการดูแลสุขภาพที่ดีผ่านฟีเจอร์ Healthy Journey และการติดตามความก้าวหน้า
