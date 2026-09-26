import { describe, expect, it } from "vitest";

import { snapshotToDocs } from "../snapshot";

describe("snapshotToDocs", () => {
  it("flattens collections into documents and skips _meta", () => {
    const result = snapshotToDocs({
      config: { budget: { targets: { career: 12 } }, profile: { enlistDate: "2025-09-01" } },
      items: { hanneung: { title: "한능검", area: "career" } },
      milestones: { discharge: { label: "전역", date: "2027-05-31" } },
      _meta: { exportedAt: "2026-09-26" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.counts).toEqual({ config: 2, items: 1, milestones: 1 });
    expect(result.docs).toContainEqual({ collection: "items", id: "hanneung", data: { title: "한능검", area: "career" } });
    expect(result.docs.some((d) => d.collection === "_meta")).toBe(false);
  });

  it.each([
    [null, "JSON 객체"],
    [[], "JSON 객체"],
    [{ unknown: {} }, "알 수 없는"],
    [{ items: [] }, "형식"],
    [{ items: { a: "text" } }, "형식"],
    [{ items: {} }, "가져올 데이터가 없습니다"],
  ])("rejects %j", (input, message) => {
    const result = snapshotToDocs(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});
