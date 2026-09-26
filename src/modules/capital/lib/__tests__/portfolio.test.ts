import { describe, expect, it } from "vitest";

import { lotSizeFor, quantityUnit } from "../constants";
import { formatPercentPoint } from "../format";
import { buildPortfolioView, planAllocation, toKrw, type PortfolioRow } from "../portfolio";

let seq = 0;
function row(overrides: Partial<PortfolioRow>): PortfolioRow {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    user_id: "u",
    asset_name: `asset-${seq}`,
    ticker: null,
    category: "index_etf",
    currency: "KRW",
    target_ratio: 0,
    current_qty: 0,
    avg_buy_price: 0,
    current_price: 1,
    tolerance_band: 0.03,
    auto_price: true,
    quote_symbol: null,
    prev_close: null,
    price_updated_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("toKrw", () => {
  it("converts USD at the given rate and leaves KRW alone", () => {
    expect(toKrw(10, "USD", 1400)).toBe(14_000);
    expect(toKrw(10, "KRW", 1400)).toBe(10);
  });
});

describe("lotSizeFor", () => {
  it("uses whole shares, satoshis for crypto and minor units for cash", () => {
    expect(lotSizeFor("stock", "USD")).toBe(1);
    expect(lotSizeFor("crypto", "KRW")).toBe(1e-8);
    expect(lotSizeFor("cash", "KRW")).toBe(1);
    expect(lotSizeFor("cash", "USD")).toBe(0.01);
  });
});

describe("quantityUnit", () => {
  it("labels shares, coins and cash amounts", () => {
    expect(quantityUnit("index_etf", "USD")).toBe("주");
    expect(quantityUnit("crypto", "KRW")).toBe("개");
    expect(quantityUnit("cash", "KRW")).toBe("원");
    expect(quantityUnit("cash", "USD")).toBe("달러");
  });
});

describe("buildPortfolioView", () => {
  it("values USD assets in KRW when computing weights", () => {
    const view = buildPortfolioView(
      [
        row({ currency: "USD", current_price: 100, current_qty: 10, target_ratio: 0.5 }), // 1,400,000
        row({ current_price: 1000, current_qty: 600, target_ratio: 0.5 }), // 600,000
      ],
      1400,
    );

    expect(view.totalValueKrw).toBe(2_000_000);
    expect(view.items[0].currentWeight).toBeCloseTo(0.7);
    expect(view.items[0].drift).toBeCloseTo(0.2);
  });

  it("flags assets whose drift exceeds their own tolerance band", () => {
    const view = buildPortfolioView(
      [
        row({ current_qty: 54, target_ratio: 0.5, tolerance_band: 0.03 }), // +4%p > 3%p
        row({ current_qty: 46, target_ratio: 0.5, tolerance_band: 0.05 }), // −4%p < 5%p
      ],
      1400,
    );

    expect(view.items.map((i) => i.outOfBand)).toEqual([true, false]);
    expect(view.outOfBandCount).toBe(1);
  });

  it("does not flag a drift exactly at the band edge", () => {
    const view = buildPortfolioView(
      [row({ current_qty: 53, target_ratio: 0.5 }), row({ current_qty: 47, target_ratio: 0.5 })],
      1400,
    );
    expect(view.outOfBandCount).toBe(0);
  });

  it("does not flag anything for an empty (zero-value) portfolio", () => {
    const view = buildPortfolioView([row({ target_ratio: 0.5 }), row({ target_ratio: 0.5 })], 1400);
    expect(view.totalValueKrw).toBe(0);
    expect(view.outOfBandCount).toBe(0);
  });

  it("reports whether targets sum to 100%", () => {
    expect(buildPortfolioView([row({ target_ratio: 0.6 }), row({ target_ratio: 0.4 })], 1).targetsValid).toBe(true);
    const partial = buildPortfolioView([row({ target_ratio: 0.6 })], 1);
    expect(partial.targetsValid).toBe(false);
    expect(partial.targetSum).toBeCloseTo(0.6);
    expect(buildPortfolioView([], 1).targetsValid).toBe(false);
  });

  it("computes unrealised return from the average buy price", () => {
    const view = buildPortfolioView(
      [row({ target_ratio: 1, current_qty: 1, current_price: 120, avg_buy_price: 100 })],
      1,
    );
    expect(view.items[0].returnRate).toBeCloseTo(0.2);
    expect(buildPortfolioView([row({ target_ratio: 1 })], 1).items[0].returnRate).toBeNull();
  });
});

describe("planAllocation", () => {
  it("returns share counts per asset and KRW totals", () => {
    const plan = planAllocation(
      [
        row({ asset_name: "S&P500", currency: "USD", current_price: 10, target_ratio: 0.5 }),
        row({ asset_name: "KOSPI", current_price: 10_000, target_ratio: 0.5 }),
      ],
      100_000,
      1000,
    );

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.rows.map((r) => [r.assetName, r.quantity])).toEqual([
      ["S&P500", 5],
      ["KOSPI", 5],
    ]);
    expect(plan.rows[0].unitPrice).toBe(10); // native USD price
    expect(plan.rows[0].costKrw).toBe(50_000);
    expect(plan.totalSpentKrw).toBe(100_000);
    expect(plan.leftoverKrw).toBe(0);
    expect(plan.rows[0].weightAfter).toBeCloseTo(0.5);
  });

  it("buys fractional crypto", () => {
    const plan = planAllocation(
      [
        row({ category: "crypto", current_price: 100_000_000, target_ratio: 0.5 }),
        row({ category: "cash", current_price: 1, target_ratio: 0.5 }),
      ],
      1_000_000,
      1400,
    );
    expect(plan.ok && plan.rows[0].quantity).toBeCloseTo(0.005, 8);
  });

  it("explains a target sum that is not 100%", () => {
    const plan = planAllocation([row({ target_ratio: 0.6 }), row({ target_ratio: 0.3 })], 1000, 1400);
    expect(plan).toEqual({ ok: false, error: "목표 비중 합계가 100%가 아닙니다 (현재 90.00%)." });
  });

  it("names assets without a current price", () => {
    const plan = planAllocation([row({ asset_name: "무가격", current_price: 0, target_ratio: 1 })], 1000, 1400);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error).toContain("무가격");
  });

  it("rejects empty portfolios, non-positive cash and bad FX rates", () => {
    expect(planAllocation([], 1000, 1400).ok).toBe(false);
    const rows = [row({ target_ratio: 1 })];
    expect(planAllocation(rows, 0, 1400).ok).toBe(false);
    expect(planAllocation(rows, Number.NaN, 1400).ok).toBe(false);
    expect(planAllocation(rows, 1000, 0).ok).toBe(false);
  });
});

