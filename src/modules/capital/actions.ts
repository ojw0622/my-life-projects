"use server";

import { revalidatePath } from "next/cache";

import { failWith, parseForm, type ActionState } from "@/lib/forms";
import { requireUser } from "@/lib/supabase/auth";
import { dbErrorState } from "@/lib/supabase/errors";

import { assetFormSchema, cashFlowFormSchema, fxRateFormSchema } from "./lib/schemas";

function revalidate() {
  revalidatePath("/capital");
  revalidatePath("/");
}

export async function saveAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(assetFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { id, ...values } = parsed.data;
  const record = { ...values, ticker: values.ticker ?? null };

  const { error } = id
    ? await supabase.from("portfolios").update(record).eq("id", id)
    : await supabase.from("portfolios").insert({ ...record, user_id: user.id });
  if (error) return failWith(dbErrorState(error, "같은 이름의 자산이 이미 있습니다."), formData);

  revalidate();
  return { ok: true, message: id ? "수정했습니다." : "등록했습니다." };
}

export async function deleteAsset(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("portfolios").delete().eq("id", id);
  if (error) throw new Error("자산을 삭제하지 못했습니다.");
  revalidate();
}

export async function addCashFlow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(cashFlowFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("cash_flows")
    .insert({ ...parsed.data, note: parsed.data.note ?? null, user_id: user.id });
  if (error) return failWith(dbErrorState(error), formData);

  revalidate();
  return { ok: true, message: "기록했습니다." };
}

export async function deleteCashFlow(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cash_flows").delete().eq("id", id);
  if (error) throw new Error("입금 기록을 삭제하지 못했습니다.");
  revalidate();
}

export async function saveFxRate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(fxRateFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("capital_settings")
    .upsert({ user_id: user.id, usd_krw_rate: parsed.data.usd_krw_rate });
  if (error) return failWith(dbErrorState(error), formData);

  revalidate();
  return { ok: true, message: "환율을 저장했습니다." };
}
