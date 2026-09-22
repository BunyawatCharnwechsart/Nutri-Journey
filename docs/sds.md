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
- ติดตามการทำ Intermittent Fasting (IF Tracker) — จับเวลาทั้งช่วงอด (fasting) และช่วงกิน (eating)
- ดูประวัติการทำ IF แบบปฏิทิน (IF Calendar) พร้อมสถานะรายวัน (สำเร็จ/พลาด/กำลังอด/ถูกยกเลิก) และ mood
- บันทึกน้ำหนักรายเดือน (Weight Log) และดูแนวโน้มน้ำหนัก + ความคืบหน้าเป้าหมาย
- บันทึกสัดส่วนรายเดือน (Measurement Log) — รอบเอว/สะโพก/อก (นิ้ว)
- ถ่ายรูปความคืบหน้ารายเดือน (Progress Photo) — หน้า/ข้าง/หลัง
- แสดงข้อมูลสรุปสุขภาพ (Stats/Health Dashboard) — สถิติ IF, กราฟน้ำหนัก, BMI
- ระบบสะสมคะแนนและระดับ (Healthy Journey / "ไข่ของฉัน")
- แจ้งเตือนผ่าน LINE Official Account (หมดช่วงอด/กิน, สรุปประจำเดือน, เตือนถ่ายรูป)

### 1.3 คำนิยามศัพท์

| คำศัพท์ | ความหมาย |
|---|---|
| IF | Intermittent Fasting การจำกัดช่วงเวลาการรับประทานอาหาร |
| LIFF | LINE Front-end Framework สำหรับสร้างเว็บแอปที่ทำงานภายใน LINE |
| OA | Official Account - บัญชีทางการของ LINE |
| SDS | System Design Specification |
| Supabase | บริการ backend-as-a-service ที่ใช้ PostgreSQL |
| BMI | Body Mass Index - ดัชนีมวลกาย คำนวณจากน้ำหนัก (กก.) หารด้วยส่วนสูง (ม.) ยกกำลังสอง |
| ICT | Indochina Time - เขตเวลาไทย (UTC+7) ใช้เป็นเวลาอ้างอิงของระบบทั้งระบบ |
| IF Calendar | ปฏิทินแสดงประวัติการทำ IF รายเดือน (วันที่ทำสำเร็จ/พลาด/กำลังอด) |
| Weight Goal | เป้าหมายน้ำหนัก เก็บเป็นคอลัมน์ `target_weight` / `target_date` ในตาราง `profiles` |
| Weight Log | บันทึกน้ำหนักของผู้ใช้ อย่างมาก 1 ครั้งต่อเดือนไทย (`weight_logs`) |
| Measurement Log | บันทึกสัดส่วน (waist/hip/chest นิ้ว) อย่างมาก 1 ครั้งต่อเดือนไทย (`measurement_logs`) |
| Progress Photo | ชุดรูปถ่ายความคืบหน้า (หน้า/ข้าง/หลัง) 1 ชุดต่อเดือนไทย (`progress_photos`) |
| Healthy Journey | ระบบเควส/คะแนน/ระดับ และ Avatar ("ไข่") |

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
| UI/UX Design | Figma |
| Frontend | Next.js 16 (React 19, TypeScript), Tailwind CSS v4 |
| Backend | Next.js 16 Route Handlers (App Router) |
| Login / Mini App | LINE LIFF SDK 2.x |
| Database | Supabase PostgreSQL + Storage (bucket ส่วนตัว) |
| Auth (session) | Custom JWT (HS256) ด้วย `jose` ใน httpOnly cookie |
| Validation | Zod v4 |
| Chart | chart.js + react-chartjs-2 |
| Calendar UI | react-day-picker |
| การแจ้งเตือน | LINE Messaging API + Supabase pg_cron → pg_net |
| CI/CD | GitHub Actions (lint + test + build; deploy Vercel) |
| Deploy | Vercel, GitHub |
| Testing | Vitest (unit), Postman (manual API), Playwright (E2E/วางแผน) |

### 2.2 สถาปัตยกรรมระบบ (System Architecture)

ระบบ Nutri Journey มีสถาปัตยกรรมแบบ Client-Server โดยฝั่ง Client ทำงานบน LINE Mini App ผ่าน LIFF (เว็บแอปพลิเคชันที่ทำงานภายใน LINE Application) และฝั่ง Server ใช้ Next.js Framework ในการจัดการทั้ง Frontend และ API Routes โดยมี Supabase เป็นฐานข้อมูลหลัก

```
┌─────────────────────────────┐
│      ผู้ใช้งาน (User)         │
│   Browser / LINE Application │
└──────────────┬───────────────┘
               │ HTTPS
┌──────────────▼───────────────┐
│     Next.js Application       │
│  (Server Components +        │
│   Route Handlers / API)      │
└──────────┬───────────────┬─────┘
           │               │
┌──────────▼─────┐  ┌─────▼─────────────┐
│   Supabase     │  │  LINE Platform    │
│  (PG + Storage │  │  LIFF (Login)     │
│   service-role │  │  Messaging API    │
│   client)      │  │  (Notify/Webhook) │
└──────────┬─────┘  └───────────────────┘
           │
┌──────────▼─────────────────────┐
│  Supabase pg_cron → pg_net     │
│  (สั่ง CALL /api/cron/...)      │
└───────────────────────────────┘
```

- **Next.js** ทำหน้าที่เป็นทั้ง Frontend (Server Components แสดงผล UI) และ Backend (Route Handlers จัดการ Business Logic + API)
- **Supabase** ใช้เป็นฐานข้อมูล (PostgreSQL) และ Storage (bucket `progress-photos` แบบส่วนตัว) โดยเข้าถึงด้วย **service role client** ฝั่ง Server เท่านั้น (`lib/supabase/service.ts` + `server-only`)
- **LINE Platform** แบ่งเป็น 2 ช่องทางบน provider เดียวกัน → `oa_user_id === line_user_id` เสมอ:
  - **LIFF** ใช้สำหรับ Login (idToken)
  - **Messaging API** ใช้สำหรับ Push Notification, ตรวจ friendship และรับ webhook (`follow`/`unfollow`)
- **Scheduler (Cron)** ใช้ Supabase `pg_cron` + `pg_net` เรียก route `/api/cron/*` เป็นระยะ (ทุก 1 นาที / ทุกวัน) โดยมี `CRON_SECRET` ป้องกัน

### 2.3 แผนผังบริบทของระบบ (Context Diagram)

ผู้ใช้โต้ตอบกับระบบผ่าน LINE Application โดยมีช่องทางดังนี้
- ผ่าน LIFF App (หน้าเว็บแอปภายใน LINE) สำหรับฟังก์ชันหลักทั้งหมด
- ผ่าน LINE OA Chat สำหรับรับการแจ้งเตือนและข้อความจากระบบ

ระบบเชื่อมต่อกับบริการภายนอกดังนี้
- Supabase Database + Storage สำหรับจัดเก็บข้อมูลและรูป
- LINE Platform สำหรับ Login, ส่งข้อความ และ webhook

---

## 3. ความต้องการของระบบ (System Requirements)

### 3.1 Use Case Diagram (คำอธิบาย)

**Actor:** ผู้ใช้งาน (User)

