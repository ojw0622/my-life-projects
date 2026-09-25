import type { Tables } from "@/lib/supabase/database.types";

export type MindNoteRow = Tables<"mind_notes">;

/** One entry of the `mind_notes.paragraphs` JSON array (단락 구조). */
export interface Paragraph {
  order: number;
  heading?: string;
  text: string;
}
