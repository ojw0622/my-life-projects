import { notFound } from "next/navigation";

import { requireUser } from "@/lib/supabase/auth";
import { unwrap } from "@/lib/supabase/errors";

export async function getEssays() {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("essays").select("*").order("created_at", { ascending: false }),
    "에세이",
  );
}

export async function getEssay(id: string) {
  const { supabase } = await requireUser();
  const essay = unwrap(await supabase.from("essays").select("*").eq("id", id).maybeSingle(), "에세이");
  if (!essay) notFound();
  return essay;
}

export async function getPrinciples() {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("principles").select("*").order("category").order("created_at"),
    "원칙",
  );
}

/** Lightweight rows for the Spaced Reflection widget. */
export async function getReflectionCandidates() {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase.from("essays").select("*").order("created_at", { ascending: false }).limit(500),
    "에세이",
  );
}