| Use Case | คำอธิบาย |
|---|---|
| เข้าสู่ระบบด้วย LINE | ผู้ใช้ล็อกอินผ่าน LINE Login (LIFF) ครั้งแรกสร้างบัญชีอัตโนมัติ + กรอก Health Profile wizard ถ้ายังไม่ครบ |
| จัดการข้อมูลส่วนตัว | แก้ไข เพศ วันเกิด ส่วนสูง เป้าหมาย น้ำหนักเป้าหมาย ผ่านหน้า Profile |
| คำนวณ BMI | คำนวณดัชนีมวลกายจากน้ำหนักล่าสุด (weight_logs) และส่วนสูง แสดงหมวดหมู่ตามมาตรฐานของคณะแพทยศาสตร์ศิริราชพยาบาล มหาวิทยาลัยมหิดล |
| ตั้งเป้าหมายน้ำหนัก | ตั้ง `target_weight` / `target_date` และดูความคืบหน้าเทียบน้ำหนักล่าสุด |
| บันทึกน้ำหนักรายเดือน | บันทึกน้ำหนัก สูงสุด 1 ครั้งต่อเดือนไทย และดูแนวโน้มเป็นกราฟ |
| บันทึกสัดส่วนรายเดือน | บันทึกเอว/สะโพก/อก (นิ้ว) สูงสุด 1 ครั้งต่อเดือนไทย |
| ถ่ายรูปความคืบหน้า | อัปโหลดรูปหน้า/ข้าง/หลัง 1 ชุดต่อเดือนไทย ดูภาพย้อนหลัง |
| เริ่ม/สิ้นสุด IF | จับเวลาช่วงอดและช่วงกิน ปรับเวลาเริ่มย้อนหลังได้ (ไม่เกิน 7 วัน) ระบุ mood และดูผลสำเร็จอัตโนมัติ |
| ดู IF Calendar | ดูประวัติการทำ IF รายเดือนพร้อมสถานะ/จำนวนชั่วโมง/mood |
| ดูสถิติสุขภาพ | ดูสถิติ IF, กราฟน้ำหนัก, BMI, สรุปเป็นช่วง 1 สัปดาห์/1 เดือน/1 ปี |
| เล่น Healthy Journey | รับเควสรายวัน +50 XP สะสมคะแนน ยกระดับ และเปลี่ยนชื่อ "ไข่" |
| รับการแจ้งเตือน | รับแจ้งเตือนหมดช่วงอด/กิน, สรุปอัปเดตต้นเดือน, เตือนถ่ายรูป ผ่าน LINE OA |

### 3.2 Functional Requirements

**3.2.1 การเข้าสู่ระบบด้วย LINE Login**
- ผู้ใช้เข้าสู่ระบบผ่าน `liff.login()` → `liff.getIDToken()` → ส่งไป `POST /api/v1/auth/login`
- Backend **verify idToken จริงที่ฝั่ง Server** (jose + LINE JWKS, ตรวจ `iss=https://access.line.me` + `aud=LINE_CHANNEL_ID`) — ไม่เคยเชื่อ `liff.getDecodedIDToken()`
- ผู้ใช้ใหม่ถูก upsert ลง `users` + สร้างแถว `profiles` อัตโนมัติ และผูก `oa_user_id` ทันทีเพื่อพร้อมรับ push
- ตั้ง session cookie `nj_session` แล้ว redirect — ถ้า profile ยังไม่ครบ ไปหน้า `/health-profile` (wizard) ก่อน

**3.2.2 การติดตาม IF (IF Tracker)**
- ผู้ใช้เลือก pattern IF (`12:12`, `14:10`, `16:8`, `18:6`, `20:4`) แล้วกดเริ่ม
- ระบบบันทึก `if_sessions` สถานะ `active` และแสดง timer แบบ real-time
- จบช่วงอด → `POST /if-sessions/end-eating` (เริ่มจับเวลาช่วงกิน); จบรอบ → `POST /if-sessions/end` (บังคับเลือก mood, ระบบล็อก `result` success/fail อัตโนมัติ)
- แก้เวลาเริ่มย้อนหลังได้ไม่เกิน 7 วัน (`PATCH /if-sessions/edit-time`)
- Session ค้างที่เริ่มใหม่ทับ จะถูกปิดเป็น `abandoned` (ไม่นับสถิติ)
- ระบบกันมี session active พร้อมกัน 2 ตัวที่ระดับ DB (partial unique index)

**3.2.3 การแสดงข้อมูลสุขภาพ (Stats / Health Dashboard)**
- สรุปสถิติการทำ IF (จำนวนครั้ง, ชั่วโมงอดรวม, วันที่สำเร็จ) ช่วง 1 สัปดาห์/1 เดือน/1 ปี
- กราฟน้ำหนัก (weight_logs) และกราฟสัดส่วน (measurement_logs)
- กราฟ mood รายเดือน และ BMI พร้อมหมวดหมู่ (คำนวณที่ Server)

**3.2.4 Healthy Journey (Gamification)**
- เควสรายวัน 4 อย่าง: เริ่ม IF, อดครบตามเป้า, บันทึก mood, เข้าหน้าสถิติ — ละ +50 XP
- XP สะสม (`total_points`) กำหนด Level 0–9 แบบ cumulative threshold 150×(1+…+L)
- Avatar เป็นรูปไข่ SVG (`/avatar/level0.svg … level9.svg`) เปลี่ยนตาม level และตั้งชื่อเองได้
- เควสไม่ซ้ำกันในรอบวัน (รอบเริ่ม 09:00 ICT)

**3.2.5 การแจ้งเตือนผ่าน LINE OA**
- แจ้งเตือนเมื่อครบเวลาช่วงอด/ช่วงกิน (cron ทุก 1 นาที, เตือนซ้ำทุก 10 นาที ภายในกรอบ 3 ชม.)
- สรุป "อัปเดตน้ำหนัก/สัดส่วน" ต้นเดือน + แจ้งเตือนถ่ายรูปความคืบหน้า (cron รายวัน เฉพาะวันที่ 1 ของเดือน)
- เปิด/ปิดได้แยกประเภท 3 อัน: การแจ้งเตือนช่วง IF, สรุปรายเดือน, เตือนถ่ายรูป

**3.2.6 การคำนวณ BMI**
- ระบบคำนวณ BMI อัตโนมัติ = น้ำหนักล่าสุด (กก.) / ส่วนสูง (ม.)² และแสดงหมวดหมู่ตามมาตรฐานของคณะแพทยศาสตร์ศิริราชพยาบาล มหาวิทยาลัยมหิดล:
  - <18.5 → น้ำหนักน้อยหรือผอม (อยู่ในเกณฑ์น้ำหนักน้อย)
  - 18.5–22.90 → ปกติ
  - 23–24.90 → น้ำหนักเกิน
  - 25–29.90 → โรคอ้วนระดับที่ 1
  - ≥30 → โรคอ้วนระดับที่ 2
- แสดงบนหน้า Profile / Health Profile

**3.2.7 การตั้งเป้าหมายน้ำหนักและบันทึกน้ำหนัก (Weight Goal & Weight Log)**
- ผู้ใช้ตั้ง `target_weight` + `target_date` ที่หน้า Profile
- ผู้ใช้บันทึกน้ำหนักประจำเดือนไทย (สูงสุด 1 ครั้ง/เดือน) ลง `weight_logs`
- ระบบติดตามความคืบหน้าโดยเปรียบเทียบน้ำหนักล่าสุดกับเป้าหมาย (แสดง progress bar)

**3.2.8 บันทึกสัดส่วน (Measurement Log)**
- ผู้ใช้บันทึกสัดส่วน (waist_in / hip_in / chest_in หน่วยนิ้ว) สูงสุด 1 ครั้ง/เดือนไทย
- ระบบ sync ค่าล่าสุดขึ้น `profiles` (waist_in/hip_in/chest_in) เพื่อให้หน้าโปรไฟล์อัปเดต

