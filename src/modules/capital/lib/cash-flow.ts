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
