"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { failWith, parseForm, type ActionState } from "@/lib/forms";
import { safeNextPath } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email("이메일 형식을 확인하세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  next: z.string().optional(),
});

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(credentialsSchema, formData);
  if (!parsed.success) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return failWith({ ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." }, formData);

  redirect(safeNextPath(parsed.data.next));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(credentialsSchema, formData);
  if (!parsed.success) return parsed.state;

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) return failWith({ ok: false, message: error.message }, formData);

  // With email confirmation disabled Supabase signs the user in right away.
  if (data.session) redirect("/");
  return { ok: true, message: "확인 메일을 보냈습니다. 메일의 링크를 누르면 로그인됩니다." };
}