**3.2.9 ถ่ายรูปความคืบหน้า (Progress Photo)**
- ผู้ใช้ถ่ายรูป 3 มุม (หน้า/ข้าง/หลัง) 1 ชุดต่อเดือนไทย — เมื่อเดือนใดล็อกแล้ว (มีรูปแล้ว) จะอัปโหลดซ้ำไม่ได้
- รูปเก็บใน Supabase Storage bucket ส่วนตัว ใช้ signed URL (หมดอายุ 24 ชม.) แสดงผล

**3.2.10 ปฏิทินการทำ IF (IF Calendar)**
- ปฏิทินรายเดือนของประวัติการทำ IF (ดึง `GET /if-sessions?month=YYYY-MM`)
- สถานะต่อวัน: `success` / `fail` / `active` / `abandoned` พร้อม badge mood และจำนวนชั่วโมง

### 3.3 Non-functional Requirements

**3.3.1 Performance (ประสิทธิภาพ)**
- หน้า Dashboard ต้องโหลดภายใน 3 วินาที
- ระบบสามารถรองรับผู้ใช้พร้อมกันอย่างน้อย 100 คน

**3.3.2 Security (ความปลอดภัย)**
- ข้อมูลส่วนบุคคลและข้อมูลสุขภาพถูกจัดเก็บอย่างปลอดภัย (RLS + revoke grant + service-role เท่านั้น)
- การเชื่อมต่อทั้งหมดใช้ HTTPS
- ใช้ LINE Login เป็นระบบยืนยันตัวตนหลัก โดย **verify idToken ที่ Backend ทุกครั้ง** (jose)
- Session เป็น Custom JWT (HS256) httpOnly cookie — `requireAuth()` เป็น gate ทุก API
- ทุก query filter `user_id` จาก JWT (ฝั่ง app level) — ไม่เชื่อ userId จาก client
- Validate input ทุกตัวด้วย Zod ก่อนส่ง Database
- รูป progress photos: ตรวจ magic bytes + จำกัดขนาด 5 MB, bucket ส่วนตัว, signed URL

**3.3.3 Usability (การใช้งาน)**
- ส่วนติดต่อผู้ใช้ใช้งานง่าย รองรับภาษาไทย และ Mobile Responsive (bottom nav 5 tabs)
- ผู้ใช้เข้าถึงฟังก์ชันหลักได้ภายใน 2 คลิก
- ระบบแสดงสถานะการทำงานและข้อผิดพลาดอย่างชัดเจน (snack bar/ข้อความไทย)

**3.3.4 Reliability (ความน่าเชื่อถือ)**
- ระบบมีความพร้อมใช้งาน (uptime) อย่างน้อย 99% (Vercel)
- Migration ทั้งหมด idempotent — รันซ้ำได้ทุก deploy
- ข้อมูลสุขภาพและบันทึก IF ไม่สูญหาย (service-role + `if not exists` schema)

---

## 4. Workflow การทำงานของแต่ละฟีเจอร์ (Feature Workflows)

### 4.1 สมัครสมาชิก / เข้าสู่ระบบ (Authentication)
1. ผู้ใช้เปิด LINE Mini App → หน้า Landing (`/`) → กด "เข้าสู่ระบบด้วย LINE"
2. `LineLoginButton` เรียก `liff.init` → `liff.isLoggedIn()` → `liff.login()` → `liff.getIDToken()`
3. Frontend ส่ง `POST /api/v1/auth/login { idToken }`
4. Route Handler verify idToken ด้วย jose + LINE JWKS → upsert `users` (รวม `oa_user_id`) + ตรวจ/สร้าง `profiles`
5. ตอบ `{ user, profileComplete }` + ตั้ง cookie `nj_session`
6. ถ้า `profileComplete === false` → redirect `/health-profile` (wizard กรอกส่วนสูง/น้ำหนัก/สัดส่วน/เป้าหมาย) เสร็จแล้ว → `/dashboard`

### 4.2 การจัดการข้อมูลส่วนตัว (Profile Management)
1. หน้า `/profile` เป็น Server Component อ่าน `users` + `profiles` ตรงๆ ผ่าน service client (โดย `getSessionUserId`)
2. Modal "แก้ไขข้อมูล" ส่ง `PATCH /api/v1/profile` (`gender`, `birth_date`, `height`, `goal`, `target_weight`)
3. หน้า Health Profile (wizard) ส่ง `POST /api/v1/profile` — บันทึกสัดส่วนลง `measurement_logs` และ **บันทึกน้ำหนักลง `weight_logs` ถ้าค่าต่างจาก log ล่าสุด** (ไม่แตะ `profiles.weight` อีกต่อไป)
4. BMI คำนวณที่ Server (`lib/profile.ts`) จากน้ำหนักล่าสุด (weight_logs) + ส่วนสูง
5. ตั้งเป้าหมายน้ำหนัก (`target_weight` + `target_date`) ดู progress ที่หน้า Profile

### 4.3 เริ่ม/สิ้นสุดการทำ Intermittent Fasting (IF Tracker)
1. หน้า `/if` โหลด → `GET /if-sessions/active` เพื่อ restore Timer ที่ยังรันอยู่
2. ผู้ใช้เลือก pattern แล้วกด "เริ่ม Fasting" → `POST /if-sessions/start { if_pattern }` → ได้ session `active` + ได้ `start_if` เควส
3. เมื่อถึงเวลาอดครบ (ตาม pattern) ผู้ใช้กด "หยุดอด / เริ่มกิน" → `POST /if-sessions/end-eating` → บันทึก `fasting_end_time` + `fasting_duration_minutes` และเริ่มนับ `eating_start_time`
4. เมื่อช่วงกินครบ ผู้ใช้เลือก mood (แย่มาก…ดีมาก) แล้วกด "จบรอบ" → `POST /if-sessions/end { session_id, mood }`
   - คำนวณ `eating_duration_minutes`, ตั้ง `status=completed`, ล็อก `result` (success เท่านั้นเมื่ออดถึงเป้า + กินถึงเป้า)
   - แจกเควสอัตโนมัติ: `fasting_complete` (เมื่อ success), `record_mood` (เมื่อมี mood)
5. แก้เวลาเริ่มย้อนหลัง ≤7 วัน ผ่าน `PATCH /if-sessions/edit-time` (เกิดช่วงอด แก้ `fasting_start_time`; เกิดช่วงกิน แก้ `fasting_end_time`/`eating_start_time` + คำนวณ duration ใหม่)
6. ยกเลิก session ที่ยัง active ได้ผ่าน `DELETE /if-sessions`

### 4.4 Stats / Health Dashboard
1. หน้า `/stats` เป็น Server Component (`getSessionUserId`) อ่าน `if_sessions`, `weight_logs`, `measurement_logs` ตรงๆ
2. เรียก `awardMission(userId, "view_stats")` ทุกครั้งที่เปิดหน้า (เควส "เข้าดูสถิติ")
3. คำนวณสรุปช่วง 1 สัปดาห์/1 เดือน/1 ปี: จำนวนครั้ง วันที่สำเร็จ ชั่วโมงอดรวม + กราฟน้ำหนัก/สัดส่วน/mood
4. แสดงกราฟ (chart.js) และการ์ดสรุป: แนวโน้มน้ำหนัก, สัดส่วน, mood รายเดือน, BMI

