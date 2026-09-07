import { describe, expect, it } from "vitest";

import {
  canUploadPhotos,
  detectImageMime,
  getRecordedMonthKey,
  monthKeyFromRecordDate,
  nextMonthKey,
} from "@/lib/progress-photo";

// 2026-09-10 00:00 UTC = 2026-09-10 07:00 ICT (same month, September).
const BASE = Date.UTC(2026, 8, 10);
describe("getRecordedMonthKey", () => {
  it("returns the first day of the ICT month", () => {
    expect(getRecordedMonthKey(BASE)).toBe("2026-09-01");
  });

  it("rolls the month correctly near the ICT day boundary", () => {
    // 2026-08-31 16:00 UTC = 2026-08-31 23:00 ICT (still August).
    expect(getRecordedMonthKey(Date.UTC(2026, 7, 31, 16))).toBe("2026-08-01");
    // 2026-08-31 17:00 UTC = 2026-09-01 00:00 ICT (September).
    expect(getRecordedMonthKey(Date.UTC(2026, 7, 31, 17))).toBe("2026-09-01");
  });

  it("crosses the year boundary cleanly", () => {
    expect(getRecordedMonthKey(Date.UTC(2026, 0, 5))).toBe("2026-01-01");
    expect(getRecordedMonthKey(Date.UTC(2025, 11, 15))).toBe("2025-12-01");
  });
});

describe("canUploadPhotos", () => {
  it("allows the current month when nothing is recorded", () => {
    expect(canUploadPhotos(BASE, [])).toBe(true);
  });

  it("locks the current month once any view is recorded", () => {
    expect(canUploadPhotos(BASE, ["2026-09-01"])).toBe(false);
    expect(canUploadPhotos(BASE, ["2026-09-01", "2026-08-01"])).toBe(false);
  });

  it("allows again once a different month is recorded", () => {
    expect(canUploadPhotos(BASE, ["2026-08-01"])).toBe(true);
  });
});

describe("monthKeyFromRecordDate", () => {
  it("gives the display month key from a recorded date", () => {
    expect(monthKeyFromRecordDate("2026-09-01")).toBe("2026-09");
    expect(monthKeyFromRecordDate("2025-12-01")).toBe("2025-12");
  });
});

describe("nextMonthKey", () => {
  it("returns the following calendar month", () => {
    expect(nextMonthKey("2026-09-01")).toBe("2026-10-01");
  });

  it("rolls over into the next year after December", () => {
    expect(nextMonthKey("2026-12-01")).toBe("2027-01-01");
  });

  it("works with a single-digit month", () => {
    expect(nextMonthKey("2026-01-01")).toBe("2026-02-01");
  });
});

describe("detectImageMime", () => {
  function buf(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
  }

  it("detects jpeg from magic bytes", () => {
    // FFD8FF ; 1 valid byte follows.
    expect(detectImageMime(buf("ffd8ff"))).toBe("image/jpeg");
  });

  it("detects png from magic bytes", () => {
    expect(detectImageMime(buf("89504e470d0a1a0a"))).toBe("image/png");
  });

  it("detects webp from RIFF..WEBP signature", () => {
    // "RIFF" + 4-byte size + "WEBP"
    expect(detectImageMime(buf("524946460000000057454250"))).toBe("image/webp");
  });

  it("rejects anything that does not match an image signature", () => {
    expect(detectImageMime(buf("3c68746d6c3e"))).toBeNull(); // "<html>"
    expect(detectImageMime(buf("000000000000"))).toBeNull();
    expect(detectImageMime(buf("ffd8"))).toBeNull(); // truncated jpeg header
  });
});
