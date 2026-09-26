import type { Currency, PortfolioCategory } from "@/lib/supabase/database.types";

/**
 * Where each asset's live price comes from. Everything here is pure (no
 * network) so it can be unit-tested against recorded API responses.
 *
 * - Crypto in KRW  → Upbit            (e.g. BTC → KRW-BTC)
 * - US / KR listed → Yahoo Finance    (VOO, 069500 → 069500.KS / .KQ)
 * - KR fallback    → Naver Finance    (6-digit code)
 * - USD/KRW rate   → Yahoo (KRW=X), fallback open.er-api.com
 */

export type QuoteSource =
  | { provider: "upbit"; symbol: string }
  | { provider: "yahoo"; symbol: string; fallbacks?: string[] }
  | { provider: "naver"; symbol: string };

export interface Quote {
  price: number;
  /** Previous session close, for the daily change. */
  prevClose: number | null;
  /** When the price was traded (falls back to fetch time). */
  at: string;
}

export interface QuoteTarget {
  category: PortfolioCategory;
  currency: Currency;
  ticker: string | null;
  quote_symbol: string | null;
  auto_price: boolean;
}

const KR_CODE = /^[0-9][0-9A-Z]{5}$/;

/**
 * Chooses the quote sources for an asset, most reliable first. Returns an
 * empty list when the price should stay manual (cash, no ticker, opted out).
 */
export function quoteSources(asset: QuoteTarget): QuoteSource[] {
  if (!asset.auto_price || asset.category === "cash") return [];

  const override = asset.quote_symbol?.trim().toUpperCase();
  if (override) {
    // "KRW-BTC" style symbols are Upbit markets; anything else is a Yahoo symbol.
    return /^KRW-[A-Z0-9]+$/.test(override)
      ? [{ provider: "upbit", symbol: override }]
      : [{ provider: "yahoo", symbol: override }];
  }

  const ticker = asset.ticker?.trim().toUpperCase();
  if (!ticker) return [];

  if (asset.category === "crypto") {
    return asset.currency === "KRW"
      ? [{ provider: "upbit", symbol: `KRW-${ticker}` }, { provider: "yahoo", symbol: `${ticker}-KRW` }]
      : [{ provider: "yahoo", symbol: `${ticker}-USD` }];
  }

  if (asset.currency === "KRW" && KR_CODE.test(ticker)) {
    return [
      { provider: "yahoo", symbol: `${ticker}.KS`, fallbacks: [`${ticker}.KQ`] },
      { provider: "naver", symbol: ticker },
    ];
  }

  return [{ provider: "yahoo", symbol: ticker }];
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replaceAll(",", "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Upbit `/v1/ticker` → one quote per market. */
export function parseUpbit(body: unknown): Map<string, Quote> {
  const quotes = new Map<string, Quote>();
  if (!Array.isArray(body)) return quotes;
  for (const row of body as Record<string, unknown>[]) {
    const price = num(row.trade_price);
    if (typeof row.market !== "string" || price === null) continue;
    const ts = typeof row.trade_timestamp === "number" ? row.trade_timestamp : row.timestamp;
    quotes.set(row.market, {
      price,
      prevClose: num(row.prev_closing_price),
      at: typeof ts === "number" ? new Date(ts).toISOString() : new Date().toISOString(),
    });
  }
  return quotes;
}

/** Yahoo `/v8/finance/chart/{symbol}` → quote from the chart metadata. */
export function parseYahoo(body: unknown): Quote | null {
  const meta = (body as { chart?: { result?: { meta?: Record<string, unknown> }[] | null } })?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = num(meta.regularMarketPrice);
  if (price === null) return null;
  const time = typeof meta.regularMarketTime === "number" ? meta.regularMarketTime * 1000 : Date.now();
  return {
    price,
    prevClose: num(meta.chartPreviousClose) ?? num(meta.previousClose),
    at: new Date(time).toISOString(),
  };
}

/** Naver `m.stock.naver.com/api/stock/{code}/basic` (values are strings with commas). */
export function parseNaver(body: unknown): Quote | null {
  const b = body as Record<string, unknown> | null;
  if (!b) return null;
  const price = num(b.closePrice);
  if (price === null) return null;
  const diff = typeof b.compareToPreviousClosePrice === "string" ? Number(b.compareToPreviousClosePrice.replaceAll(",", "")) : NaN;
  const at = typeof b.localTradedAt === "string" && !Number.isNaN(Date.parse(b.localTradedAt)) ? new Date(b.localTradedAt).toISOString() : new Date().toISOString();
  return { price, prevClose: Number.isFinite(diff) ? price - diff : null, at };
}

/** open.er-api.com `/v6/latest/USD` → KRW per USD. */
export function parseErApi(body: unknown): number | null {
  const b = body as { result?: string; rates?: Record<string, unknown> } | null;
  if (b?.result !== "success") return null;
  return num(b.rates?.KRW);
}

/** Change vs previous close as a fraction, or null when unknown. */
export function dailyChange(price: number, prevClose: number | null | undefined): number | null {
  if (!prevClose || prevClose <= 0 || !(price > 0)) return null;
  return price / prevClose - 1;
}
