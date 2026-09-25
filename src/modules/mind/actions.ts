"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { failWith, parseForm, type ActionState } from "@/lib/forms";
import { requireUser } from "@/lib/supabase/auth";
import { dbErrorState } from "@/lib/supabase/errors";

import { essayFormSchema, principleFormSchema } from "./lib/schemas";

export async function saveEssay(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(essayFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { id, ...values } = parsed.data;

  if (id) {
    const { error } = await supabase.from("essays").update(values).eq("id", id);
    if (error) return failWith(dbErrorState(error), formData);
    revalidatePath("/mind");
    revalidatePath(`/mind/${id}`);
    revalidatePath("/");
    return { ok: true, message: "저장했습니다." };
  }

  const { data, error } = await supabase
    .from("essays")
    .insert({ ...values, user_id: user.id })
    .select("id")
    .single();
  if (error) return failWith(dbErrorState(error), formData);

  revalidatePath("/mind");
  revalidatePath("/");
  redirect(`/mind/${data.id}`);
}

export async function deleteEssay(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("essays").delete().eq("id", id);
  if (error) throw new Error("에세이를 삭제하지 못했습니다.");
  revalidatePath("/mind");
  revalidatePath("/");
  redirect("/mind");
}

export async function addPrinciple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(principleFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("principles").insert({ ...parsed.data, user_id: user.id });
  if (error) return failWith(dbErrorState(error), formData);

  revalidatePath("/mind");
  return { ok: true, message: "추가했습니다." };
}

export async function deletePrinciple(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("principles").delete().eq("id", id);
  if (error) throw new Error("원칙을 삭제하지 못했습니다.");
  revalidatePath("/mind");
}
