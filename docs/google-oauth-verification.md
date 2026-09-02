# Google OAuth Data Access Verification — Nutri-Journey

> เอกสารเตรียมยื่น **Data Access Verification / App Verification** สำหรับ OAuth Client
> `544022875596-vtl12n4gef5rmvf9ekrjvu2kjmmqfmkd.apps.googleusercontent.com`
>
> **สถานะสโคป:** ขอ 👉 **1 scope** (`googlehealth.activity_and_fitness.readonly`)
> — เดิมขอ 3 ตัว แต่ `sleep`/`health_metrics` ยังไม่ได้ใช้จริง → ตัดก่อนยื่น (Google ไม่รับ "ขอเผื่อใช้งานทีหลัง")

---

## TL;DR

| หัวข้อ | สรุป |
|---|---|
| แอป | Nutri-Journey — Intermittent Fasting tracker (LINE Mini App / LIFF) ภาษาไทย |
| Scope ที่ยื่น | `googlehealth.activity_and_fitness.readonly` (อ่านอย่างเดียว) |
| ข้อมูลที่ใช้จริง | steps, distance, active energy burned, total calories — คิดเป็นรายวัน (daily roll-up) |
| ที่จัดเก็บ | `daily_metrics` (steps, distance_meters, kcal) ใน Supabase เฉพาะ aggregate |
| UI ที่แสดง | Dashboard → Google Health section: การ์ด 3 ใบ (ก้าวเดิน/ระยะทาง/แคลอรี่) + ตาราง 7 วัน |
| การแชร์ | ไม่มี (ไม่มี ads/analytics/third party) |
| การลบ | กด Disconnect = revoke token ที่ Google + mark `revoked_at`; ลบ account → purge ภายใน 30 วัน |
| OAuth flow | server-side only, state nonce HS256 10 นาที, token เก็บใน DB ไม่ลง client |

---

## 1) คำตอบช่อง "How will the scopes be used?" — วางได้เลย

```
SCOPE: googlehealth.activity_and_fitness.readonly — the only scope we request.

1. SPECIFIC DATA ACCESSED
When the signed-in user taps "Sync" on the Dashboard (button "ซิงค์ข้อมูลจาก
Google Health"), we call Google Health daily-roll-up endpoints for these data
types only:
  - steps (count per day)
  - distance (km per day)
  - active energy burned (kcal per day)
  - total calories (kcal per day)
No other data type under this scope (e.g. heart rate, raw time series) is read,
processed or stored.

2. WHY IT IS NEEDED
Nutri-Journey is an intermittent-fasting tracker. We show the user their daily
activity (steps, distance, calories) next to their fasting/eating windows so
they can see how their movement and energy output correlate with fasting. The
data is the user's own activity from their own Google account, read-only.

3. HOW THE DATA IS DISPLAYED/USED
The sync runs ONLY server-side (Next.js API route /api/v1/google-health/sync):
we fetch the daily aggregates, then store only the daily totals per user
(steps, distance_meters, kcal) in our PostgreSQL database (Supabase) under a
new row keyed by user+date in the daily_metrics table. The Dashboard then
renders three summary cards (steps, distance, calories) and a 7-day daily
table. The data is shown only to the account owner; it is never sent to the
browser as raw Google data — only the stored aggregates are read back.

4. SHARING / TRANSFER / STORAGE
No sharing. The data is not sold, not transferred to third parties, not used
for advertising or analytics, and not combined with other products or
services. No raw or time-series data is retained — only the daily aggregates
above. OAuth tokens are stored server-side only (never in the client bundle).

5. RETENTION & DELETION
Data is kept while the user maintains an account. Users can disconnect Google
Health at any time from the app (button "ยกเลิกการเชื่อมต่อ"), which revokes
our OAuth token at Google and marks the connection revoked in our database.
On account deletion, all user data is purged within 30 days. Privacy policy:
https://www.nutrijourney88.com/privacy  Terms: https://www.nutrijourney88.com/terms
```

---

## 2) คำตอบช่อง "Additional info" — วางได้เลย

```
APP: Nutri-Journey (Nutri Journey) — an intermittent-fasting (IF) health tracker
distributed as a LINE Mini App (LINE LIFF) for Thai-speaking users. Users track
fasting/eating windows, weight goals, and daily activity, and view history on a
calendar dashboard.

LOGIN: The app authenticates via LINE Login only (LINE OAuth). There is no
email/password flow. External reviewers therefore need access to a LINE account
to sign in. We will provide a dedicated test LINE account with pre-connected
Google data, plus a screen-recording walkthrough of every screen that displays
Google Health data.

INFRASTRUCTURE: Production is hosted on Vercel. Primary domain:
https://www.nutrijourney88.com (old deployment domain
https://nutri-journey-hazel.vercel.app remains reachable). Google OAuth redirect
URI: https://www.nutrijourney88.com/api/v1/google-health/callback.
OAuth flow: the app generates a signed state nonce (HS256, 10-min expiry,
httpOnly cookie) -> user authorizes on Google -> the callback verifies the state,
exchanges the code server-side, and stores tokens ONLY in our server-side
database (Supabase, service role, RLS protected; never in the browser).

SCOPES (read-only): a single scope — googlehealth.activity_and_fitness.readonly —
used only to fetch the user's own daily steps, distance, and calories, store the
daily aggregates, and display them on the Dashboard (three summary cards + a
7-day table). We request OAuth "offline" access and re-request consent
(prompt=consent) so users always see the permission screen. Tokens are refreshed
server-side and never exposed to the client bundle.

DATA USE & SHARING: Google Health data is used solely to show the user their own
activity metrics on the Dashboard. There is no advertising, no analytics, and no
sharing with third parties. Only daily aggregates are stored; raw time-series are
not retained.

RETENTION & DELETION: Data is kept while the user has an account (see privacy
policy: https://www.nutrijourney88.com/privacy). Users can disconnect Google
Health at any time from the app, which revokes the OAuth token at Google and
marks the connection revoked in our database. On account deletion, data is
removed (policy commits to removal within 30 days).

OTHER PROJECTS: No other GCP/OAuth project is involved — this is the only project
that uses OAuth for this product. Test users: a dedicated test LINE account will
be provided; the Google reviewer's test email will be added as a test user in the
OAuth consent screen.

CONTACT: via the LINE Official Account (shown in the app) or the app support
channels.
```