### 4.5 Healthy Journey (ระบบเควสและคะแนน)
1. ระบบ `awardMission` (`lib/healthy-journey-service.ts`) ถูกเรียกจากพฤติกรรมจริงเท่านั้น (เริ่ม IF, จบ IF, ดูสถิติ) — ผู้ใช้เลือกเควสเองไม่ได้
2. เควสรายวัน +50 XP (`missions` 4 ตัว มี `code` คงที่) — เควสซ้ำได้ 1 ครั้งต่อรอบ (รอบเริ่ม 09:00 ICT) ตรวจจาก `user_missions.user_id+mission_id` unique
3. XP เก็บที่ `healthy_journey.total_points` (สะสม ไม่ถูกหัก) → ระดับคำนวณจาก cumulative threshold 150×(1+…+L), cap level 9 (cum 6750)
4. Avatar = รูปไข่ SVG ตาม level (`/avatar/level0.svg…level9.svg`) ตั้งชื่อผ่าน `PATCH /api/v1/healthy-journey { avatarName }`
5. หน้า `/my-egg` แสดงคะแนน ระดับ progress bar และ Avatar

### 4.6 ระบบแจ้งเตือน (Notification)
1. **Cron ช่วง IF** (`GET|POST /api/cron/if-notifications`, Bearer `CRON_SECRET`) — Supabase pg_cron เรียกทุก 1 นาที:
   - อ่าน session `active` ทั้งหมด คำนวณจุดสิ้นสุดช่วงอด/กินจาก pattern
   - เมื่อครบเวลา → `sendPushMessage` ผ่าน LINE Messaging API; เตือนซ้ำทุก 10 นาทีภายใน 3 ชม. (กันสแปม)
   - ข้ามผู้ใช้ที่ `line_unreachable` / ปิดแจ้งเตือน / ยังไม่เพิ่ม OA เป็นเพื่อน (ตรวจ friendship ล่วงหน้า)
2. **Cron สรุปรายเดือน** (`GET|POST /api/cron/monthly-reminder`) — เรียกทุกวัน แต่ส่งเฉพาะวันที่ 1 ของเดือนไทย:
   - สรุป "อัปเดตน้ำหนัก/สัดส่วน" เฉพาะรายการที่ยังไม่ได้ทำเดือนนี้
   - Push แยกสำหรับ "ถ่ายรูปความคืบหน้า" ตาม `photo_reminder_enabled`
3. **Webhook** (`POST /webhooks/line`, ตรวจ `X-Line-Signature` HMAC-SHA256) — จัดการ `follow`/`unfollow` เพื่อผูก/ปลด OA และไล่ `line_unreachable`
4. ผู้ใช้กดลิงก์ในข้อความ (ลิงก์ LIFF) เพื่อกลับเข้าสู่ระบบ

### 4.7 เป้าหมายน้ำหนักและบันทึกน้ำหนัก (Weight Goal & Weight Log)
1. ตั้ง `target_weight`/`target_date` ที่หน้า Profile → เก็บใน `profiles`
2. บันทึกน้ำหนักผ่าน `POST /api/v1/weight-logs { weightKg }` — ระบบตรวจ **อย่างมาก 1 ครั้งต่อเดือนไทย** (`weight_logs` ล่าสุดอยู่เดือนก่อนหน้า/ไม่มีเลย) มิฉะนั้น 409 `WEIGHT_UPDATE_LOCKED`
3. `weight_logs` เป็น **single source of truth** ของน้ำหนัก (ไม่ sync `profiles.weight`)
4. หน้า Profile แสดง progress บันเทียบน้ำหนักล่าสุด vs เป้าหมาย + วันที่อัปเดตถัดไป

### 4.8 บันทึกสัดส่วน (Measurement Log)
1. ผู้ใช้กรอกเอว/สะโพก/อก (นิ้ว) ผ่าน `POST /api/v1/measurement-logs` (กรอกน้อยครบ 1 ค่า ก็ได้ ค่าที่ไม่ส่งจะ merge จากค่าปัจจุบัน)
2. ระบบตรวจ lock 1 ครั้ง/เดือนไทย เหมือน weight
3. บันทึกเป็นแถวใหม่ใน `measurement_logs` (เก็บ history) + sync ค่าล่าสุดขึ้น `profiles`

### 4.9 ถ่ายรูปความคืบหน้า (Progress Photo)
1. หน้า `/photo` แสดง gallery รายเดือน (GET `/progress-photos?months=12`) — แต่ละรูปได้ signed URL อายุ 24 ชม.
2. ผู้ใช้อัปโหลดรูป 3 มุม (up to 5 MB/รูป) → `POST /progress-photos` (multipart)
   - Server ตรวจ magic bytes (JPG/PNG/WEBP) ไม่เชื่อ `File.type`
   - ล็อกเดือนด้วย placeholder insert + unique index → กัน double-submit; เดือนที่ล็อกแล้ว → 409
   - อัปโหลดแบบ atomic — ถ้าขั้นใดล้มเหลว rollback ลบรูปที่อัปแล้วทิ้งทั้งหมด
3. เมื่อครบครบ 3 มุม เก็บ path ใน `progress_photos` และล็อกเดือนนั้นถาวร

### 4.10 ปฏิทินการทำ IF (IF Calendar)
1. หน้า `/calendar` เลือกเดือน → fetch `GET /if-sessions?month=YYYY-MM` (Server ตัดช่วงเดือนตามเวลาไทย)
2. `lib/calendar.ts` จับกลุ่ม session ต่อวัน → สถานะวัน: `success`/`fail`/`active`/`abandoned` (อ่านจาก `result` ที่ล็อกตอนจบ — ไม่คำนวณใหม่) + เลือก mood ที่จะแสดง
3. แสดง grid ปฏิทิน + สรุปจำนวนวันที่สำเร็จ/พลาด

---

## 5. การออกแบบฐานข้อมูล (Database Design)

### 5.1 สรุป schema ปัจจุบัน

สถานะจริง ณ ก.ย. 2026 (จาก `supabase/migrations/0001–0031`):

> หมายเหตุ: ตาราง `notifications` และ `line_link_codes` **ถูกลบทิ้งแล้ว** (migration 0029) ตาราง `weight_goals`/`notification_settings` **ไม่เคยถูกสร้าง** — เป้าหมายน้ำหนักเก็บใน `profiles` และ toggle แจ้งเตือนเป็นคอลัมน์บน `users`

**users** — 1 แถวต่อบัญชี LINE
- `user_id` (uuid, PK), `line_user_id` (text, unique, not null), `oa_user_id` (text, = line_user_id), `display_name`, `avatar_url`, `email`
- แจ้งเตือน: `line_notifications_enabled` (bool), `monthly_reminder_enabled` (bool|null → null = inherit), `photo_reminder_enabled` (bool), `line_onboarding_answered` (bool), `line_unreachable` (bool)
- Friendship cache: `line_friend` (bool), `line_friendship_checked_at` (timestamptz)
- Cron marker: `last_weight_reminder_at`, `last_measurement_reminder_at`, `last_monthly_reminder_at` (timestamptz)
- `created_at`

**profiles** — 1:1 กับ users
- `user_id` (uuid, PK→users)
- `gender` (male/female/other, CHECK), `birth_date` (date), `height` (numeric, cm), `goal` (weight_loss/eating_behavior/maintain_muscle/endurance_mindset)
- เป้าหมายน้ำหนัก: `target_weight` (numeric), `target_date` (date)
- สัดส่วน (sync จาก measurement_logs): `waist_in`, `hip_in`, `chest_in` (numeric)
- Legacy/ไม่ได้เขียนแล้ว: `weight`, `starting_weight`, `activity_level`, `if_pattern`, `last_measurement_update_at`
- `created_at`

