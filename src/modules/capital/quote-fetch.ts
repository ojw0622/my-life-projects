import "server-only";

import {
  parseErApi,
  parseNaver,
  parseUpbit,
  parseYahoo,
  quoteSources,
  type Quote,
  type QuoteSource,
  type QuoteTarget,
} from "./lib/quotes";

// Base URLs can be overridden (tests point them at a local stub).
const UPBIT = process.env.QUOTES_UPBIT_URL ?? "https://api.upbit.com";
const YAHOO = process.env.QUOTES_YAHOO_URL ?? "https://query1.finance.yahoo.com";
const NAVER = process.env.QUOTES_NAVER_URL ?? "https://m.stock.naver.com";
const ER_API = process.env.QUOTES_FX_URL ?? "https://open.er-api.com";

const TIMEOUT_MS = 6000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "Mozilla/5.0 (compatible; my-life-dashboard)", accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fromSource(source: QuoteSource): Promise<Quote | null> {
  switch (source.provider) {
    case "upbit": {
      const quotes = parseUpbit(await getJson(`${UPBIT}/v1/ticker?markets=${encodeURIComponent(source.symbol)}`));
      return quotes.get(source.symbol) ?? null;
    }
    case "yahoo": {
      for (const symbol of [source.symbol, ...(source.fallbacks ?? [])]) {
        try {
          const quote = parseYahoo(await getJson(`${YAHOO}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`));
          if (quote) return quote;
        } catch {
          // try the next listing (e.g. KOSPI → KOSDAQ)
        }
      }
      return null;
    }
    case "naver":
      return parseNaver(await getJson(`${NAVER}/api/stock/${encodeURIComponent(source.symbol)}/basic`));
  }
}

export type QuoteResult =
  | { status: "ok"; quote: Quote; source: string }
  | { status: "manual" }
  | { status: "failed" };

/** Live quote for one asset, trying each source in order. Never throws. */
export async function fetchQuote(asset: QuoteTarget): Promise<QuoteResult> {
  const sources = quoteSources(asset);
  if (sources.length === 0) return { status: "manual" };
  for (const source of sources) {
    try {
      const quote = await fromSource(source);
      if (quote) return { status: "ok", quote, source: `${source.provider}:${source.symbol}` };
    } catch {
      // fall through to the next source
    }
  }
  return { status: "failed" };
}

/** KRW per USD, or null when every source fails. */
export async function fetchUsdKrw(): Promise<number | null> {
  try {
    const quote = parseYahoo(await getJson(`${YAHOO}/v8/finance/chart/KRW%3DX?range=1d&interval=1d`));
    if (quote) return quote.price;
  } catch {
    // fall back below
  }
  try {
    return parseErApi(await getJson(`${ER_API}/v6/latest/USD`));
  } catch {
    return null;
  }
}
