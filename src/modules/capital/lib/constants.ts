import type { Currency, PortfolioCategory } from "@/lib/supabase/database.types";

export const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  index_etf: "지수ETF",
  stock: "개별주",
  bond: "채권",
  commodity: "원자재",
  crypto: "코인",
  cash: "현금",
  other: "기타",
};

export const CATEGORIES = [
  "index_etf",
  "stock",
  "bond",
  "commodity",
  "crypto",
  "cash",
  "other",
] as const satisfies readonly PortfolioCategory[];
export const CURRENCIES = ["KRW", "USD"] as const satisfies readonly Currency[];

export const DEFAULT_TOLERANCE_BAND = 0.03;
export const DEFAULT_USD_KRW_RATE = 1400;

/** Unit suffix for a quantity: shares, coins, or the cash currency itself. */
export function quantityUnit(category: PortfolioCategory, currency: Currency): string {
  if (category === "cash") return currency === "USD" ? "달러" : "원";
  if (category === "crypto") return "개";
  return "주";
}

/**
 * Smallest purchasable unit per category. Shares trade in whole units,
 * crypto in satoshi-sized units, and cash in the currency's minor unit.
 */
export function lotSizeFor(category: PortfolioCategory, currency: Currency): number {
  if (category === "crypto") return 1e-8;
  if (category === "cash") return currency === "USD" ? 0.01 : 1;
  return 1;
}
