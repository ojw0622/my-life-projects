import { describe, expect, it, vi } from "vitest";

vi.mock("../server", () => ({ createClient: vi.fn() }));

import { isMissingTableError, REQUIRED_TABLES } from "../schema-check";

describe("isMissingTableError", () => {
  it("recognises PostgREST and Postgres missing-table codes", () => {
    expect(isMissingTableError({ code: "PGRST205" })).toBe(true);
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
  });

  it("ignores other errors and success", () => {
    expect(isMissingTableError({ code: "42501" })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError({})).toBe(false);
  });

  it("checks every table the app reads", () => {
    expect(REQUIRED_TABLES).toEqual(["portfolios", "cash_flows", "capital_settings", "cash_flow_plans", "portfolio_snapshots", "essays", "principles", "workouts", "runs"]);
  });
});