**if_sessions** — 1 รอบ IF (อด+กิน)
- `id` (uuid, PK), `user_id` (FK→users)
- `if_pattern` (text: 12:12…20:4), `fasting_start_time` (timestamptz, not null), `fasting_end_time`, `fasting_duration_minutes` (int), `eating_start_time`, `eating_end_time`, `eating_duration_minutes` (int), `fasting_end_notified_at`/`eating_end_notified_at` (ครัง cron)
- `status` (active/completed/abandoned, CHECK), `result` (success/fail, CHECK, null เมื่อยังไม่จบ), `mood` (text 1 ใน 5 ระดับ, CHECK)
- Partial unique index: `if_sessions_one_active_per_user` (กัน session active ซ้ำคนเดียวกัน)
- `created_at`

**weight_logs** — บันทึกน้ำหนัก (single source of truth ของน้ำหนัก)
- `id` (uuid, PK), `user_id` (FK→users), `recorded_on` (date), `weight_kg` (numeric, CHECK > 0), `updated_at`
- Unique: `(user_id, recorded_on)`
- RLS เปิด, revoke grants

**measurement_logs** — บันทึกสัดส่วนรายเดือน
- `id` (uuid, PK), `user_id` (FK→users), `recorded_on` (date), `waist_in` (numeric, not null), `hip_in`, `chest_in`, `updated_at`
- Unique: `(user_id, recorded_on)`; CHECK ค่าต้อง > 0
- RLS เปิด, revoke grants

**progress_photos** — ชุดรูปความคืบหน้า
- `id` (uuid, PK), `user_id` (FK→users), `recorded_month` (date, รูป "yyyy-MM-01"), `view` (front/side/back, CHECK), `photo_path` (text — path ใน bucket), `created_at`
- Unique: `(user_id, recorded_month, view)`
- Storage bucket `progress-photos` (private) — เข้าถึงผ่าน signed URL
- RLS เปิด, revoke grants

**missions** — คำจำกัดความเควส
- `id` (uuid, PK), `code` (text, unique — key คงที่), `title`, `description`, `points` (int), `mission_type`, `is_daily` (bool), `created_at`
- Seed 4 ตัว: `start_if`, `fasting_complete`, `record_mood`, `view_stats` (ละ 50 XP)
- RLS เปิด, revoke grants

**user_missions** — สถานะเควสของผู้ใช้
- `id` (uuid, PK), `user_id` (FK→users), `mission_id` (FK→missions), `is_completed` (bool), `completed_at` (timestamptz|null)
- Unique: `(user_id, mission_id)` — เก็บ "ครั้งล่าสุดที่ทำสำเร็จ"
- RLS เปิด, revoke grants

**healthy_journey** — คะแนน/ระดับ/avatar
- `id` (uuid, PK), `user_id` (unique FK→users), `total_points` (int), `level` (int), `current_streak` (int), `longest_streak` (int), `last_active_date` (date), `avatar_name` (text), `created_at`
- Unique: `(user_id)`
- RLS เปิด, revoke grants

### 5.2 ความสัมพันธ์ระหว่างตาราง (Relationship)
- `users` 1—1 `profiles`
- `users` 1—N `if_sessions`, `weight_logs`, `measurement_logs`, `progress_photos`, `user_missions`
- `users` 1—1 `healthy_journey`
- `missions` 1—N `user_missions`

### 5.3 RLS / Grants
- **ทุกตาราง** เปิด RLS + `revoke all from anon, authenticated` (migration 0002 + ต่อๆ มา) — publishable key แตะตารางไม่ได้
- Server อ่าน/เขียนผ่าน **service role client** (bypass RLS) → app ต้อง scope `user_id` จาก JWT เองทุก query (defense-in-depth)

### 5.4 รายการ Migration (0001–0031)
| Migration | เนื้อหา |
|---|---|
| 0001 | users + profiles, RLS |
| 0002 | revoke grants ทุกตาราง |
| 0003 | profiles.activity_level |
| 0004 | profiles: waist/hip/chest_cm, target columns |
| 0005–0007 | if_sessions: if_pattern, eating columns, fasting_* rename |
| 0008 | get_if_session_stats (ถูก drop ใน 0029) |
| 0009 | partial unique index active-session |
| 0010 | status allow `abandoned` |
| 0011 | line notification foundation (`oa_user_id`, notified_at, line_link_codes) |
| 0012 | auto-bind (`line_notifications_enabled`, `line_unreachable`) |
| 0013 | onboarding prompt (`line_onboarding_answered`) |
| 0014 | friendship cache (`line_friend`, checked_at) |
| 0015 | measurements เปลี่ยนเป็นนิ้ว (waist_in/hip_in/chest_in) |
| 0016–0017 | weight tracking (`weight_kg`, `recorded_on`, `starting_weight`, RLS fix) |
| 0018 | gender + `other` + CHECK |
| 0019 | `measurement_logs` + RLS |
| 0020 | drop Google Health tables |
| 0022 | weight_logs = single source of truth |
| 0023–0024 | if_sessions mood (int → text) + CHECK |
| 0025 | if_sessions `result` success/fail + backfill |
| 0026 | `progress_photos` + storage bucket ส่วนตัว |
| 0027 | monthly reminder (`last_monthly_reminder_at`) |
| 0028 | healthy journey: missions.code + seed, avatar_name, unique, RLS |
| 0029 | drop: get_if_session_stats, line_link_codes, notifications |
| 0030 | split notification perms (`monthly_reminder_enabled`) |
| 0031 | `photo_reminder_enabled` |

---

## 6. การออกแบบส่วนติดต่อ (Interface Design)

### 6.1 ส่วนติดต่อผู้ใช้ (UI Overview)

LINE Mini App พัฒนาด้วย Next.js + LIFF SDK ทำงานภายใน LIFF Browser บน LINE Application มี Bottom Navigation 5 tabs: หน้าหลัก / รูปภาพ / IF / สถิติ / โปรไฟล์

หน้าจริงของระบบ:

1. **หน้า Landing (`/`)** - แนะนำแอป + ปุ่มเข้าสู่ระบบด้วย LINE (ซ่อน bottom nav)
2. **หน้า Dashboard (`/dashboard`)** - สรุปวันนี้: สถานะ IF, สถิติโดยย่อ, ลิงก์ปฏิทินและ "ไข่ของฉัน"
3. **หน้า IF Tracker (`/if`)** - จับเวลาแบบ real-time (อด/กิน), เลือก pattern, ปรับเวลา, จบ + เลือก mood
4. **หน้า Calendar (`/calendar`)** - ปฏิทินรายเดือน พร้อมสถานะวัน success/fail/active + mood badge + รายละเอียด
5. **หน้า Stats (`/stats`)** - สถิติ IF, กราฟน้ำหนัก/สัดส่วน, mood รายเดือน, BMI (เลือกช่วง 1W/1M/1Y)
6. **หน้า Photo (`/photo`)** - Gallery รูปความคืบหน้ารายเดือน + ปุ่มอัปโหลดชุดรูป (หน้า/ข้าง/หลัง)
7. **หน้า My Egg (`/my-egg`)** - Healthy Journey: คะแนน ระดับ progress bar Avatar "ไข่" + เปลี่ยนชื่อ
8. **หน้า Profile (`/profile`)** - ข้อมูลส่วนตัว, BMI, เป้าหมายน้ำหนัก + progress, บันทึกน้ำหนัก/สัดส่วน
9. **หน้า Health Profile (`/health-profile`)** - wizard กรอกข้อมูลครั้งแรก (ซ่อน bottom nav)
10. **หน้า `/logged-out`** - แจ้งออกจากระบบแล้ว
11. **หน้า Privacy (`/privacy`), Terms (`/terms`)** - นโยบาย/เงื่อนไข

### 6.2 ส่วนติดต่อระบบภายนอก

