import { describe, expect, it } from "vitest";

import {
  classifyProfileStatus,
  FRIENDSHIP_CACHE_TTL_MS,
  shouldRefreshFriendship,
} from "@/lib/line-friendship";

describe("classifyProfileStatus", () => {
  it("maps 200 to friend", () => {
    expect(classifyProfileStatus(200)).toBe("friend");
  });

  it("maps 404 to not_friend (unfriended / blocked / wrong provider id)", () => {
    expect(classifyProfileStatus(404)).toBe("not_friend");
  });

  it("maps every other status to check_failed", () => {
    expect(classifyProfileStatus(401)).toBe("check_failed");
    expect(classifyProfileStatus(403)).toBe("check_failed");
    expect(classifyProfileStatus(500)).toBe("check_failed");
    expect(classifyProfileStatus(0)).toBe("check_failed");
  });
});

describe("shouldRefreshFriendship", () => {
  const NOW = Date.parse("2026-08-29T10:00:00.000Z");

  it("always refreshes when there is no recorded check yet", () => {
    expect(shouldRefreshFriendship(null, NOW)).toBe(true);
  });

  it("treats a recent check as fresh", () => {
    const recent = new Date(NOW - FRIENDSHIP_CACHE_TTL_MS + 1000).toISOString();
    expect(shouldRefreshFriendship(recent, NOW)).toBe(false);
  });

  it("refreshes exactly at the TTL boundary", () => {
    const atTtl = new Date(NOW - FRIENDSHIP_CACHE_TTL_MS).toISOString();
    expect(shouldRefreshFriendship(atTtl, NOW)).toBe(true);
  });

  it("refreshes an expired check", () => {
    const stale = new Date(NOW - FRIENDSHIP_CACHE_TTL_MS - 1000).toISOString();
    expect(shouldRefreshFriendship(stale, NOW)).toBe(true);
  });

  it("refreshes when the stored timestamp is unparseable", () => {
    expect(shouldRefreshFriendship("not-a-date", NOW)).toBe(true);
  });
});