import { describe, expect, it } from "vitest";

import { summarizeCashFlows, type CashFlowRow } from "../cash-flow";

const flow = (date: string, amount: number, flow_type: CashFlowRow["flow_type"] = "saving"): CashFlowRow => ({
  id: `${date}-${amount}`,
  user_id: "u",
  amount,
  flow_type,
  date,
  note: null,
  plan_id: null,
  asset_id: null,
  created_at: `${date}T00:00:00Z`,
});

describe("summarizeCashFlows", () => {
  it("sums the trailing 30 days and year-to-date by type", () => {
    const summary = summarizeCashFlows(
      [
        flow("2026-09-25", 100),
        flow("2026-08-27", 50, "dividend"), // day 30 of the window
        flow("2026-08-26", 1000), // day 31: outside the window, inside the year
        flow("2025-12-31", 9999), // last year
        flow("2026-09-26", 7), // future-dated: ignored
      ],
      "2026-09-25",
    );

    expect(summary).toEqual({ last30Days: 150, yearSaving: 1100, yearDividend: 50 });
  });
});

import { dividendsByAsset, duePlans, monthlyLedger, planDate, recentMonths, type CashFlowPlanRow } from "../cash-flow";

const plan = (id: string, over: Partial<CashFlowPlanRow> = {}): CashFlowPlanRow => ({
  id,
  user_id: "u",
  flow_type: "saving",
  amount: 500_000,
  day_of_month: 25,
  asset_id: null,
  note: null,
  active: true,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("monthly plans", () => {
  it("places a plan on its day of the month", () => {
    expect(planDate({ day_of_month: 5 }, "2026-09")).toBe("2026-09-05");
  });

  it("lists recent months across a year boundary", () => {
    expect(recentMonths("2026-02-10", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("is due once its day has come and nothing is recorded this month", () => {
    const plans = [plan("a", { day_of_month: 25 }), plan("b", { day_of_month: 28 }), plan("c", { day_of_month: 1, active: false })];
    expect(duePlans(plans, [], "2026-09-26").map((p) => p.id)).toEqual(["a"]);
    const recorded = { ...flow("2026-09-25", 500_000), plan_id: "a" };
    expect(duePlans(plans, [recorded], "2026-09-26")).toEqual([]);
    // Last month's record does not count for this month.
    expect(duePlans(plans, [{ ...flow("2026-08-25", 500_000), plan_id: "a" }], "2026-09-26").map((p) => p.id)).toEqual(["a"]);
  });

  it("builds a monthly ledger with planned amounts", () => {
    const ledger = monthlyLedger(
      [flow("2026-09-25", 500_000), flow("2026-09-10", 30_000, "dividend"), flow("2026-07-25", 400_000), flow("2025-01-01", 1)],
      [plan("a"), plan("b", { amount: 100_000 }), plan("c", { active: false })],
      "2026-09-26",
      3,
    );
    expect(ledger).toEqual([
      { month: "2026-07", saving: 400_000, dividend: 0, total: 400_000, planned: 600_000 },
      { month: "2026-08", saving: 0, dividend: 0, total: 0, planned: 600_000 },
      { month: "2026-09", saving: 500_000, dividend: 30_000, total: 530_000, planned: 600_000 },
    ]);
  });

  it("totals dividends per asset for a year", () => {
    const rows = [
      { ...flow("2026-03-01", 10, "dividend"), asset_id: "voo" },
      { ...flow("2026-06-01", 15, "dividend"), asset_id: "voo" },
      { ...flow("2026-06-01", 30, "dividend"), asset_id: null },
      { ...flow("2025-06-01", 99, "dividend"), asset_id: "voo" },
      flow("2026-06-01", 500),
    ];
    expect(dividendsByAsset(rows, "2026")).toEqual([
      { assetId: null, amount: 30 },
      { assetId: "voo", amount: 25 },
    ]);
  });
});
