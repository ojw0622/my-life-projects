"use server";

import { revalidatePath } from "next/cache";

import { todayIn } from "@/lib/date";
import { failWith, parseForm, type ActionState } from "@/lib/forms";
import { requireUser } from "@/lib/supabase/auth";
import type { Tables } from "@/lib/supabase/database.types";
import { dbErrorState } from "@/lib/supabase/errors";

import { monthOf, planDate } from "./lib/cash-flow";
import { DEFAULT_USD_KRW_RATE } from "./lib/constants";
import { buildPortfolioView } from "./lib/portfolio";
import { assetFormSchema, cashFlowFormSchema, fxRateFormSchema, planFormSchema } from "./lib/schemas";
import { fetchQuote, fetchUsdKrw } from "./quote-fetch";

function revalidate() {
  revalidatePath("/capital");
  revalidatePath("/");
}

export async function saveAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(assetFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { id, ...values } = parsed.data;
  const record = { ...values, ticker: values.ticker ?? null, quote_symbol: values.quote_symbol ?? null };

  const { data: saved, error } = id
    ? await supabase.from("portfolios").update(record).eq("id", id).select().single()
    : await supabase.from("portfolios").insert({ ...record, user_id: user.id }).select().single();
  if (error) return failWith(dbErrorState(error, "같은 이름의 자산이 이미 있습니다."), formData);

  // Fill in the live price straight away; a failure keeps the typed price.
  if (saved.auto_price) {
    const result = await fetchQuote(saved);
    if (result.status === "ok") {
      await supabase.from("portfolios").update(priceUpdate(result.quote)).eq("id", saved.id);
    }
  }

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
    .insert({
      ...parsed.data,
      note: parsed.data.note ?? null,
      asset_id: parsed.data.flow_type === "dividend" ? (parsed.data.asset_id ?? null) : null,
      user_id: user.id,
    });
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
    // A hand-entered rate turns off the automatic rate until it is re-enabled.
    .upsert({ user_id: user.id, usd_krw_rate: parsed.data.usd_krw_rate, auto_fx: false, fx_updated_at: new Date().toISOString() });
  if (error) return failWith(dbErrorState(error), formData);

  revalidate();
  return { ok: true, message: "환율을 저장했습니다." };
}

export async function setAutoFx(enabled: boolean): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("capital_settings").upsert({ user_id: user.id, auto_fx: enabled });
  if (error) throw new Error("환율 설정을 바꾸지 못했습니다.");
  revalidate();
}

// ---------------------------------------------------------------------
// Live prices
// ---------------------------------------------------------------------

function priceUpdate(quote: { price: number; prevClose: number | null; at: string }) {
  return {
    current_price: quote.price,
    prev_close: quote.prevClose,
    price_updated_at: new Date().toISOString(),
  };
}

export interface RefreshSummary {
  updated: number;
  /** Names of auto-priced assets whose quote could not be fetched. */
  failed: string[];
  /** New USD/KRW rate, when it was refreshed. */
  fx: number | null;
  at: string;
}

/**
 * Fetches live quotes for every auto-priced asset (and the USD/KRW rate
 * when automatic), stores them and records today's portfolio total.
 * Assets whose quote fails keep their last price.
 */
export async function refreshPrices(): Promise<RefreshSummary> {
  const { supabase, user } = await requireUser();
  const [{ data: rows, error }, { data: settings }] = await Promise.all([
    supabase.from("portfolios").select("*"),
    supabase.from("capital_settings").select("usd_krw_rate, auto_fx").maybeSingle(),
  ]);
  if (error) throw new Error("포트폴리오를 불러오지 못했습니다.");

  const autoFx = settings?.auto_fx ?? true;
  const [results, fx] = await Promise.all([
    Promise.all(rows.map((row) => fetchQuote(row))),
    autoFx ? fetchUsdKrw() : Promise.resolve(null),
  ]);

  const current: Tables<"portfolios">[] = [];
  const failed: string[] = [];
  const writes: PromiseLike<unknown>[] = [];
  rows.forEach((row, i) => {
    const result = results[i];
    if (result.status === "ok") {
      const update = priceUpdate(result.quote);
      current.push({ ...row, ...update });
      writes.push(supabase.from("portfolios").update(update).eq("id", row.id));
    } else {
      if (result.status === "failed") failed.push(row.asset_name);
      current.push(row);
    }
  });

  const now = new Date().toISOString();
  const rate = fx ?? Number(settings?.usd_krw_rate ?? DEFAULT_USD_KRW_RATE);
  if (fx !== null) {
    writes.push(
      supabase.from("capital_settings").upsert({ user_id: user.id, usd_krw_rate: fx, fx_updated_at: now }),
    );
  }

  const view = buildPortfolioView(current, rate);
  if (view.totalValueKrw > 0) {
    writes.push(
      supabase.from("portfolio_snapshots").upsert({
        user_id: user.id,
        date: todayIn(),
        total_value_krw: Math.round(view.totalValueKrw * 100) / 100,
        invested_krw: Math.round(view.totalCostKrw * 100) / 100,
        updated_at: now,
      }),
    );
  }
  await Promise.all(writes);

  revalidate();
  return { updated: results.filter((r) => r.status === "ok").length, failed, fx, at: now };
}

// ---------------------------------------------------------------------
// Monthly plans (매달 입금)
// ---------------------------------------------------------------------

export async function savePlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(planFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { id, ...values } = parsed.data;
  const record = {
    ...values,
    note: values.note ?? null,
    asset_id: values.flow_type === "dividend" ? (values.asset_id ?? null) : null,
  };

  const { error } = id
    ? await supabase.from("cash_flow_plans").update(record).eq("id", id)
    : await supabase.from("cash_flow_plans").insert({ ...record, user_id: user.id });
  if (error) return failWith(dbErrorState(error), formData);

  revalidate();
  return { ok: true, message: id ? "수정했습니다." : "매달 입금을 추가했습니다." };
}

export async function deletePlan(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cash_flow_plans").delete().eq("id", id);
  if (error) throw new Error("매달 입금을 삭제하지 못했습니다.");
  revalidate();
}

export async function setPlanActive(id: string, active: boolean): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cash_flow_plans").update({ active }).eq("id", id);
  if (error) throw new Error("매달 입금을 바꾸지 못했습니다.");
  revalidate();
}

/**
 * Records this month's entry for the given plans (all active ones when no
 * ids are given). A plan already recorded this month is skipped — the
 * database allows one record per plan per month.
 */
export async function recordPlans(ids?: string[]): Promise<{ recorded: number; skipped: number }> {
  const { supabase, user } = await requireUser();
  let query = supabase.from("cash_flow_plans").select("*").eq("active", true);
  if (ids) query = query.in("id", ids);
  const { data: plans, error } = await query;
  if (error) throw new Error("매달 입금을 불러오지 못했습니다.");

  const today = todayIn();
  const month = monthOf(today);
  let recorded = 0;
  for (const plan of plans) {
    const { error: insertError } = await supabase.from("cash_flows").insert({
      user_id: user.id,
      plan_id: plan.id,
      flow_type: plan.flow_type,
      amount: plan.amount,
      // Recording ahead of the plan's day books it today, never in the future.
      date: planDate(plan, month) < today ? planDate(plan, month) : today,
      asset_id: plan.asset_id,
      note: plan.note ?? (plan.flow_type === "saving" ? "매달 저축" : "매달 배당"),
    });
    if (!insertError) recorded += 1;
    else if (insertError.code !== "23505") throw new Error("입금을 기록하지 못했습니다.");
  }

  revalidate();
  return { recorded, skipped: plans.length - recorded };
}
