/**
 * Normalizes a Supabase project URL as typically pasted into a dashboard:
 * trims whitespace and wrapping quotes and drops trailing slashes. Returns
 * null when the result is not an absolute http(s) URL.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().replace(/^["']|["']$/g, "").trim().replace(/\/+$/, "");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * Reads the public Supabase settings. `NEXT_PUBLIC_*` values must be
 * referenced with literal property access so Next.js can inline them into
 * the client bundle.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "");

  if (!rawUrl || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const url = normalizeSupabaseUrl(rawUrl);
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be the project URL, e.g. https://<project-ref>.supabase.co",
    );
  }

  return { url, anonKey };
}
