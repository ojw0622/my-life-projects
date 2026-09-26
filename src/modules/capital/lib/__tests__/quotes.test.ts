import { describe, expect, it } from "vitest";

import { dailyChange, parseErApi, parseNaver, parseUpbit, parseYahoo, quoteSources, type QuoteTarget } from "../quotes";

const target = (o: Partial<QuoteTarget>): QuoteTarget => ({
  category: "index_etf",
  currency: "KRW",
  ticker: null,
  quote_symbol: null,
  auto_price: true,
  ...o,
});

describe("quoteSources", () => {
  it("uses Upbit for KRW crypto with Yahoo as backup", () => {
    expect(quoteSources(target({ category: "crypto", ticker: "btc" }))).toEqual([
      { provider: "upbit", symbol: "KRW-BTC" },
      { provider: "yahoo", symbol: "BTC-KRW" },
    ]);
  });

  it("uses Yahoo USD pairs for USD crypto", () => {
    expect(quoteSources(target({ category: "crypto", currency: "USD", ticker: "ETH" }))).toEqual([
      { provider: "yahoo", symbol: "ETH-USD" },
    ]);
  });

  it("maps Korean 6-digit codes to KOSPI then KOSDAQ, then Naver", () => {
    expect(quoteSources(target({ ticker: "069500" }))).toEqual([
      { provider: "yahoo", symbol: "069500.KS", fallbacks: ["069500.KQ"] },
      { provider: "naver", symbol: "069500" },
    ]);
  });

  it("uses the ticker as-is for US listings", () => {
    expect(quoteSources(target({ currency: "USD", ticker: "voo" }))).toEqual([{ provider: "yahoo", symbol: "VOO" }]);
  });

  it("honours a quote symbol override", () => {
    expect(quoteSources(target({ ticker: "TIGER", quote_symbol: "360750.KS" }))).toEqual([
      { provider: "yahoo", symbol: "360750.KS" },
    ]);
    expect(quoteSources(target({ category: "crypto", quote_symbol: "krw-eth" }))).toEqual([
      { provider: "upbit", symbol: "KRW-ETH" },
    ]);
  });

  it("keeps manual prices for cash, missing tickers and opted-out assets", () => {
    expect(quoteSources(target({ category: "cash", ticker: "KRW" }))).toEqual([]);
    expect(quoteSources(target({ ticker: null }))).toEqual([]);
    expect(quoteSources(target({ ticker: "VOO", auto_price: false }))).toEqual([]);
  });
});

describe("parsers", () => {
  it("parses Upbit tickers", () => {
    const quotes = parseUpbit([
      { market: "KRW-BTC", trade_price: 95_000_000, prev_closing_price: 94_000_000, trade_timestamp: 1_790_000_000_000 },
      { market: "KRW-BAD", trade_price: 0 },
    ]);
    expect(quotes.get("KRW-BTC")).toEqual({ price: 95_000_000, prevClose: 94_000_000, at: new Date(1_790_000_000_000).toISOString() });
    expect(quotes.has("KRW-BAD")).toBe(false);
    expect(parseUpbit({ error: { name: "404" } }).size).toBe(0);
  });

  it("parses Yahoo chart metadata", () => {
    const body = {
      chart: {
        result: [{ meta: { symbol: "VOO", regularMarketPrice: 521.3, chartPreviousClose: 515, regularMarketTime: 1_790_000_000 } }],
        error: null,
      },
    };
    expect(parseYahoo(body)).toEqual({ price: 521.3, prevClose: 515, at: new Date(1_790_000_000_000).toISOString() });
    expect(parseYahoo({ chart: { result: null, error: { code: "Not Found" } } })).toBeNull();
    expect(parseYahoo(null)).toBeNull();
  });

  it("parses Naver's comma-formatted strings", () => {
    const quote = parseNaver({
      closePrice: "35,120",
      compareToPreviousClosePrice: "-120",
      localTradedAt: "2026-09-25T15:30:00+09:00",
    });
    expect(quote).toEqual({ price: 35_120, prevClose: 35_240, at: "2026-09-25T06:30:00.000Z" });
    expect(parseNaver({ closePrice: "-" })).toBeNull();
  });

  it("parses the er-api fallback FX rate", () => {
    expect(parseErApi({ result: "success", rates: { KRW: 1382.5 } })).toBe(1382.5);
    expect(parseErApi({ result: "error" })).toBeNull();
  });

  it("computes daily change", () => {
    expect(dailyChange(110, 100)).toBeCloseTo(0.1);
    expect(dailyChange(110, null)).toBeNull();
    expect(dailyChange(110, 0)).toBeNull();
  });
});
