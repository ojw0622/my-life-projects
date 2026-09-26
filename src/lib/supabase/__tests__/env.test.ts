import { describe, expect, it } from "vitest";

import { normalizeSupabaseUrl } from "../env";

describe("normalizeSupabaseUrl", () => {
  it.each([
    ["https://abc.supabase.co", "https://abc.supabase.co"],
    ["  https://abc.supabase.co/  ", "https://abc.supabase.co"],
    ['"https://abc.supabase.co"', "https://abc.supabase.co"],
    ["http://127.0.0.1:54321", "http://127.0.0.1:54321"],
  ])("accepts %j", (raw, expected) => {
    expect(normalizeSupabaseUrl(raw)).toBe(expected);
  });

  it.each([undefined, "", "abc.supabase.co", "ftp://abc.supabase.co", "not a url"])("rejects %j", (raw) => {
    expect(normalizeSupabaseUrl(raw)).toBeNull();
  });
});
