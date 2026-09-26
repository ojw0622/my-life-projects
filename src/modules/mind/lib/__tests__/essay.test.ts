import { describe, expect, it } from "vitest";

import { excerpt, parseTags, pickReflection, type EssayRow } from "../essay";

const essay = (id: string, created_at: string): EssayRow => ({
  id,
  user_id: "u",
  title: id,
  content: "",
  tags: [],
  created_at,
  updated_at: created_at,
});

describe("parseTags", () => {
  it("trims, strips #, drops empties and duplicates", () => {
    expect(parseTags(" 투자, #삶 ,, 투자\n##독서")).toEqual(["투자", "삶", "독서"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("excerpt", () => {
  it("strips Markdown syntax", () => {
    expect(excerpt("# 제목\n\n**굵게** 그리고 [링크](https://x.y)\n\n- 항목")).toBe("제목 굵게 그리고 링크 항목");
  });

  it("drops raw HTML tags", () => {
    expect(excerpt("앞 <script>alert(1)</script> <b>뒤</b>")).toBe("앞 alert(1) 뒤");
  });

  it("reads editor HTML, including entities", () => {
    expect(excerpt("<h2>제목</h2><p>A &amp; B <mark data-color=\"#fdf1b8\">강조</mark></p><ul><li><p>항목</p></li></ul>")).toBe(
      "제목 A & B 강조 항목",
    );
  });

  it("does not split words at inline formatting", () => {
    expect(excerpt("<p><strong>시간</strong>이 <mark>가장</mark> 큰 자산</p><p>둘째</p>")).toBe("시간이 가장 큰 자산 둘째");
  });

  it("drops fenced code blocks", () => {
    expect(excerpt("앞\n```ts\nconst a = 1;\n```\n뒤")).toBe("앞 뒤");
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const text = "가나다 ".repeat(50);
    const result = excerpt(text, 20);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result).not.toMatch(/\s…$/);
  });
});

describe("pickReflection", () => {
  const now = new Date("2026-09-25T00:00:00Z");
  const essays = [
    essay("a", "2026-01-10T00:00:00Z"),
    essay("b", "2026-05-01T00:00:00Z"),
    essay("c", "2026-09-24T00:00:00Z"), // yesterday: too recent
  ];

  it("returns null without essays", () => {
    expect(pickReflection([], now, "2026-09-25")).toBeNull();
  });

  it("prefers essays older than the minimum age", () => {
    for (const day of ["2026-09-25", "2026-09-26", "2026-09-27", "2026-10-01"]) {
      expect(pickReflection(essays, now, day)?.essay.id).not.toBe("c");
    }
  });

  it("is stable within a day regardless of input order", () => {
    const first = pickReflection(essays, now, "2026-09-25");
    const again = pickReflection([...essays].reverse(), now, "2026-09-25");
    expect(again?.essay.id).toBe(first?.essay.id);
  });

  it("rotates across days", () => {
    const many = Array.from({ length: 10 }, (_, i) => essay(`e${i}`, "2025-01-01T00:00:00Z"));
    const picks = new Set(
      Array.from({ length: 14 }, (_, d) => pickReflection(many, now, `2026-10-${String(d + 1).padStart(2, "0")}`)?.essay.id),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("falls back to recent essays when none is old enough and reports age", () => {
    const pick = pickReflection([essay("c", "2026-09-22T00:00:00Z")], now, "2026-09-25");
    expect(pick).toMatchObject({ essay: { id: "c" }, daysAgo: 3 });
  });
});
