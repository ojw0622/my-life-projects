import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Deployment check: can this server reach Supabase with its configured env?
 * Reports only the (already public) project host, never the key.
 */
export async function GET() {
  let env: { url: string; anonKey: string };
  try {
    env = getSupabaseEnv();
  } catch (error) {
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }

  const supabaseHost = new URL(env.url).host;
  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return Response.json(
      { ok: res.ok, supabaseHost, status: res.status },
      { status: res.ok ? 200 : 502, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const cause = (error as Error & { cause?: { code?: string } }).cause?.code;
    return Response.json(
      { ok: false, supabaseHost, error: `unreachable${cause ? ` (${cause})` : ""}` },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