**6.2.1 LINE LIFF API**
- `liff.init()` เริ่มต้น, `liff.login()`, `liff.isLoggedIn()`, `liff.getIDToken()`
- `liff.getDecodedIDToken()` **ใช้แค่ UI แสดงผลเท่านั้น** — identity ต้อง verify ฝั่ง Server

**6.2.2 Supabase API**
- **service role client** (`lib/supabase/service.ts`, `server-only`) สำหรับ Route Handlers / Server Components
- Storage bucket ส่วนตัว + signed URLs สำหรับรูป progress
- pg_cron → pg_net สำหรับเรียก cron route

**6.2.3 LINE Messaging API**
- Push Message ผ่าน `LINE_CHANNEL_ACCESS_TOKEN`
- Friendship check: `GET /v2/bot/profile/{userId}`
- Webhook: ยืนยัน `X-Line-Signature` (HMAC-SHA256 + `LINE_CHANNEL_SECRET`)

---

## 7. การออกแบบสถาปัตยกรรมระบบ (System Architecture Design)

### 7.1 Component Diagram

ระบบแบ่งออกเป็น 5 ส่วนหลัก:

1. **Frontend Component (LIFF App)**
   - Server Components แสดงผล + Client Components โต้ตอบ (IfTracker, CalendarTab, Chart…)
   - เรียก Route Handlers (`/api/v1/*`) ผ่าน fetch

2. **Route Handlers / API Component (Next.js Backend)**
   - จัดการ business logic + authentication (`requireAuth()` อ่าน cookie `nj_session`)
   - verify LINE idToken ด้วย `jose` + LINE JWKS
   - เข้า Database ผ่าน service role client
   - แบ่งเป็น modules: auth, profile, if, weight, measurement, photo, journey, notification

3. **Cron / Scheduler Component**
   - Supabase pg_cron → pg_net เรียก `/api/cron/if-notifications` (ทุก 1 นาที) และ `/api/cron/monthly-reminder` (ทุกวัน)
   - ตรวจ `Authorization: Bearer CRON_SECRET`

4. **Database Component (Supabase)**
   - PostgreSQL + RLS, Storage bucket ส่วนตัว

5. **External Service Component**
   - LINE Platform (LIFF + Messaging API)

### 7.2 Data Flow Diagram

**Flow การติดตาม IF:**
1. `POST /api/v1/if-sessions/start` → สร้าง session `active` (ปิด session ค้างก่อนเป็น `abandoned`) + แจกเควส `start_if`
2. `POST /api/v1/if-sessions/end-eating` → จบอด เริ่มกิน
3. `POST /api/v1/if-sessions/end { session_id, mood }` → คำนวณ duration, `status=completed`, `result` success/fail, แจก `fasting_complete`/`record_mood`
4. Cron อ่าน session active → push LINE เมื่อครบเวลาช่วง
5. หน้า calendar/stats อ่าน `if_sessions` ตรงๆ ตามเดือน

**Flow บันทึกน้ำหนัก:**
1. `POST /api/v1/weight-logs` (lock 1 ครั้ง/เดือนไทย)
2. หน้า profile/dashboard อ่านสุดท้ายเทียบเป้าหมาย → progress
3. Cron รายเดือนเช็คว่าผู้ใช้ได้บันทึกน้ำหนัก/สัดส่วนเดือนนี้หรือยัง → ถ้ายัง push สรุป

**Flow ถ่ายภาพยนต์:**
1. `POST /api/v1/progress-photos` (multipart 3 รูป) → ตรวจ magic bytes → ล็อกเดือน → อัปโหลด → signed URL สำหรับแสดงผล

### 7.3 Sequence Flow

**Login Flow:**
1. User เปิด LINE Mini App → LIFF `init` → `login` → `getIDToken()`
2. Frontend `POST /auth/login { idToken }`
3. Server verify (jose + JWKS) → upsert `users` (+ `oa_user_id`) → ensure `profiles`
4. ตั้ง cookie `nj_session` → `{ user, profileComplete }`
5. profile ครบ → `/dashboard`; ไม่ครบ → `/health-profile`

**Notification Flow:**
1. pg_cron เรียก `/api/cron/*` (Bearer CRON_SECRET)
2. คำนวณผู้ที่ถึงกำหนด → ตรวจ friendship → `sendPushMessage` ผ่าน LINE Messaging API
3. อัปเดต marker (`*_notified_at` / `last_monthly_reminder_at`) หลังส่งสำเร็จเท่านั้น (retry คราวหน้า)
4. `follow`/`unfollow` webhook sync `line_unreachable`

---

## 8. การออกแบบความปลอดภัย (Security Design)

- **LINE Login (OAuth 2.0)** เป็นช่องทางยืนยันตัวตนหลัก ลดความเสี่ยงการจัดการรหัสผ่านเอง
- **Verify idToken ที่ Backend ทุกครั้ง** ด้วย `jose` + LINE JWKS, ตรวจ `iss=https://access.line.me` + `aud=LINE_CHANNEL_ID` — **ห้ามเชื่อ** `liff.getDecodedIDToken()`
- **Custom JWT session** (HS256, `jose`) ใน httpOnly cookie `nj_session` อายุ 7 วัน `SameSite=Lax` `Secure(prod)` — `requireAuth()` เป็น gate ทุก API (ยกเว้น `auth/login`)
- **Service role client** (`server-only`) เท่านั้น — `SUPABASE_SERVICE_ROLE_KEY` ไม่รั่ว client bundle
- **RLS เปิดทุกตาราง + revoke grant** `anon, authenticated`; ทุก query filter `user_id` จาก JWT ที่ app level
- **Zod** validate input ทุกตัว; `sessionId` บังคับ UUID; เวลาที่แก้ต้องไม่เกิน 7 วัน
- **File upload**: ตรวจ magic bytes (ไม่เชื่อ mimetype), ขนาด ≤5 MB, bucket ส่วนตัว, signed URL 24 ชม., atomic + rollback
- **Rate limiting**: `proxy.ts` (Next 16) — 60 req/min API ทั่วไป, 10 req/min `/auth/login`, 120 req/min webhook เตือน: เป็น **per-instance** (in-memory) บน Vercel ต้องย้ายไป store กลางถ้าเจอ abuse จริง
- **Webhook**: ตรวจ `X-Line-Signature` (HMAC) — เสียค่าอนุญาต 401
- **Cron**: ตรวจ `Authorization: Bearer CRON_SECRET` (ผ่าน header เท่านั้น ไม่รับผ่าน query string)
- **Secrets**: ทั้งหมดใน env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_LIFF_ID`, `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `SESSION_SECRET` ≥32 ตัว, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) — ห้าม commit `.env*`

---

## 9. แผนการทดสอบระบบ (Testing Plan)

| ประเภทการทดสอบ | เครื่องมือ | ขอบเขต |
|---|---|---|
| Unit Test | Vitest (`npm test`) | `lib/*` logic: auth, if, calendar, timezone, weight-log, measurement-log, progress-photo, healthy-journey, line-messaging, line-friendship, monthly-reminder, if-notifications, validation, profile |
| Lint / Build | ESLint + `next build` (CI) | ทุก PR ผ่าน GitHub Actions |
| API Testing | Postman | Auth, IF Session, Weight/Measurement Log, Progress Photo, Notification Settings |
| End-to-End | Playwright (วางแผน) | Login → Health Profile → เริ่ม IF → จบ IF → ดู Calendar/Dashboard |

---

## 10. แผนการดำเนินงาน (Project Timeline)

