import { describe, expect, it } from "vitest";

import { allocationByCategory, periodReturns } from "../performance";
import { buildPortfolioView, type PortfolioRow } from "../portfolio";
import { addMonths, monthsUntil, projectGoal, requiredMonthly } from "../projection";
import { applyTrade, realizedThisYear } from "../trades";

describe("applyTrade", () => {
  it("moves the average price on a buy, fees included", () => {
    const result = applyTrade({ quantity: 10, avgPrice: 100 }, { side: "buy", quantity: 10, price: 200, fee: 10 });
    expect(result).toEqual({ ok: true, position: { quantity: 20, avgPrice: 150.5 }, realizedPnl: null });
  });

  it("starts a position from nothing", () => {
    const result = applyTrade({ quantity: 0, avgPrice: 0 }, { side: "buy", quantity: 0.5, price: 1000 });
    expect(result).toMatchObject({ ok: true, position: { quantity: 0.5, avgPrice: 1000 } });
  });

  it("keeps the average and realises profit on a sell", () => {
    const result = applyTrade({ quantity: 10, avgPrice: 100 }, { side: "sell", quantity: 4, price: 130, fee: 2 });
    expect(result).toEqual({ ok: true, position: { quantity: 6, avgPrice: 100 }, realizedPnl: 118 });
  });

  it("clears the average when everything is sold", () => {
    const result = applyTrade({ quantity: 0.3, avgPrice: 50 }, { side: "sell", quantity: 0.3, price: 40 });
    expect(result).toEqual({ ok: true, position: { quantity: 0, avgPrice: 0 }, realizedPnl: -3 });
  });

  it("refuses to sell more than is held", () => {
    expect(applyTrade({ quantity: 1, avgPrice: 1 }, { side: "sell", quantity: 2, price: 1 }).ok).toBe(false);
    expect(applyTrade({ quantity: 1, avgPrice: 1 }, { side: "buy", quantity: 0, price: 1 }).ok).toBe(false);
  });

  it("sums realised profit for a year", () => {
    expect(
      realizedThisYear(
        [
          { date: "2026-01-02", realized_pnl: 100 },
          { date: "2026-05-01", realized_pnl: -30 },
          { date: "2025-12-31", realized_pnl: 999 },
          { date: "2026-06-01", realized_pnl: null },
        ],
        "2026",
      ),
    ).toBe(70);
  });
});

describe("projection", () => {
  it("counts months and shifts across years", () => {
    expect(monthsUntil("2026-09-28", "2027-03-01")).toBe(6);
    expect(monthsUntil("2026-09-28", "2026-01-01")).toBe(0);
    expect(addMonths("2026-11-15", 3)).toBe("2027-02");
  });

  it("reaches a goal with contributions only when the return is zero", () => {
    const p = projectGoal({ current: 1000, monthly: 100, annualReturn: 0, goal: 1500, today: "2026-09-28" });
    expect(p.reachMonth).toBe("2027-02");
    expect(p.series[5]).toEqual({ month: "2027-02", value: 1500, contributed: 1500 });
  });

  it("compounds monthly at the equivalent of the yearly rate", () => {
    const p = projectGoal({ current: 1000, monthly: 0, annualReturn: 0.1, goal: 1e9, today: "2026-01-10", maxYears: 1 });
    expect(p.series[12].value).toBeCloseTo(1100, 6);
    expect(p.reachMonth).toBeNull();
  });

  it("works out the monthly amount needed by the goal date", () => {
    expect(requiredMonthly(0, 1200, 0, 12)).toBe(100);
    expect(requiredMonthly(2000, 1000, 0.01, 12)).toBe(0);
    // Check the annuity formula by simulating it.
    const r = 0.005;
    const need = requiredMonthly(1000, 50_000, r, 60);
    let v = 1000;
    for (let i = 0; i < 60; i++) v = v * (1 + r) + need;
    expect(v).toBeCloseTo(50_000, 6);
    const p = projectGoal({ current: 1000, monthly: 0, annualReturn: 0, goal: 2200, today: "2026-09-28", goalDate: "2027-09-01" });
    expect(p.monthsToGoalDate).toBe(12);
    expect(p.requiredMonthly).toBe(100);
  });

  it("marks the goal reached today when already above it", () => {
    expect(projectGoal({ current: 10, monthly: 0, annualReturn: 0, goal: 5, today: "2026-09-28" }).reachMonth).toBe("2026-09");
  });
});

describe("periodReturns", () => {
  const snaps = [
    { date: "2025-12-31", value: 1000, invested: 900 },
    { date: "2026-08-28", value: 1500, invested: 1300 },
    { date: "2026-09-21", value: 1800, invested: 1500 },
    { date: "2026-09-28", value: 9999, invested: 0 },
  ];

  it("compares against the last snapshot on or before each start, ignoring today's", () => {
    const r = periodReturns(snaps, { value: 2000, invested: 1600 }, "2026-09-28");
    const byKey = Object.fromEntries(r.map((x) => [x.key, x]));
    expect(byKey["1w"]).toMatchObject({ since: "2026-09-21", valueChange: 200, pnlChange: 100 });
    expect(byKey["1m"]).toMatchObject({ since: "2026-08-28", valueChange: 500 });
    expect(byKey["ytd"]).toMatchObject({ since: "2025-12-31", label: "올해" });
    expect(byKey["1m"].valueRate).toBeCloseTo(1 / 3, 10);
  });

  it("falls back to the first snapshot once, marked with *", () => {
    const r = periodReturns([{ date: "2026-09-25", value: 100, invested: 100 }], { value: 110, invested: 100 }, "2026-09-28");
    expect(r.map((x) => x.label)).toEqual(["1주*"]);
    expect(r[0].pnlChange).toBe(10);
  });

  it("is empty without history", () => {
    expect(periodReturns([], { value: 1, invested: 1 }, "2026-09-28")).toEqual([]);
  });
});

describe("allocationByCategory", () => {
  it("groups values by category in a fixed order", () => {
    const base = { user_id: "u", ticker: null, currency: "KRW", avg_buy_price: 0, tolerance_band: 0.03, auto_price: false, quote_symbol: null, prev_close: null, price_updated_at: null, created_at: "", updated_at: "" } as const;
    const rows: PortfolioRow[] = [
      { ...base, id: "a", asset_name: "c", category: "cash", target_ratio: 0.2, current_qty: 200, current_price: 1 },
      { ...base, id: "b", asset_name: "e1", category: "index_etf", target_ratio: 0.4, current_qty: 1, current_price: 300 },
      { ...base, id: "d", asset_name: "e2", category: "index_etf", target_ratio: 0.4, current_qty: 1, current_price: 500 },
    ];
    const slices = allocationByCategory(buildPortfolioView(rows, 1400));
    expect(slices.map((s) => [s.category, s.valueKrw])).toEqual([["index_etf", 800], ["cash", 200]]);
    expect(slices[0].weight).toBeCloseTo(0.8, 10);
    expect(slices[0].targetWeight).toBeCloseTo(0.8, 10);
  });
});
