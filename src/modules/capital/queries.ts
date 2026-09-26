import { addDays, todayIn } from "@/lib/date";
import { requireUser } from "@/lib/supabase/auth";
import { unwrap } from "@/lib/supabase/errors";

import { DEFAULT_USD_KRW_RATE } from "./lib/constants";

/** Enough history for the 12-month ledger and this year's totals. */
const FLOW_HISTORY_DAYS = 400;
const SNAPSHOT_DAYS = 365;

export async function getCapitalData() {
  const { supabase } = await requireUser();
  const today = todayIn();

  const [portfolios, settings, cashFlows, plans, snapshots] = await Promise.all([
    supabase.from("portfolios").select("*").order("target_ratio", { ascending: false }).order("asset_name"),
    supabase.from("capital_settings").select("usd_krw_rate, auto_fx, fx_updated_at").maybeSingle(),
    supabase
      .from("cash_flows")
      .select("*")
      .gte("date", addDays(today, -FLOW_HISTORY_DAYS))
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("cash_flow_plans").select("*").order("day_of_month").order("created_at"),
    supabase
      .from("portfolio_snapshots")
      .select("date, total_value_krw, invested_krw")
      .gte("date", addDays(today, -SNAPSHOT_DAYS))
      .order("date"),
  ]);

  const fx = unwrap(settings, "환율 설정");
  return {
    today,
    rows: unwrap(portfolios, "포트폴리오"),
    usdKrwRate: Number(fx?.usd_krw_rate ?? DEFAULT_USD_KRW_RATE),
    autoFx: fx?.auto_fx ?? true,
    fxUpdatedAt: fx?.fx_updated_at ?? null,
    cashFlows: unwrap(cashFlows, "입금 기록"),
    plans: unwrap(plans, "정기 입금"),
    snapshots: unwrap(snapshots, "자산 추이").map((s) => ({
      date: s.date,
      value: Number(s.total_value_krw),
      invested: Number(s.invested_krw),
    })),
  };
}
