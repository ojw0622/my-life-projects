import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "./server";

/**
 * Returns the signed-in user and a request-scoped Supabase client, or
 * redirects to /login. Call it at the top of every page and Server Action
 * that touches user data: RLS enforces access, this gives a clear failure.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

/** Only allow same-origin relative redirects ("/x", never "//evil.com"). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
