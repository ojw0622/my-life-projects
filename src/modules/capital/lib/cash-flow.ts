import { addDays } from "@/lib/date";
import type { Tables } from "@/lib/supabase/database.types";

export type CashFlowRow = Tables<"cash_flows">;

export interface CashFlowSummary {
  /** Inflows dated within the 30 days ending today (inclusive). */
  last30Days: number;
  yearSaving: number;
  yearDividend: number;
}

export function summarizeCashFlows(flows: readonly CashFlowRow[], today: string): CashFlowSummary {
  const since = addDays(today, -29);
  const year = today.slice(0, 4);
  const summary: CashFlowSummary = { last30Days: 0, yearSaving: 0, yearDividend: 0 };

  for (const flow of flows) {
    if (flow.date > today) continue;
    const amount = Number(flow.amount);
    if (flow.date >= since) summary.last30Days += amount;
    if (flow.date.startsWith(year)) {
      if (flow.flow_type === "saving") summary.yearSaving += amount;
      else summary.yearDividend += amount;
    }
  }
  return summary;
}

export type CashFlowPlanRow = Tables<"cash_flow_plans">;

/** "2026-09" for a YYYY-MM-DD date. */
export const monthOf = (date: string) => date.slice(0, 7);

/** The date a plan falls on in a given month ("2026-09" → "2026-09-25"). */
export function planDate(plan: Pick<CashFlowPlanRow, "day_of_month">, month: string): string {
  return `${month}-${String(plan.day_of_month).padStart(2, "0")}`;
}

/** Months from `count - 1` months ago up to `today`'s month, oldest first. */
export function recentMonths(today: string, count: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/**
 * Active plans whose day has come this month but have no record for this
 * month yet — shown as "이번 달 기록하기".
 */
export function duePlans(plans: readonly CashFlowPlanRow[], flows: readonly CashFlowRow[], today: string): CashFlowPlanRow[] {
  const month = monthOf(today);
  const recorded = new Set(flows.filter((f) => f.plan_id && monthOf(f.date) === month).map((f) => f.plan_id));
  return plans.filter((p) => p.active && planDate(p, month) <= today && !recorded.has(p.id));
}

export interface LedgerMonth {
  month: string;
  saving: number;
  dividend: number;
  total: number;
  /** Sum of active plans (what the month should reach). */
  planned: number;
}

/** Month-by-month totals for the last `count` months, oldest first. */
export function monthlyLedger(
  flows: readonly CashFlowRow[],
  plans: readonly CashFlowPlanRow[],
  today: string,
  count = 12,
): LedgerMonth[] {
  const planned = plans.filter((p) => p.active).reduce((s, p) => s + Number(p.amount), 0);
  const months = new Map(recentMonths(today, count).map((m) => [m, { month: m, saving: 0, dividend: 0, total: 0, planned }]));
  for (const f of flows) {
    const entry = months.get(monthOf(f.date));
    if (!entry || f.date > today) continue;
    const amount = Number(f.amount);
    if (f.flow_type === "saving") entry.saving += amount;
    else entry.dividend += amount;
    entry.total += amount;
  }
  return [...months.values()];
}

/** Dividends received per asset in `year`, largest first. */
export function dividendsByAsset(flows: readonly CashFlowRow[], year: string): { assetId: string | null; amount: number }[] {
  const totals = new Map<string | null, number>();
  for (const f of flows) {
    if (f.flow_type !== "dividend" || !f.date.startsWith(year)) continue;
    totals.set(f.asset_id, (totals.get(f.asset_id) ?? 0) + Number(f.amount));
  }
  return [...totals].map(([assetId, amount]) => ({ assetId, amount })).sort((a, b) => b.amount - a.amount);
}