| ขั้นตอน | กิจกรรม | ระยะเวลา | สถานะ |
|---|---|---|---|
| 1 | ศึกษาและวิเคราะห์ความต้องการ | สัปดาห์ที่ 1-2 | เสร็จแล้ว |
| 2 | ออกแบบ UI/UX ด้วย Figma | สัปดาห์ที่ 2-3 | เสร็จแล้ว |
| 3 | ตั้งค่าโครงการ Next.js + Supabase | สัปดาห์ที่ 3-4 | เสร็จแล้ว |
| 4 | พัฒนาระบบยืนยันตัวตน (LINE Login) | สัปดาห์ที่ 4-5 | เสร็จแล้ว |
| 5 | พัฒนาระบบ IF Tracker | สัปดาห์ที่ 5-6 | เสร็จแล้ว |
| 6 | พัฒนาระบบ Healthy Journey (Gamification) | สัปดาห์ที่ 6-7 | เสร็จแล้ว |
| 7 | พัฒนาระบบเป้าหมายน้ำหนัก + บันทึกน้ำหนัก/สัดส่วน | สัปดาห์ที่ 7-8 | เสร็จแล้ว |
| 8 | พัฒนาระบบแจ้งเตือนผ่าน LINE OA | สัปดาห์ที่ 8-9 | เสร็จแล้ว |
| 9 | พัฒนาระบบ Stats/Dashboard และ IF Calendar | สัปดาห์ที่ 9-10 | เสร็จแล้ว |
| 10 | ถ่ายรูปความคืบหน้า (Progress Photo) | เพิ่มเติม | เสร็จแล้ว |
| 11 | ทดสอบระบบและแก้ไขข้อผิดพลาด | สัปดาห์ที่ 10-12 | อยู่ระหว่างดำเนินการ |
| 12 | จัดทำเอกสารและนำเสนอโครงการ | สัปดาห์ที่ 12-13 | อยู่ระหว่างดำเนินการ |

---

## 11. เครื่องมือที่ใช้ (Tools)

### 11.1 Design
- Figma

### 11.2 Code
- Next.js 16 (React 19, TypeScript), Tailwind CSS v4
- LINE LIFF SDK, LINE Messaging API
- Supabase JavaScript SDK (service-role client), jose, zod, chart.js, react-day-picker
- Vitest

### 11.3 Deploy
- Vercel, GitHub + GitHub Actions

### 11.4 Testing
- Vitest, Postman, Playwright, LINE Official Account / LIFF Emulator

---

## 12. ประโยชน์ที่คาดว่าจะได้รับ (Expected Benefits)

12.1 ผู้ใช้สามารถติดตามพฤติกรรมการดูแลสุขภาพได้อย่างสะดวกผ่าน LINE

12.2 ผู้ใช้สามารถติดตามการทำ Intermittent Fasting (IF) ได้อย่างเป็นระบบ

12.3 ผู้ใช้ได้รับการแจ้งเตือนผ่าน LINE Official Account เพื่อช่วยสร้างวินัยและความต่อเนื่องในการดูแลสุขภาพ

12.4 ระบบช่วยส่งเสริมการสร้างพฤติกรรมการดูแลสุขภาพที่ดีผ่านฟีเจอร์ Healthy Journey และการติดตามความก้าวหน้า

12.5 ผู้ใช้สามารถตั้งเป้าหมายน้ำหนัก/บันทึกน้ำหนัก/สัดส่วน/ถ่ายรูปความคืบหน้า และติดตามผลอย่างเป็นระบบ พร้อมดูประวัติการทำ IF ย้อนหลังผ่านปฏิทิน

---

## 13. การออกแบบ REST API

### 13.1 ข้อตกลงพื้นฐาน (Conventions)

| ข้อ | รายละเอียด |
|---|---|
| Base URL | `/api/v1` |
| Auth | Custom JWT (sign ด้วย `jose`, HS256) เก็บใน httpOnly cookie `nj_session` อายุ 7 วัน, `SameSite=Lax`, `Secure` |
| Body | JSON ทั้งหมดผ่าน Zod ทุก endpoint (ยกเว้น `progress-photos` = multipart/form-data) |
| Response | Envelope `{ success, data, error }` |
| Timezone | ระบบใช้ **เวลาไทย (ICT, UTC+7) เป็นเวลาอ้างอิงฝั่ง Server** ผ่าน `lib/timezone.ts` — client ไม่ต้องส่ง offset |
| Month query | `?month=YYYY-MM` (ปฏิทิน/รายการ IF ตัดขอบเดือนแบบไทย) |
| Rate Limit | `proxy.ts` (`/api/:path*` + `/webhooks/*`): 60 req/min/IP, `/auth/login` 10 req/min, webhook 120 req/min — per-instance (in-memory) |
| Webhook | `POST /webhooks/line` ตรวจ `X-Line-Signature` (HMAC-SHA256) |
| Cron | `GET|POST /api/cron/*` ตรวจ `Authorization: Bearer CRON_SECRET` |

**Error envelope** — `{ success: false, error: { code, message, details? } }`

| HTTP Status | Code | ความหมาย |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input ไม่ผ่าน Zod |
| 401 | `UNAUTHORIZED` | ไม่มี session / idToken ไม่ถูกต้อง / CRON secret ไม่ถูก |
| 404 | `NOT_FOUND` | ไม่พบ resource |
| 409 | `CONFLICT` | ขัดกับสถานะปัจจุบัน (session active ซ้ำ, กำลังจบอีกครั้ง, lock เดือน, ล็อกน้ำหนัก/สัดส่วนเดือนนี้แล้ว) |
| 429 | `RATE_LIMITED` | เกินอัตราการเรียก (จาก proxy.ts) |
| 500 | `INTERNAL_ERROR` | ข้อผิดพลาดภายในระบบ |

**Public (ไม่ต้อง auth):** `POST /auth/login`, `POST /webhooks/line`, `GET|POST /api/cron/*` — นอกนั้นทั้งหมดผ่าน `requireAuth()` (verify cookie JWT แล้ว inject `userId` เข้า handler)

### 13.2 ตาราง Endpoints (ตามจริง)

#### 13.2.1 Auth

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ idToken }` | verify LINE idToken → upsert `users` (+`oa_user_id`) + ensure `profiles` → set cookie → `data: { user, profileComplete }` |
| POST | `/auth/logout` | — | clear cookie |
| GET | `/auth/me` | — | `data: { user (ไม่รวม line/oa id), profile }` |

#### 13.2.2 Profile

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/profile` | `{ gender, birthDate, heightCm, weightKg, waistIn, hipIn, chestIn, goal, targetWeightKg }` | save wizard; เขียน weight_logs/measurement_logs ถ้าค่าต่างจากล่าสุด; upsert profiles |
| PATCH | `/profile` | `{ gender, birthDate, heightCm, goal, targetWeightKg }` | อัปเดตเฉพาะข้อมูลคงที่ (ไม่แตะน้ำหนัก/สัดส่วน) |

#### 13.2.3 IF Sessions

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/if-sessions/start` | `{ if_pattern }` | สร้าง session active (ปิด session ค้างเป็น abandoned) + award `start_if`; race → คืน session ที่ชนะ |
| POST | `/if-sessions/end-eating` | `{ session_id }` | จบช่วงอด → เริ่มช่วงกิน (`fasting_end_time`, `eating_start_time`) |
| POST | `/if-sessions/end` | `{ session_id, mood }` | จบรอบ: completed + `result` success/fail + award `fasting_complete`/`record_mood` |
| GET | `/if-sessions?month=YYYY-MM` | — | รายการ session ในเดือน (ขอบเดือนแบบไทย) |
| GET | `/if-sessions/active` | — | session active ปัจจุบัน หรือ null |
| PATCH | `/if-sessions/edit-time` | `{ session_id, newStartTime }` | แก้เวลาเริ่มย้อนหลัง ≤7 วัน (ไม่เป็นอนาคต) + คำนวณ duration ถ้าอยู่ช่วงกิน |
| DELETE | `/if-sessions` | `{ session_id }` | ยกเลิก session (เฉพาะที่ยัง active) |

#### 13.2.4 Weight Logs

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/weight-logs` | `{ weightKg }` | บันทึกน้ำหนัก — lock 1 ครั้ง/เดือนไทย (409 `WEIGHT_UPDATE_LOCKED`) |

