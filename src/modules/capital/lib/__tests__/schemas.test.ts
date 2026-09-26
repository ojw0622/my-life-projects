import { describe, expect, it } from "vitest";

import { assetFormSchema, cashFlowFormSchema } from "../schemas";

const base = {
  asset_name: " KODEX 200 ",
  ticker: "069500",
  category: "index_etf",
  currency: "KRW",
  target_ratio: "25",
  current_qty: "10",
  avg_buy_price: "",
  current_price: "35,000",
  tolerance_band: "",
};

describe("assetFormSchema", () => {
  it("converts percentages to fractions and fills defaults", () => {
    const parsed = assetFormSchema.parse(base);
    expect(parsed).toMatchObject({
      asset_name: "KODEX 200",
      target_ratio: 0.25,
      current_price: 35_000,
      avg_buy_price: 0,
      tolerance_band: 0.03,
    });
    expect(parsed.id).toBeUndefined();
  });

  it("keeps up to two decimals of a percentage", () => {
    expect(assetFormSchema.parse({ ...base, target_ratio: "12.346" }).target_ratio).toBe(0.1235);
  });

  it("uppercases tickers and treats a blank ticker as missing", () => {
    expect(assetFormSchema.parse({ ...base, ticker: "voo" }).ticker).toBe("VOO");
    expect(assetFormSchema.parse({ ...base, ticker: "  " }).ticker).toBeUndefined();
  });

  it("rejects out-of-range percentages and unknown categories", () => {
    expect(assetFormSchema.safeParse({ ...base, target_ratio: "120" }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...base, category: "nft" }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...base, currency: "EUR" }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...base, current_qty: "-1" }).success).toBe(false);
  });
});

describe("cashFlowFormSchema", () => {
  it("accepts a saving entry and rejects zero amounts", () => {
    const ok = cashFlowFormSchema.parse({ amount: "500,000", flow_type: "saving", date: "2026-09-25", note: "" });
    expect(ok).toEqual({ amount: 500_000, flow_type: "saving", date: "2026-09-25", note: undefined });
    expect(cashFlowFormSchema.safeParse({ amount: "0", flow_type: "saving", date: "2026-09-25" }).success).toBe(false);
    expect(cashFlowFormSchema.safeParse({ amount: "1", flow_type: "bonus", date: "2026-09-25" }).success).toBe(false);
  });
});

describe("capital v3 form fields", () => {
  const asset = { asset_name: "VOO", category: "index_etf", currency: "USD", target_ratio: "50", current_qty: "1" };

  it("reads the auto-price checkbox and allows a blank price", () => {
    const parsed = assetFormSchema.parse({ ...asset, auto_price: "on", current_price: "" });
    expect(parsed.auto_price).toBe(true);
    expect(parsed.current_price).toBe(0);
    expect(assetFormSchema.parse(asset).auto_price).toBe(false);
  });

  it("upper-cases the quote symbol", () => {
    expect(assetFormSchema.parse({ ...asset, quote_symbol: "krw-btc" }).quote_symbol).toBe("KRW-BTC");
  });

  it("validates monthly plans", async () => {
    const { planFormSchema } = await import("../schemas");
    expect(planFormSchema.parse({ flow_type: "saving", amount: "500,000", day_of_month: "25" })).toMatchObject({
      amount: 500_000,
      day_of_month: 25,
    });
    expect(planFormSchema.safeParse({ flow_type: "saving", amount: "1", day_of_month: "31" }).success).toBe(false);
    expect(planFormSchema.safeParse({ flow_type: "saving", amount: "0", day_of_month: "1" }).success).toBe(false);
  });

  it("accepts an optional asset on a cash flow", () => {
    const base = { amount: "1000", flow_type: "dividend", date: "2026-09-01" };
    expect(cashFlowFormSchema.parse(base).asset_id).toBeUndefined();
    expect(cashFlowFormSchema.safeParse({ ...base, asset_id: "nope" }).success).toBe(false);
  });
});
