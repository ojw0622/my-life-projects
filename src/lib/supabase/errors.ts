import type { PostgrestError } from "@supabase/supabase-js";

import type { ActionState } from "@/lib/forms";

/** Maps a PostgREST error to a user-facing action result. */
export function dbErrorState(error: PostgrestError, duplicateMessage = "이미 같은 항목이 있습니다."): ActionState {
  if (error.code === "23505") return { ok: false, message: duplicateMessage };
  if (error.code === "23514") return { ok: false, message: "허용 범위를 벗어난 값이 있습니다." };
  if (error.code === "42501") return { ok: false, message: "권한이 없습니다. 다시 로그인하세요." };
  console.error("Supabase error", error);
  return { ok: false, message: "저장하지 못했습니다. 잠시 후 다시 시도하세요." };
}

type QueryResult = { data: unknown; error: PostgrestError | null };

/**
 * For reads in Server Components: fail loudly into the error boundary.
 * Lists come back non-null; `maybeSingle()` keeps its `| null`.
 */
export function unwrap<R extends QueryResult>(
  result: R,
  what: string,
): R extends { data: infer D; error: null } ? D : never {
  if (result.error) {
    console.error(`Failed to load ${what}`, result.error);
    throw new Error(`${what}을(를) 불러오지 못했습니다.`);
  }
  return result.data as R extends { data: infer D; error: null } ? D : never;
}