#### 13.2.5 Measurement Logs

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/measurement-logs` | `{ waistIn?, hipIn?, chestIn? }` (อย่างน้อย 1) | บันทึกสัดส่วน — lock 1 ครั้ง/เดือนไทย; merge ค่าที่ไม่ส่งจาก profile แล้ว sync กลับ |

#### 13.2.6 Progress Photos

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/progress-photos?months=12` | — | ชุดรูป (front/side/back) รายเดือนพร้อม signed URL |
| POST | `/progress-photos` | multipart: `front` + `side` + `back` (≤5 MB/รูป, JPG/PNG/WEBP) | ล็อกเดือน + อัปโหลด atomic (409 ถ้าเดือนล็อกแล้ว) |

#### 13.2.7 Healthy Journey

| Method | Path | Request | Response |
|---|---|---|---|
| PATCH | `/healthy-journey` | `{ avatarName }` (≤20 ตัวอักษร) | เปลี่ยนชื่อไข่ (avatar); สร้างแถว level 0 ถ้ายังไม่มี |

#### 13.2.8 Notifications (LINE)

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/notifications/settings` | `{ ifNotifications?, monthlyReminder?, photoReminder? }` (≥1) | เปิด/ปิดแจ้งเตือนแยกประเภท + คืนสถานะรวม |
| GET | `/line/link` | — | readiness: linked, 3 toggle, unreachable, onboarded, friend |
| POST | `/line/link` | — | ตอบ "ใช่" ตอน onboarding: เปิดทุกประเภท + ตรวจ friendship ใหม่ |
| DELETE | `/line/link` | — | ปิดทุกประเภท (ตอบ "ไม่" หลังๆ) |
| POST | `/line/link/dismiss` | — | ตอบ "ไม่" ครั้งเดียวตอนแรก login โดยไม่เปิดแจ้งเตือน (จะไม่ถามอีก) |
| POST | `/webhooks/line` | LINE payload (ตรวจ `X-Line-Signature`) | จัดการ follow/unfollow → sync `oa_user_id`/`line_unreachable` |

#### 13.2.9 Cron (`Authorization: Bearer CRON_SECRET`)

| Method | Path | หน้าที่ |
|---|---|---|
| GET/POST | `/api/cron/if-notifications` | ทุก 1 นาที — push เตือนหมดช่วงอด/กิน ให้ session active |
| GET/POST | `/api/cron/monthly-reminder` | ทุกวัน (ส่งเฉพาะวันที่ 1 เดือนไทย) — สรุปอัปเดตน้ำหนัก/สัดส่วน + เตือนถ่ายรูป |

### 13.3 โครงสร้างไฟล์ (Folder Structure)

```
app/
  page.tsx                          Landing
  layout.tsx                        Root layout (font, BottomNav)
  dashboard/ page.tsx               Server Component
  if/ page.tsx                      IF Tracker
  calendar/ page.tsx                IF Calendar
  stats/ page.tsx                   Stats (awardMission view_stats)
  photo/ page.tsx                   Progress photo gallery
  my-egg/ page.tsx                  Healthy Journey
  profile/ page.tsx                 Profile
  health-profile/ page.tsx          First-time wizard
  logged-out/ page.tsx
  privacy/ page.tsx, terms/ page.tsx
  api/v1/
    auth/ login/route.ts, logout/route.ts, me/route.ts
    profile/ route.ts
    weight-logs/ route.ts
    measurement-logs/ route.ts
    progress-photos/ route.ts
    if-sessions/ route.ts, active/route.ts, start/route.ts,
                 end-eating/route.ts, end/route.ts, edit-time/route.ts
    healthy-journey/ route.ts
    notifications/ settings/route.ts
    line/ link/route.ts, link/dismiss/route.ts
  api/cron/
    if-notifications/route.ts
    monthly-reminder/route.ts
  webhooks/line/route.ts
lib/
  auth.ts            session JWT (jose) + requireAuth()
  line.ts            verify LINE idToken (jose + JWKS)
  line-messaging.ts  LINE Messaging API + build messages + signature verify
  line-friendship.ts friendship check + cache
  line-link.ts       notification readiness state
  response.ts        apiSuccess / apiError envelope
  validation.ts      Zod schemas
  timezone.ts        ICT (+7) helpers
  if.ts              patterns, moods, result computation
  calendar.ts        day status/mood aggregation for calendar
  if-notifications.ts cron timing logic (pure)
  profile.ts         BMI + profile completeness + options
  weight-log.ts      monthly weight gate (pure)
  measurement-log.ts monthly measurement gate (pure)
  progress-photo.ts  photo rules + magic-byte detection (pure)
  healthy-journey.ts level/XP thresholds + avatar (pure)
  healthy-journey-service.ts awardMission / renameAvatar (DB)
  monthly-reminder.ts cron decision (pure)
  supabase/ service.ts      service-role client (server-only)
            storage.ts      bucket upload/signed-url/delete
  __tests__/                  Vitest unit tests
components/                 IfTracker, CalendarTab, WeightChart,
                            ProgressPhotoGallery, EggAvatarCard,
                            BellButton, Modal, BottomNav, …
proxy.ts                    rate limiting (Next 16 Proxy)
supabase/migrations/        0001…0031 (idempotent)
```

### 13.4 การเพิ่มเติมฐานข้อมูล (Database Additions)

- ปัจจุบันมี schema 9 ตาราง (ดูหัวข้อ 5) — ครอบคลุมทุกฟีเจอร์ที่ implement แล้ว
- ห้ามสร้างตารางซ้ำ; ถ้าต้องเพิ่ม feature ใหม่ ให้เพิ่ม migration ตัวถัดไป (`0032_…`) แบบ idempotent (`create table if not exists`) + เปิด RLS + `revoke all from anon, authenticated` เสมอ

### 13.5 Security ที่ฝังในทุก Endpoint

- `requireAuth()` verify JWT cookie ก่อนเข้าทุก handler; `userId` มาจาก cookie ที่ sign โดยระบบ — **ไม่เชื่อ** `liff.getDecodedIDToken()` ตรง ๆ
- Zod validate input ทุกตัว; `sessionId` ต้องเป็น UUID; ใช้ Supabase SDK (ไม่ใช่ string concat) กัน SQL Injection
- ทุก query `eq("user_id", auth.userId)` — service role bypass RLS ต้องบังคับ scope ที่ app level
- Rate limit ผ่าน `proxy.ts` (per-instance) + webhook ตรวจ `X-Line-Signature` + cron ตรวจ `CRON_SECRET`
- รูปภาพ: ตรวจ magic bytes, จำกัดขนาด, bucket ส่วนตัว + signed URL (ไม่เปิด public)

---

## 14. Theme

- Brand color palette: `#18A659` (เขียว — primary/brand, ใช้ accent ปฏิทิน, ปุ่ม, active nav)
- Background: `#FAF8F7` (พื้นหลัง), Foreground: `#000000`
- Accent soft: `#E0F4E8` (พื้นหลัง highlight ของ react-day-picker)
- Font: Inter (latin) + Noto Sans Thai (thai) — ตั้งผ่าน `next/font/google` + Tailwind v4 `@theme`
- ใช้ Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline`)