---

## 3) ค่าที่ต้องกรอก / ตั้งค่าให้ตรง

| รายการ | ค่า |
|---|---|
| OAuth Client ID | `544022875596-vtl12n4gef5rmvf9ekrjvu2kjmmqfmkd.apps.googleusercontent.com` |
| Project Number | `544022875596` (ใช้เพียงโปรเจกต์เดียว) |
| Redirect URIs (Authorized) | `https://www.nutrijourney88.com/api/v1/google-health/callback` |
| ที่อยู่ของแอป | `https://www.nutrijourney88.com/` |
| Privacy Policy URL | `https://www.nutrijourney88.com/privacy` |
| Terms of Service URL | `https://www.nutrijourney88.com/terms` |
| Scope ที่จะยื่น | `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly` |
| สถานะ publish | Production (public) — สำหรับ restricted scope |
      
---

## 4) Checklist ก่อนยื่น (ต้องทำครบ)

- [ ] **แก้ `SCOPES` ใน `lib/google-health.ts:14` ให้เหลือ scope เดียว** แล้ว redeploy
      (ถ้ายังไม่ทำ ควัน consent จะขอ 3 ตัว ไม่ตรงคำตอบฟอร์ม)
- [ ] เพิ่ม Authorized redirect URI ใหม่ `https://www.nutrijourney88.com/api/v1/google-health/callback`
      ใน Google Cloud Console → OAuth Client (keep อันตรง domain เก่าไว้ก่อน)
- [ ] Privacy policy **เป็นภาษาอังกฤษ (หรือ bilingual)** + ระบุ scope นี้ชัดเจน
      (ตอนนี้ `/privacy` เป็นภาษาไทยล้วน)
- [ ] Terms of Service ลิงก์สาธารณะได้ (`https://www.nutrijourney88.com/terms`)
- [ ] Capture **screenshots / screen recording**: Dashboard → Google Health
      (หน้าสถานะเชื่อมต่อ, การ์ด 3 ใบ, ตาราง 7 วัน หลังกด "ซิงค์ข้อมูลจาก Google Health")
- [ ] เตรียม **test LINE account** (มีข้อมูลก้าว/ระยะ/แคลริง ๆ) + เพิ่ม reviewer email เป็น test user
- [ ] อัปเดตข้อความในข้อ 1)–2) ถ้าแผนตอนท้ายเปลี่ยนจากที่เขียนไว้

---

## 5) Reference โค้ดที่เกี่ยวข้อง

| ไฟล์ | ความเกี่ยวข้อง |
|---|---|
| `lib/google-health.ts` | ประกาศ `SCOPES` (บรรทัด 14), `getGoogleAuthUrl`, ฟังก์ชัน fetch/process ทั้งหมด |
| `app/api/v1/google-health/sync/route.ts` | ดึง daily roll-up 4 type → `daily_metrics` |
| `app/api/v1/google-health/callback/route.ts` | แลก code, เก็บ token + `granted_scopes` |
| `app/api/v1/google-health/disconnect/route.ts` | revoke token + mark `revoked_at` |
| `app/api/v1/google-health/status/route.ts` / `daily/route.ts` | สถานะเชื่อมต่อ / อ่าน aggregate กลับ |
| `components/GoogleHealthSection.tsx` / `GoogleHealthDailySummary.tsx` | UI ที่แสดงข้อมูล Google บน Dashboard |

---

## หมายเหตุ

- googlehealth scopes เป็นหมวด **Restricted** → Google ต้องการ **App Verification / Security Assessment (CASA)** —
  เตรียมหลักฐานความปลอดภัย + ค่าใช้จ่ายตรวจสอบได้ (ไม่แปลกใจถ้าถูกขอเพิ่ม)
- มี limited-use window: ประเมินแล้วเปิดใช้ข้อมูลจริงภายใน ~90 วัน มี privacy policy สาธารณะก่อน
- ผู้ใช้ที่เชื่อม Google อยู่เดิม (token มี 3 scope เก่า) ไม่ต้องทำอะไร —
  แอปจะขอ scope ใหม่เฉพาะตอนเชื่อมครั้งใหม่/กด "เพิ่มการเชื่อมต่อ" (`prompt=consent`)