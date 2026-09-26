import { describe, expect, it } from "vitest";

import { summarizeCashFlows, type CashFlowRow } from "../cash-flow";

const flow = (date: string, amount: number, flow_type: CashFlowRow["flow_type"] = "saving"): CashFlowRow => ({
  id: `${date}-${amount}`,
  user_id: "u",
  amount,
  flow_type,
  date,
  note: null,
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
