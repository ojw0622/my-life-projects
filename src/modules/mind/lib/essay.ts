import type { Tables } from "@/lib/supabase/database.types";

export type EssayRow = Tables<"essays">;

/** "투자, #삶 ,투자" → ["투자", "삶"]: trimmed, "#" stripped, de-duplicated. */
export function parseTags(input: string): string[] {
  const tags = input
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#+/, "").trim())
    .filter((t) => t.length > 0)
    .map((t) => t.slice(0, 30));
  return [...new Set(tags)].slice(0, 20);
}

/** Plain-text preview of an essay (HTML or legacy Markdown), cut at a word boundary. */
export function excerpt(markdown: string, maxLength = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    // Inline tags join their text; block tags separate words.
    .replace(/<\/?(strong|b|em|i|u|s|mark|a|code|span|label)\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, "$2")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** FNV-1a, used to turn a date into a stable pseudo-random index. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface ReflectionPick {
  essay: EssayRow;
  /** Days since the essay was written. */
  daysAgo: number;
}

/**
 * Spaced Reflection: picks one past essay to resurface today.
 *
 * - Prefers essays at least `minAgeDays` old so the reminder is about the
 *   past, falling back to any essay when none is old enough.
 * - The pick is stable for a given day (seeded by the date), so the widget
 *   does not change on every refresh, and rotates day to day.
 */
export function pickReflection(
  essays: readonly EssayRow[],
  now: Date,
  today: string,
  minAgeDays = 7,
): ReflectionPick | null {
  if (essays.length === 0) return null;

  const ageDays = (e: EssayRow) => Math.floor((now.getTime() - Date.parse(e.created_at)) / 86_400_000);
  const old = essays.filter((e) => ageDays(e) >= minAgeDays);
  const pool = (old.length > 0 ? old : [...essays]).sort((a, b) => a.id.localeCompare(b.id));
  const essay = pool[hash(today) % pool.length];

  return { essay, daysAgo: Math.max(0, ageDays(essay)) };
}
