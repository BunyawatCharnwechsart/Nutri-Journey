"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import PhotoIcon from "@/components/PhotoIcon";

export interface ProgressPhotoMeasurements {
  waistIn: number | null;
  hipIn: number | null;
  chestIn: number | null;
}

export interface ProgressPhotoSet {
  month: string; // "yyyy-MM"
  front: { url: string } | null;
  side: { url: string } | null;
  back: { url: string } | null;
  /** น้ำหนัก (กก.) ที่บันทึกในเดือนนั้น — null เมื่อยังไม่มี. */
  weightKg: number | null;
  /** สัดส่วนที่บันทึกในเดือนนั้น — null เมื่อยังไม่มี. */
  measurements: ProgressPhotoMeasurements | null;
}

interface ProgressPhotoGalleryProps {
  sets: ProgressPhotoSet[];
  canUpload: boolean;
  nextRecordableMonthKey: string; // "yyyy-MM-01" — เดือนที่จะบันทึกต่อไป
  hasAnyPhoto: boolean;
}

type Tab = "progress" | "compare";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${THAI_MONTHS[month - 1]} ${year}`;
}

/** แสดงจำนวนแบบสั้น 1 ตำแหน่งทศนิยม ไม่มีทศนิยมถ้าเป็นจำนวนเต็ม. */
function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : `${Math.round(value * 10) / 10}`;
}

type PhotoViewKey = "front" | "side" | "back";

const VIEW_LABELS: { view: PhotoViewKey; label: string }[] = [
  { view: "front", label: "ด้านหน้า" },
  { view: "side", label: "ด้านข้าง" },
  { view: "back", label: "ด้านหลัง" },
];

export default function ProgressPhotoGallery({
  sets,
  canUpload,
  nextRecordableMonthKey,
  hasAnyPhoto,
}: ProgressPhotoGalleryProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("progress");
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState<File | null>(null);
  const [side, setSide] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const sideRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  // Compare selector state — default: เก่าสุดเทียบกับล่าสุด (ถ้ามีตั้งแต่ 2 เดือน).
  const monthOptions = useMemo(() => [...sets].map((s) => s.month), [sets]);
  const [compareA, setCompareA] = useState<string>(
    () => monthOptions[1] ?? monthOptions[0] ?? ""
  );
  const [compareB, setCompareB] = useState<string>(
    () => monthOptions[0] ?? ""
  );

  const setA = sets.find((s) => s.month === compareA);
  const setB = sets.find((s) => s.month === compareB);

  const nextRecordableMonthLabel = monthLabel(nextRecordableMonthKey.slice(0, 7));

  function openModal() {
    setFront(null);
    setSide(null);
    setBack(null);
    setError(null);
    setOpen(true);
  }

  async function handleUpload() {
    if (!front || !side || !back) {
      setError("กรุณาแนบรูปให้ครบทั้ง 3 มุม (ด้านหน้า / ด้านข้าง / ด้านหลัง)");
      return;
    }
    for (const [name, file] of [
      ["ด้านหน้า", front],
      ["ด้านข้าง", side],
      ["ด้านหลัง", back],
    ] as const) {
      const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      if (!okType || file.size > 5 * 1024 * 1024) {
        setError(`รูป${name} ต้องเป็นไฟล์ JPG/PNG/WEBP และไม่เกิน 5 MB`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("front", front);
      body.append("side", side);
      body.append("back", back);

      const res = await fetch("/api/v1/progress-photos", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "บันทึกรูปถ่ายไม่สำเร็จ");
      }

      setOpen(false);
      // Re-fetch server props so the new set + lock state appear.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกรูปถ่ายไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function pickButton(
    ref: React.RefObject<HTMLInputElement | null>,
    file: File | null,
    label: string
  ) {
    return (
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition-colors hover:bg-zinc-100"
      >
        {file ? (
          <span className="text-sm font-medium text-[#18A659]">{file.name}</span>
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200">
              <PhotoIcon className="h-5 w-5 text-zinc-500" />
            </span>
            <span className="text-sm text-zinc-500">{label}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasAnyPhoto && (
        <nav
          aria-label="มุมมอง"
          className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-white"
        >
          <button
            type="button"
            onClick={() => setTab("progress")}
            aria-current={tab === "progress" ? "true" : undefined}
            className={`flex-1 border-b-[3px] px-3 pt-3 pb-2.5 text-center text-base font-semibold transition-colors ${
              tab === "progress"
                ? "border-[#18A659] text-[#18A659]"
                : "border-transparent text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            }`}
          >
            ความคืบหน้า
          </button>
          <button
            type="button"
            onClick={() => setTab("compare")}
            aria-current={tab === "compare" ? "true" : undefined}
            className={`flex-1 border-b-[3px] px-3 pt-3 pb-2.5 text-center text-base font-semibold transition-colors ${
              tab === "compare"
                ? "border-[#18A659] text-[#18A659]"
                : "border-transparent text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            }`}
          >
            เปรียบเทียบ
          </button>
        </nav>
      )}

      {hasAnyPhoto && tab === "compare" ? (
        <ComparePanel
          monthOptions={monthOptions}
          compareA={compareA}
          compareB={compareB}
          onCompareA={setCompareA}
          onCompareB={setCompareB}
          setA={setA}
          setB={setB}
        />
      ) : (
        <ProgressGrid
          sets={sets}
          canUpload={canUpload}
          nextRecordableMonthLabel={nextRecordableMonthLabel}
          onUpload={openModal}
        />
      )}

      <PhotoSelectModal
        open={open}
        onClose={() => setOpen(false)}
        front={front}
        side={side}
        back={back}
        setFront={setFront}
        setSide={setSide}
        setBack={setBack}
        frontRef={frontRef}
        sideRef={sideRef}
        backRef={backRef}
        saving={saving}
        error={error}
        onUpload={handleUpload}
        pickButton={pickButton}
      />
    </div>
  );
}

