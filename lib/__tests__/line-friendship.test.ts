import { describe, expect, it } from "vitest";

import { classifyProfileStatus } from "@/lib/line-friendship";

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