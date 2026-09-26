import { cache } from "react";

import type { Database } from "./database.types";
import { createClient } from "./server";

type TableName = keyof Database["public"]["Tables"];

/** Tables every dashboard page needs. */
export const REQUIRED_TABLES = [
  "portfolios",
  "cash_flows",
  "capital_settings",
  "essays",
  "principles",
  "workouts",
  "runs",
] as const satisfies readonly TableName[];

/** PostgREST / Postgres codes meaning "this table does not exist". */
const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01"]);

export function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && MISSING_TABLE_CODES.has(error.code);
}

/** Whether one table is missing; cached per request. */
const isTableMissing = cache(async (table: TableName): Promise<boolean> => {
  const supabase = await createClient();
  const { error } = await supabase.from(table).select("*").limit(1);
  return isMissingTableError(error);
});

/**
 * Tables from supabase/schema.sql that the connected database lacks.
 * Any other error is ignored here and left to the page's own queries.
 */
export async function findMissingTables(...tables: TableName[]): Promise<string[]> {
  const missing = await Promise.all(tables.map(isTableMissing));
  return tables.filter((_, i) => missing[i]);
}
