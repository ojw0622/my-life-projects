import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fieldValue, formDataToObject, numberField, parseForm } from "../forms";

describe("form helpers", () => {
  it("drops Next.js $ACTION_ keys from FormData", () => {
    const fd = new FormData();
    fd.set("name", "x");
    fd.set("$ACTION_ID_abc", "");
    expect(formDataToObject(fd)).toEqual({ name: "x" });
  });

  it("parses numbers with thousands separators", () => {
    expect(numberField("금액").parse("1,500,000")).toBe(1_500_000);
    expect(numberField("금액").safeParse("abc").success).toBe(false);
  });

  it("returns the first error per field", () => {
    const fd = new FormData();
    fd.set("n", "-1");
    const result = parseForm(z.object({ n: numberField("n").refine((v) => v > 0, "양수") }), fd);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.state.fieldErrors).toEqual({ n: "양수" });
  });
});

describe("value echo", () => {
  it("returns submitted values on validation failure but never the password", () => {
    const fd = new FormData();
    fd.set("email", "me@example.com");
    fd.set("password", "hunter22");
    fd.set("n", "abc");
    const result = parseForm(z.object({ n: numberField("n") }), fd);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.state.values).toEqual({ email: "me@example.com", n: "abc" });
  });

  it("prefers the echoed value over the fallback", () => {
    expect(fieldValue({ ok: false, values: { a: "typed" } }, "a", "saved")).toBe("typed");
    expect(fieldValue({ ok: true }, "a", 3)).toBe("3");
    expect(fieldValue({ ok: true }, "a", null)).toBe("");
  });
});