describe("formatPercentPoint", () => {
  it("signs positive drift and never prints -0.0", () => {
    expect(formatPercentPoint(0.042)).toBe("+4.2%p");
    expect(formatPercentPoint(-0.042)).toBe("-4.2%p");
    expect(formatPercentPoint(-0.00001)).toBe("0.0%p");
  });
});

describe("buildPortfolioView — P/L and daily change", () => {
  it("computes cost basis, unrealised P/L and change since the previous close", () => {
    const view = buildPortfolioView(
      [
        row({ current_qty: 10, avg_buy_price: 100, current_price: 120, prev_close: 110, target_ratio: 0.5 }),
        row({ currency: "USD", current_qty: 2, avg_buy_price: 50, current_price: 40, prev_close: 50, target_ratio: 0.5 }),
        row({ category: "cash", current_qty: 1000, current_price: 1 }),
      ],
      1000,
    );
    const [krw, usd, cash] = view.items;
    expect(krw.costKrw).toBe(1000);
    expect(krw.pnlKrw).toBe(200);
    expect(krw.dayChange).toBeCloseTo(10 / 110, 10);
    expect(krw.dayChangeKrw).toBe(100);
    expect(usd.pnlKrw).toBe(80_000 - 100_000);
    expect(usd.dayChangeKrw).toBe(-20_000);
    expect(cash.pnlKrw).toBeNull();
    expect(cash.dayChange).toBeNull();

    expect(view.totalCostKrw).toBe(101_000);
    expect(view.totalPnlKrw).toBe(200 - 20_000);
    expect(view.totalPnlRate).toBeCloseTo(-19_800 / 101_000, 10);
    expect(view.dayChangeKrw).toBe(100 - 20_000);
    // Previous total = 1200 + 80000 + 1000 − (−19900) = 102100.
    expect(view.dayChangeRate).toBeCloseTo(-19_900 / 102_100, 10);
  });

  it("reports no daily change when no previous close is known", () => {
    const view = buildPortfolioView([row({ current_qty: 1, current_price: 10, target_ratio: 1 })], 1400);
    expect(view.dayChangeRate).toBeNull();
    expect(view.totalPnlRate).toBeNull();
  });
});
