import { requireUser } from "@/lib/supabase/auth";
import { unwrap } from "@/lib/supabase/errors";

import { DEFAULT_USD_KRW_RATE } from "./lib/constants";

export async function getCapitalData() {
  const { supabase } = await requireUser();

  const [portfolios, settings, cashFlows] = await Promise.all([
    supabase.from("portfolios").select("*").order("target_ratio", { ascending: false }).order("asset_name"),
    supabase.from("capital_settings").select("usd_krw_rate").maybeSingle(),
    supabase.from("cash_flows").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(50),
  ]);

  return {
    rows: unwrap(portfolios, "포트폴리오"),
    usdKrwRate: Number(unwrap(settings, "환율 설정")?.usd_krw_rate ?? DEFAULT_USD_KRW_RATE),
    cashFlows: unwrap(cashFlows, "입금 기록"),
  };
}
