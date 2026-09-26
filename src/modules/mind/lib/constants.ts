import type { PrincipleCategory } from "@/lib/supabase/database.types";

export const PRINCIPLE_CATEGORY_LABELS: Record<PrincipleCategory, string> = {
  investment: "투자",
  life: "삶",
  body: "신체",
};

export const PRINCIPLE_CATEGORIES = ["investment", "life", "body"] as const satisfies readonly PrincipleCategory[];
