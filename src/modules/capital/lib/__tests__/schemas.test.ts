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
