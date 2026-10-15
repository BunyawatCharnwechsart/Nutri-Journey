import { describe, expect, it } from "vitest";

import {
  RANKING_ANONYMOUS_NAME,
  buildEntries,
  isMissingColumn,
  type RankingRow,
} from "@/lib/ranking-service";
import { rankingQuerySchema } from "@/lib/validation";

function row(
  user_id: string,
  total_points: number,
  display_name: string | null = "Name",
  season_points?: number,
  active_banner: "gold" | "silver" | "bronze" | null = null,
  active_banner_season_key: string | null = null
): RankingRow {
  return {
    user_id,
    total_points,
    season_points: season_points ?? total_points,
    display_name,
    avatar_url: null,
    active_banner,
    active_banner_season_key,
  };
}

describe("rankingQuerySchema", () => {
  it("defaults to limit 20 and offset 0", () => {
    expect(rankingQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it("coerces query-string values to numbers", () => {
    expect(rankingQuerySchema.parse({ limit: "10", offset: "40" })).toEqual({
      limit: 10,
      offset: 40,
    });
  });

  it("rejects limit over 100, under 1, or non-numeric", () => {
    expect(rankingQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(rankingQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(rankingQuerySchema.safeParse({ limit: "abc" }).success).toBe(false);
  });

  it("rejects negative offset", () => {
    expect(rankingQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
  });
});

describe("buildEntries", () => {
  it("assigns row-number ranks starting at 1", () => {
    const entries = buildEntries(
      [row("u1", 500), row("u2", 300), row("u3", 100)],
      0,
      "u2"
    );
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(entries[1]?.isMe).toBe(true);
    expect(entries[0]?.isMe).toBe(false);
  });

  it("offsets ranks for later pages", () => {
    const entries = buildEntries([row("u9", 50)], 20, "nobody");
    expect(entries[0]?.rank).toBe(21);
  });

  it("gives tied scores different ranks in input order", () => {
    const entries = buildEntries(
      [row("u1", 200), row("u2", 200)],
      0,
      "u2"
    );
    expect(entries.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("maps points to level and falls back to anonymous name", () => {
    const entries = buildEntries(
      [row("u1", 0, null), row("u2", 150, "A")],
      0,
      "u2"
    );
    expect(entries[0]?.level).toBe(0);
    expect(entries[0]?.displayName).toBe(RANKING_ANONYMOUS_NAME);
    expect(entries[1]?.level).toBe(1);
  });

  it("returns an empty list when the page has no rows", () => {
    expect(buildEntries([], 100, "u1")).toEqual([]);
  });

  it("passes avatarUrl and activeBanner through to the entry", () => {
    const withAvatar: RankingRow = {
      user_id: "u1",
      total_points: 500,
      season_points: 120,
      display_name: "A",
      avatar_url: "https://example.com/a.png",
      active_banner: "gold",
      active_banner_season_key: "2026-Q4",
    };
    const entries = buildEntries([withAvatar], 0, "u1");
    expect(entries[0]?.avatarUrl).toBe("https://example.com/a.png");
    expect(entries[0]?.activeBanner).toBe("gold");
    expect(entries[0]?.activeBannerSeasonKey).toBe("2026-Q4");
    expect(entries[0]?.seasonPoints).toBe(120);
    expect(entries[0]?.isMe).toBe(true);
  });

  it("shows season points as exp but level from lifetime", () => {
    const entries = buildEntries([row("u1", 6750, "A", 0)], 0, "u1");
    expect(entries[0]?.totalPoints).toBe(0);
    expect(entries[0]?.level).toBe(9);
  });
});

describe("isMissingColumn (pre-migration fallback)", () => {
  it("detects PGRST204 schema-cache errors", () => {
    expect(
      isMissingColumn(
        { code: "PGRST204", message: "column does not exist" },
        "season_points"
      )
    ).toBe(true);
  });

  it("detects the column name inside the message", () => {
    expect(
      isMissingColumn(
        { message: "column season_points does not exist" },
        "season_points"
      )
    ).toBe(true);
  });

  it("ignores unrelated errors (real failures still throw)", () => {
    expect(
      isMissingColumn(
        { code: "42501", message: "permission denied" },
        "season_points"
      )
    ).toBe(false);
    expect(isMissingColumn(null, "season_points")).toBe(false);
  });
});