/** แท็บ "ความคืบหน้า": grid การ์ดรายเดือน + การ์ดท้ายเป็นเดือนที่จะบันทึกต่อไป. */
function ProgressGrid({
  sets,
  canUpload,
  nextRecordableMonthLabel,
  onUpload,
}: {
  sets: ProgressPhotoSet[];
  canUpload: boolean;
  nextRecordableMonthLabel: string;
  onUpload: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sets.map((set) => (
        <section
          key={set.month}
          className="flex h-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
        >
          <h3 className="text-base font-semibold text-zinc-900">
            {monthLabel(set.month)}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {VIEW_LABELS.map(({ view, label }) => (
              <div key={view} className="flex flex-col gap-1">
                <PhotoFrame photo={set[view]} />
                <span className="text-center text-xs text-zinc-500">{label}</span>
              </div>
            ))}
          </div>

          <PhotoMonthStats set={set} />
        </section>
      ))}

      <NextMonthCard
        canUpload={canUpload}
        monthLabel={nextRecordableMonthLabel}
        onUpload={onUpload}
      />
    </div>
  );
}

/** การ์ดเดือนที่จะบันทึกต่อไป — โครงสร้างเดียวกับการ์ดรูป (3 เฟรม aspect-[3/4]) แต่เส้นประ. */
function NextMonthCard({
  canUpload,
  monthLabel: label,
  onUpload,
}: {
  canUpload: boolean;
  monthLabel: string;
  onUpload: () => void;
}) {
  return (
    <section className="flex h-full flex-col gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
      <h3 className="text-base font-semibold text-zinc-900">{label}</h3>
      <div className="grid grid-cols-3 gap-2">
        {VIEW_LABELS.map(({ view, label }) => (
          <div key={view} className="flex flex-col gap-1">
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white">
              <span className="text-xs text-zinc-400">ยังไม่มี</span>
            </div>
            <span className="text-center text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
      {canUpload ? (
        <button
          type="button"
          onClick={onUpload}
          className="mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C]"
        >
          บันทึกรูปความคืบหน้า
        </button>
      ) : (
        <div className="mt-auto flex h-12 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-4">
          <p className="text-sm font-semibold text-zinc-500">
            บันทึกเดือนนี้แล้ว · กลับมาอีกครั้งในเดือนถัดไป
          </p>
        </div>
      )}
    </section>
  );
}

/** แท็บ "เปรียบเทียบ": เลือก 2 เดือน แล้วเทียบ 3 มุมข้างกัน. */
function ComparePanel({
  monthOptions,
  compareA,
  compareB,
  onCompareA,
  onCompareB,
  setA,
  setB,
}: {
  monthOptions: string[];
  compareA: string;
  compareB: string;
  onCompareA: (m: string) => void;
  onCompareB: (m: string) => void;
  setA: ProgressPhotoSet | undefined;
  setB: ProgressPhotoSet | undefined;
}) {
  if (monthOptions.length < 2) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="py-8 text-center text-sm text-zinc-500">
          ยังมีน้อยกว่า 2 เดือน — บันทึกครบ 2 เดือนขึ้นไปจึงเปรียบเทียบได้
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">
          เปรียบเทียบรายเดือน
        </h2>

      <div className="flex flex-row gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">เดือนที่ 1</span>
          <select
            value={compareA}
            onChange={(e) => onCompareA(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">เดือนที่ 2</span>
          <select
            value={compareB}
            onChange={(e) => onCompareB(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {setA && setB && (
        <div className="flex flex-col gap-4">
          {VIEW_LABELS.map(({ view, label }) => (
            <section
              key={view}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <h3 className="text-base font-semibold text-zinc-900">{label}</h3>
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-500">
                <span className="flex-1 text-center">{monthLabel(setA.month)}</span>
                <span
                  aria-hidden="true"
                  className="w-14 text-center text-sm font-bold text-[#18A659]"
                >
                  vs
                </span>
                <span className="flex-1 text-center">{monthLabel(setB.month)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <PhotoFrame photo={setA[view]} />
                <span
                  aria-hidden="true"
                  className="w-10 text-center text-sm font-bold text-[#18A659]"
                >
                  vs
                </span>
                <PhotoFrame photo={setB[view]} />
              </div>
            </section>
          ))}
        </div>
      )}
      </section>

      {setA && setB && <BodyCompareCard setA={setA} setB={setB} />}
    </>
  );
}

/**
 * Card เปรียบเทียบน้ำหนัก + สัดส่วนของ 2 เดือนที่เลือกในแท็บเปรียบเทียบ.
 * แสดงค่าทั้ง 2 เดือน + ผลต่าง (เดือน 2 − เดือน 1). ถ้าเดือนไหนไม่มีข้อมูล
 * ตัวชี้วัดนั้น จะโชว์ "—". ไม่มีข้อมูลทั้ง 2 เดือนเลย → ไม่แสดง card.
 */
function BodyCompareCard({
  setA,
  setB,
}: {
  setA: ProgressPhotoSet;
  setB: ProgressPhotoSet;
}) {
  const m1 = setA.measurements;
  const m2 = setB.measurements;

  const rows: { label: string; a: number | null; b: number | null }[] = [
    { label: "น้ำหนัก (กก.)", a: setA.weightKg, b: setB.weightKg },
    { label: "รอบเอว (นิ้ว)", a: m1?.waistIn ?? null, b: m2?.waistIn ?? null },
    { label: "รอบสะโพก (นิ้ว)", a: m1?.hipIn ?? null, b: m2?.hipIn ?? null },
    { label: "รอบอก (นิ้ว)", a: m1?.chestIn ?? null, b: m2?.chestIn ?? null },
  ];

  const hasData = rows.some((row) => row.a != null || row.b != null);
  if (!hasData) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">
        เปรียบเทียบน้ำหนักและสัดส่วน
      </h2>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-semibold text-zinc-500">
        <span className="text-center">{monthLabel(setA.month)}</span>
        <span aria-hidden="true" className="w-24" />
        <span className="text-center">{monthLabel(setB.month)}</span>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map(({ label, a, b }) => {
          const diff =
            a != null && b != null ? Math.round((b - a) * 10) / 10 : null;
          const delta =
            diff === null
              ? null
              : diff === 0
                ? "±0"
                : (diff > 0 ? "+" : "−") + trimNumber(Math.abs(diff));

          return (
            <div
              key={label}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm"
            >
              <span className="text-center font-medium text-zinc-900">
                {a != null ? trimNumber(a) : "—"}
              </span>
              <div className="flex w-24 flex-col items-center gap-0.5">
                <span className="text-xs font-semibold text-zinc-500">
                  {label}
                </span>
                {delta && (
                  <span className="text-xs font-bold text-zinc-400">
                    {delta}
                  </span>
                )}
              </div>
              <span className="text-center font-medium text-zinc-900">
                {b != null ? trimNumber(b) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PhotoFrame({ photo }: { photo: { url: string } | null }) {
  if (!photo) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50">
        <span className="text-xs text-zinc-400">ไม่มีรูป</span>
      </div>
    );
  }
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from Supabase Storage are dynamic; next/image remotePatterns cannot cover rotating tokens */}
      <img
        src={photo.url}
        alt="ภาพถ่ายความคืบหน้า"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * แถบสรุปน้ำหนัก + สัดส่วนของเดือนที่ตรงกับ card รูป (recorded เดือนเดียวกัน).
 * ยังไม่มีข้อมูลเลย → บอกตรงๆ ว่าไม่มีการบันทึก เพื่อไม่ให้ "—" ดูเหมือนค่า 0.
 */
function PhotoMonthStats({ set }: { set: ProgressPhotoSet }) {
  const m = set.measurements;
  const hasNoData = set.weightKg === null && m === null;

  if (hasNoData) {
    return (
      <div className="flex h-10 items-center justify-center rounded-xl bg-zinc-50 text-xs text-zinc-400">
        ยังไม่มีการบันทึกน้ำหนัก/สัดส่วน
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-500">น้ำหนัก</span>
        <span className="font-medium text-zinc-900">
          {set.weightKg != null ? `${trimNumber(set.weightKg)} กก.` : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-500">เอว</span>
        <span className="font-medium text-zinc-900">
          {m?.waistIn != null ? `${trimNumber(m.waistIn)} นิ้ว` : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-500">สะโพก</span>
        <span className="font-medium text-zinc-900">
          {m?.hipIn != null ? `${trimNumber(m.hipIn)} นิ้ว` : "—"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-500">อก</span>
        <span className="font-medium text-zinc-900">
          {m?.chestIn != null ? `${trimNumber(m.chestIn)} นิ้ว` : "—"}
        </span>
      </div>
    </div>
  );
}

interface PhotoSelectModalProps {
  open: boolean;
  onClose: () => void;
  front: File | null;
  side: File | null;
  back: File | null;
  setFront: (f: File | null) => void;
  setSide: (f: File | null) => void;
  setBack: (f: File | null) => void;
  frontRef: React.RefObject<HTMLInputElement | null>;
  sideRef: React.RefObject<HTMLInputElement | null>;
  backRef: React.RefObject<HTMLInputElement | null>;
  saving: boolean;
  error: string | null;
  onUpload: () => void;
  pickButton: (
    ref: React.RefObject<HTMLInputElement | null>,
    file: File | null,
    label: string
  ) => React.ReactNode;
}

function PhotoSelectModal({
  open,
  onClose,
  front,
  side,
  back,
  setFront,
  setSide,
  setBack,
  frontRef,
  sideRef,
  backRef,
  saving,
  error,
  onUpload,
  pickButton,
}: PhotoSelectModalProps) {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="บันทึกรูปความคืบหน้า"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900">บันทึกรูปความคืบหน้า</h3>
        <p className="mt-1 text-sm text-zinc-500">
          ถ่ายรูป 3 มุม เดือนละครั้ง แนะนำให้ถ่ายในมุม ระยะ และแสงเดียวกัน
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          ไฟล์ JPG/PNG/WEBP · สูงสุด 5 MB ต่อรูป · แนะนำถ่ายแนวตั้ง (อัตราส่วน
          3:4) เพื่อคุณภาพการแสดงผลที่ดี
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <FileInput
            label="ด้านหน้า"
            refEl={frontRef}
            file={front}
            setFile={setFront}
            pickButton={pickButton}
          />
          <FileInput
            label="ด้านข้าง"
            refEl={sideRef}
            file={side}
            setFile={setSide}
            pickButton={pickButton}
          />
          <FileInput
            label="ด้านหลัง"
            refEl={backRef}
            file={back}
            setFile={setBack}
            pickButton={pickButton}
          />
        </div>

        {error && (
          <p
            className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-14 flex-1 items-center justify-center rounded-full border border-zinc-300 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={saving}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileInput({
  label,
  refEl,
  file,
  setFile,
  pickButton,
}: {
  label: string;
  refEl: React.RefObject<HTMLInputElement | null>;
  file: File | null;
  setFile: (f: File | null) => void;
  pickButton: (
    ref: React.RefObject<HTMLInputElement | null>,
    file: File | null,
    label: string
  ) => React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        ref={refEl}
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {pickButton(refEl, file, `เลือกภาพ${label}`)}
    </div>
  );
}