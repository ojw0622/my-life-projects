import { describe, expect, it, vi } from "vitest";

vi.mock("../server", () => ({ createClient: vi.fn() }));

import { safeNextPath } from "../auth";

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/capital?x=1")).toBe("/capital?x=1");
  });

  it.each([null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "capital"])(
    "falls back for %j",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );
});
