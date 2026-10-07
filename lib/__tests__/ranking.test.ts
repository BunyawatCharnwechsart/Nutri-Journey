import { describe, expect, it } from "vitest";

import {
  RANKING_ANONYMOUS_NAME,
  buildEntries,
  type RankingRow,
} from "@/lib/ranking-service";
import { rankingQuerySchema } from "@/lib/validation";

function row(
  user_id: string,
  total_points: number,
  display_name: string | null = "Name"
): RankingRow {
  return { user_id, total_points, display_name, avatar_url: null };
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
});
