import type { DocData, StoredDoc } from "./doc-store";

/** Collections the Control Tower page reads and writes. */
export const TOWER_COLLECTIONS = ["config", "items", "milestones", "weeks", "log", "reviews"] as const;

export type SnapshotResult =
  | { ok: true; docs: StoredDoc[]; counts: Record<string, number> }
  | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Converts an exported data snapshot (`{ collection: { docId: fields } }`)
 * into documents to import. Keys starting with "_" (like `_meta`) are
 * skipped; unknown collections are rejected so a wrong file is caught early.
 */
export function snapshotToDocs(input: unknown): SnapshotResult {
  if (!isObject(input)) return { ok: false, error: "JSON 객체 형식의 스냅샷 파일이 아닙니다." };

  const docs: StoredDoc[] = [];
  const counts: Record<string, number> = {};
  const known = new Set<string>(TOWER_COLLECTIONS);

  for (const [collection, value] of Object.entries(input)) {
    if (collection.startsWith("_")) continue;
    if (!known.has(collection)) return { ok: false, error: `알 수 없는 항목 묶음이 있습니다: ${collection}` };
    if (!isObject(value)) return { ok: false, error: `${collection} 형식이 올바르지 않습니다.` };

    for (const [id, data] of Object.entries(value)) {
      if (!isObject(data)) return { ok: false, error: `${collection}/${id} 형식이 올바르지 않습니다.` };
      if (!id || id.length > 200 || id.includes("/")) return { ok: false, error: `잘못된 문서 id: ${id}` };
      docs.push({ collection, id, data: data as DocData });
    }
    counts[collection] = Object.keys(value).length;
  }

  if (docs.length === 0) return { ok: false, error: "가져올 데이터가 없습니다." };
  return { ok: true, docs, counts };
}
