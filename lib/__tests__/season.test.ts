import { describe, expect, it } from "vitest";

import {
  BANNERS,
  bannerForRank,
  countBanners,
  formatResetDate,
  formatSeasonCountdown,
  getCurrentSeason,
  getQuarterBounds,
  getSeasonKey,
  parseSeasonKey,
  rankForBanner,
  seasonBadgeText,
} from "@/lib/season";

describe("getSeasonKey (ICT quarters)", () => {
  it("maps Jan-Mar to Q1", () => {
    // 15 Feb 2026 12:00 ICT = 05:00 UTC.
    expect(getSeasonKey(new Date("2026-02-15T05:00:00Z"))).toBe("2026-Q1");
  });

  it("rolls quarter at 1 Apr 00:00 ICT", () => {
    // 31 Mar 23:59 ICT = 16:59 UTC → Q1.
    expect(getSeasonKey(new Date("2026-03-31T16:59:00Z"))).toBe("2026-Q1");
    // 1 Apr 00:00 ICT = 31 Mar 17:00 UTC → Q2.
    expect(getSeasonKey(new Date("2026-03-31T17:00:00Z"))).toBe("2026-Q2");
  });

  it("maps Oct-Dec to Q4", () => {
    expect(getSeasonKey(new Date("2026-10-15T00:00:00Z"))).toBe("2026-Q4");
  });
});

describe("parseSeasonKey", () => {
  it("parses year and quarter", () => {
    expect(parseSeasonKey("2026-Q4")).toEqual({ year: 2026, quarter: 4 });
  });

  it("rejects bad format", () => {
    expect(() => parseSeasonKey("2026-Q5")).toThrow();
    expect(() => parseSeasonKey("nope")).toThrow();
  });
});

describe("getQuarterBounds", () => {
  it("returns ICT midnight edges as UTC ISO", () => {
    const { startsAtIso, endsAtIso } = getQuarterBounds(2026, 4);
    // 1 Oct 00:00 ICT = 30 Sep 17:00 UTC.
    expect(startsAtIso).toBe("2026-09-30T17:00:00.000Z");
    // 1 Jan 2027 00:00 ICT = 31 Dec 2026 17:00 UTC.
    expect(endsAtIso).toBe("2026-12-31T17:00:00.000Z");
  });
});

describe("bannerForRank", () => {
  it("awards gold/silver/bronze to ranks 1-3 only", () => {
    expect(bannerForRank(1)).toBe("gold");
    expect(bannerForRank(2)).toBe("silver");
    expect(bannerForRank(3)).toBe("bronze");
    expect(bannerForRank(4)).toBeNull();
  });
});

describe("countBanners", () => {
  it("counts owned banners ignoring nulls", () => {
    expect(
      countBanners([
        { banner: "gold" },
        { banner: "gold" },
        { banner: "bronze" },
        { banner: null },
      ])
    ).toEqual({ gold: 2, silver: 0, bronze: 1 });
  });
});

describe("betatester banner", () => {
  it("has text+color badge metadata like the season banners", () => {
    expect(BANNERS.betatester.label).toBe("Beta Tester");
    expect(BANNERS.betatester.chipClass).toContain("text-[#0284C7]");
  });

  it("is never awarded from a season rank", () => {
    expect(bannerForRank(1)).toBe("gold");
    expect(bannerForRank(0)).toBeNull();
    expect(bannerForRank(99)).toBeNull();
  });
});

describe("getCurrentSeason", () => {
  it("returns key + bounds matching the quarter helpers", () => {
    // 15 Oct 2026 12:00 ICT = 05:00 UTC → Q4.
    const season = getCurrentSeason(new Date("2026-10-15T05:00:00Z"));
    expect(season.seasonKey).toBe("2026-Q4");
    expect(season.quarter).toBe(4);
    expect(season.endsAtIso).toBe("2026-12-31T17:00:00.000Z");
  });
});

describe("formatSeasonCountdown", () => {
  it("formats days + HH:MM:SS with padding", () => {
    const ms = ((75 * 24 + 4) * 3600 + 12 * 60 + 33) * 1000;
    expect(formatSeasonCountdown(ms)).toBe("75 วัน 04:12:33");
  });

  it("clamps negative time to zero", () => {
    expect(formatSeasonCountdown(-1000)).toBe("0 วัน 00:00:00");
  });
});

describe("formatResetDate", () => {
  it("shows the ICT reset day in Thai with Buddhist year", () => {
    // Q4 2026 ends 1 Jan 2027 00:00 ICT.
    expect(formatResetDate("2026-12-31T17:00:00.000Z")).toBe("1 ม.ค. 2570");
  });
});

describe("rankForBanner", () => {
  it("is the inverse of bannerForRank", () => {
    expect(rankForBanner("gold")).toBe(1);
    expect(rankForBanner("silver")).toBe(2);
    expect(rankForBanner("bronze")).toBe(3);
  });
});

describe("seasonBadgeText", () => {
  it("names the rank and season for season banners", () => {
    expect(seasonBadgeText("gold", "2026-Q4")).toBe("อันดับ 1 Season 2026-Q4");
    expect(seasonBadgeText("silver", "2026-Q4")).toBe("อันดับ 2 Season 2026-Q4");
    expect(seasonBadgeText("bronze", "2027-Q1")).toBe("อันดับ 3 Season 2027-Q1");
  });

  it("falls back to the plain label without a season", () => {
    expect(seasonBadgeText("gold", null)).toBe("แชมป์ Season");
    expect(seasonBadgeText("gold")).toBe("แชมป์ Season");
    expect(seasonBadgeText("betatester", "2026-Q4")).toBe("Beta Tester");
    expect(seasonBadgeText(null, "2026-Q4")).toBeNull();
  });
});
