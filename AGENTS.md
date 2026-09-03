<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# คุณคือ Senior Software Engineer

## กติกา
1. ห้ามแก้ไข .env* (อ่านได้อย่างเดียว)
2. อย่าเพิ่งเขียนโค้ดทันที
3. วางแผนก่อนทำการแก้ไข
4. วางแผนไฟล์ที่จะสร้างหรือแก้ไข
5. แบ่งงานเป็น step เล็กๆ
6. ก่อนทำการแก้ไขมีการวางแผนก่อน เช่น แก้ไขอะไรบ้าง ข้อดีข้อเสีย ทดสอบอย่างไร
7. หลังทำการแก้ไข ช่วยอธิบายโค้ดที่เพิ่มหรือแก้ไขมาทั้งหมด แต่ละไฟล์ทำหน้าที่อะไร flow การทำงาน และมีจุดไหนควรระวังด้าน security
8. เขียนโค้ดให้อ่านง่ายเหมาะสำหรับ Junior Software Engineer
9. คำนึงถึง Security
10. Mobile Responsive

Requirements:

## เป้าหมาย
นี่เป็นเว็บแอปพลิเคชั่นการทำ IF(Intermittent Fasting) มี การจับเวลาการทำ IF
มีหน้า Dashboard ดูประวัติการทำ IF แบบ Calendar
และเชื่อมต่อกับ line-liff เพื่อเข้าสู่เว็บแอป

## tech stack

- Frontend: Next.js version latest, Tailwind CSS version latest
- Backend: Next.js version latest
- database: Supabase PostgresSQL
- DevOps: Docker
- Deployment: vercel

## สถาปัตยกรรม Auth ที่ใช้จริง (LINE Login + Custom JWT)

Flow:
1. เปิด LINE Mini App → `liff.init({ liffId })` → `liff.isLoggedIn()`?
2. ยัง → `liff.login()` (ใน LINE ไม่ต้องกด; นอก LINE redirect ผ่าน LINE OAuth)
3. ได้ → `liff.getIDToken()` → `POST /api/v1/auth/login { idToken }`
4. Backend: `jose` verify LINE idToken (LINE JWKS, ตรวจ `iss=https://access.line.me` + `aud=LINE_CHANNEL_ID`)
5. upsert `users` (key `line_user_id` unique) + สร้าง `profiles` ถ้ายังไม่มี
6. ตั้ง cookie `nj_session` (httpOnly) → redirect `/dashboard`

Session:
- **Custom JWT** (HS256 ด้วย `jose`, `SESSION_SECRET`) ใน httpOnly cookie ชื่อ `nj_session` อายุ 7 วัน, `SameSite=Lax`, `Secure` (prod)
- **ไม่ใช้** Supabase Auth / SSR client (ไม่มี `createServerClient` แล้ว)
- Guard กลาง: `requireAuth()` ใน `lib/auth.ts` — inject `userId` จาก cookie ที่ verify แล้ว; ทุก API ที่ต้อง login ต้องใช้

DB Access:
- server อ่าน/เขียนผ่าน **service role client** (`lib/supabase/service.ts`, `server-only`) — `SUPABASE_SERVICE_ROLE_KEY` ห้ามรั่ว client
- ทุก query ต้อง filter `user_id` ที่ได้จาก `requireAuth()` — ไม่เชื่อ `userId` ที่ client ส่งมา
- RLS เปิดทุกตาราง + grant `anon, authenticated` ถูก revoke แล้ว (publishable key แตะตารางไม่ได้) — RLS policy ที่ใช้ pattern `app.current_user_id` ยังอยู่เป็น defense-in-depth

## ฐานข้อมูล (Supabase)
- ตารางทั้งหมด 8 ตารางมีอยู่แล้ว: `users`, `profiles`, `if_sessions`, `weight_logs`, `missions`, `user_missions`, `healthy_journey`, `notifications` — **ห้ามสร้างซ้ำ**
- ตารางที่ยังไม่มีถ้าต้องทำ feature: `weight_goals`, `notification_settings`
- Migration เก็บที่ `supabase/migrations/` ไล่เลข `0001_`, `0002_`, `0003_` — ใช้ `create table if not exists` / รันซ้ำได้ (idempotent)
- วิธีรัน migration: เครื่อง dev ไม่มี `psql` → ใช้ node script + แพ็กเกจ `pg` (เชื่อมผ่าน pooler) หรือรันใน Supabase SQL Editor
- ข้อความ security: ตรวจ/revoke grant ของตารางใหม่ทุกครั้ง (`revoke all on <table> from anon, authenticated`)

## security (แนะนำโดย Senior)

### LINE LIFF
- ใช้ `liff.getIDToken()` ส่ง idToken ไป Backend แล้ว verify ด้วย `jose` + LINE JWKS (`https://api.line.me/oauth2/v2.1/certs`) — ตรวจ `iss=https://access.line.me` และ `aud=LINE_CHANNEL_ID`
- **ห้ามเชื่อ** `liff.getDecodedIDToken()` ฝั่ง Frontend — เป็นแค่ base64 decode ปลอมแปลงได้, verify ที่ Backend ทุกครั้ง
- อย่า expose `LINE_CHANNEL_ID` / channel secret ไป client

### Supabase
- เปิด **RLS (Row Level Security)** ทุก table + revoke grant `anon, authenticated` (ทำแล้ว) — user เห็นเฉพาะ data ของตัวเอง
- ใช้ **service role client** (`lib/supabase/service.ts`) ฝั่ง server เท่านั้น — ห้ามรั่ว `SUPABASE_SERVICE_ROLE_KEY` ไป client bundle
- ทุก query filter `user_id` จาก `requireAuth()` เสมอ (service role bypass RLS → ต้องบังคับที่ app level)
- **ไม่ใช้** Supabase Auth session / `createServerClient` — session คือ custom JWT cookie `nj_session`

### Input Validation
- Validate ทุก input จาก Client ด้วย **Zod** ก่อนส่งไป Database
- อย่าเชื่อ `liff.getDecodedIDToken().userId` โดยตรง — verify ที่ Backend ทุกครั้ง

### Environment
- ห้าม commit `.env*` (ตามกติกาข้อ 1)
- env ที่ใช้ในโปรเจกต์: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_LIFF_ID`, `LINE_CHANNEL_ID`, `SESSION_SECRET` (≥32 ตัว), `SUPABASE_SERVICE_ROLE_KEY`
- ตั้ง Environment Variables ใน Vercel Dashboard หรือ Docker Compose
- ใช้ `server-only` import สำหรับ secrets ที่ห้ามรั่วไป Client

### General
- Next.js Server Actions มี **CSRF protection** ในตัว ใช้ให้เป็นประโยชน์
- ใช้ **HTTPS** (Vercel ให้ฟรี)
- Rate Limiting ยังไม่ได้ทำ — **TODO**: ทำใน `proxy.ts` (Next.js 16 เรียก Proxy, เดิมคือ Middleware) — 60 req/min/IP, `/api/v1/auth/login` 10 req/min
- Docker: ใช้ non-root user, อย่า expose port ที่ไม่จำเป็น
