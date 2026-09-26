import { cache } from "react";

import type { Database } from "./database.types";
import { createClient } from "./server";

export const REQUIRED_TABLES = [
  "portfolios",
  "cash_flows",
  "capital_settings",
  "essays",
  "principles",
  "workouts",
  "runs",
] as const satisfies readonly (keyof Database["public"]["Tables"])[];

/** PostgREST / Postgres codes meaning "this table does not exist". */
const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01"]);

export function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && MISSING_TABLE_CODES.has(error.code);
}

/**
 * Tables from supabase/schema.sql that the connected database lacks.
 * Cached per request; any other error is ignored here and left to the
 * page's own queries to report.
 */
export const findMissingTables = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const results = await Promise.all(
    REQUIRED_TABLES.map(async (table) => {
      const { error } = await supabase.from(table).select("*").limit(1);
      return isMissingTableError(error) ? table : null;
    }),
  );
  return results.filter((t) => t !== null);
});
