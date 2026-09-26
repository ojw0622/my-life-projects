import { describe, expect, it } from "vitest";

import { essayStats, isHtmlContent, toEditorHtml } from "../essay-content";

describe("toEditorHtml", () => {
  it("keeps editor HTML as is", () => {
    const html = "<p>안녕 <strong>세상</strong></p>";
    expect(isHtmlContent(html)).toBe(true);
    expect(toEditorHtml(html)).toBe(html);
  });

  it("converts legacy Markdown essays", () => {
    const html = toEditorHtml("# 복리\n\n**시간**이 자산이다.\n\n- 적립");
    expect(html).toContain("<h1>복리</h1>");
    expect(html).toContain("<strong>시간</strong>");
    expect(html).toContain("<li>적립</li>");
  });

  it("returns empty content unchanged", () => {
    expect(toEditorHtml("")).toBe("");
  });

  it("treats plain text that merely contains < as Markdown", () => {
    expect(isHtmlContent("3 < 5 이다")).toBe(false);
  });
});

describe("essayStats", () => {
  it("counts non-whitespace characters and rounds reading time up to a minute", () => {
    expect(essayStats("가 나 다")).toEqual({ characters: 3, minutes: 1 });
    expect(essayStats("")).toEqual({ characters: 0, minutes: 0 });
    expect(essayStats("가".repeat(1500)).minutes).toBe(3);
  });
});
