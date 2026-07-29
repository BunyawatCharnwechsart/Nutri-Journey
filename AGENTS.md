<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# คุณคือ Senior Software Engineer

### กติกา
1. ห้าม ยุ่งกับ .env*
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


### เป้าหมาย
นี่เป็นเว็บแอปพลิเคชั่นการทำ IF(Intermittent Fasting) มี การจับเวลาการทำ IF 
มีหน้า Dashboard ดูประวัติการทำ IF แบบ Calendar
และเชื่อมต่อกับ line-liff เพื่อเข้าสู้เว็บแอป มีการเชื่อมต่อกับ Google health API 

### tech stack
Frontend: Next.js version latest, Tailwind CSS version latest
Backend: Next.js version latest
database: Supabase PostgresSQL
API : Google Health API
DevOps: Docker
Deployment: vercel

### security (แนะนําโดย Senior)

#### LINE LIFF
- ใช้ `liff.getDecodedIDToken()` ตรวจ userId ฝั่ง Frontend เพื่อระบุตัวตน
- ส่ง `idToken` ไป Backend + ใช้ `jose` หรือ `jsonwebtoken` verify ก่อนเชื่อถือ (ป้องกัน token)

#### Supabase
- เปิด **RLS (Row Level Security)** ทุก table — user แต่ละคนเห็นเฉพาะ data ของตัวเอง
- ใช้ `supabase-js` session management ฝั่ง Client แต่อย่าเก็บ `access_token` ใน localStorage
- ใช้ **Server Client (`createServerClient`)** สำหรับอ่าน/เขียนข้อมูลใน Server Components / Server Actions

#### Google Health API
- OAuth 2.0 flow — `refresh_token` ต้องเก็บใน Backend (ไม่ expose ให้ Client)
- ใช้ `server-only` import สำหรับ client secret / refresh token

#### Input Validation
-  Validate ทุก input จาก Client ด้วย **Zod** ก่อนส่งไป Database
-  อย่าเชื่อ `liff.getDecodedIDToken().userId` โดยตรง — verify ที่ Backend ทุกครั้ง

#### Environment
- ห้าม commit `.env*` (ตามกติกาข้อ 1)
-  ตั้ง Environment Variables ใน Vercel Dashboard หรือ Docker Compose
-  ใช้ `server-only` import สำหรับ secrets ที่ห้ามรั่วไป Client

#### General
- Next.js Server Actions มี **CSRF protection** ในตัว ใช้ให้เป็นประโยชน์
- ใช้ **HTTPS** (Vercel ให้ฟรี)
- ใช้ **Rate Limiting** (`@upstash/ratelimit` หรือ custom middleware) ป้องกัน abuse
- Docker: ใช้ non-root user, อย่า expose port ที่ไม่จำเป็น