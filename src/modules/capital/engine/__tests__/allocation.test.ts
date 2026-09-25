import { describe, expect, it } from "vitest";

import { allocateCash, calculateDrift, CapitalEngineError, type Holding } from "..";

const h = (
  id: string,
  targetWeight: number,
  quantity: number,
  price: number,
  extra: Partial<Holding> = {},
): Holding => ({ id, targetWeight, quantity, price, ...extra });

const qty = (result: ReturnType<typeof allocateCash>, id: string) =>
  result.orders.find((o) => o.id === id)?.quantity;

describe("allocateCash", () => {
  it("leaves cash uninvested when a lot would not move the fit closer", () => {
    // Targets 5 / 5; any 10-unit lot swaps a 5 shortfall for a 5 overshoot.
    const result = allocateCash([h("a", 0.5, 0, 10), h("b", 0.5, 0, 10)], 10);

    expect(result.totalSpent).toBe(0);
    expect(result.leftoverCash).toBe(10);
  });

  it("builds a portfolio from scratch at exact target weights", () => {
    const result = allocateCash([h("stock", 0.6, 0, 1), h("bond", 0.4, 0, 1)], 100);

    expect(qty(result, "stock")).toBe(60);
    expect(qty(result, "bond")).toBe(40);
    expect(result.totalSpent).toBe(100);
    expect(result.leftoverCash).toBe(0);
    expect(result.after.maxAbsDrift).toBeCloseTo(0, 12);
  });

  it("buys nothing when cash is 0", () => {
    const result = allocateCash([h("a", 0.5, 10, 1), h("b", 0.5, 0, 1)], 0);

    expect(result.orders.every((o) => o.quantity === 0)).toBe(true);
    expect(result.totalSpent).toBe(0);
    expect(result.leftoverCash).toBe(0);
  });

  it("keeps all cash when it cannot afford a single lot", () => {
    const result = allocateCash([h("a", 0.5, 1, 1000), h("b", 0.5, 1, 500)], 499);

    expect(result.totalSpent).toBe(0);
    expect(result.leftoverCash).toBe(499);
  });

  it("directs all cash to the underweight holding", () => {
    const result = allocateCash([h("stock", 0.5, 80, 1), h("bond", 0.5, 20, 1)], 30);

    expect(qty(result, "stock")).toBe(0);
    expect(qty(result, "bond")).toBe(30);
  });

  it("closes the gap exactly when cash equals the deficit", () => {
    const result = allocateCash([h("stock", 0.5, 80, 1), h("bond", 0.5, 20, 1)], 60);

    expect(qty(result, "bond")).toBe(60);
    expect(result.after.maxAbsDrift).toBeCloseTo(0, 12);
  });

  it("splits surplus cash by target weight once underweights are filled", () => {
    // Final total 200 → targets stock 100, bond 100. Bond needs 80, stock 20.
    const result = allocateCash([h("stock", 0.5, 80, 1), h("bond", 0.5, 20, 1)], 100);

    expect(qty(result, "stock")).toBe(20);
    expect(qty(result, "bond")).toBe(80);
    expect(result.after.maxAbsDrift).toBeCloseTo(0, 12);
  });

  it("never sells or buys an overweight holding", () => {
    const result = allocateCash(
      [h("hot", 0.2, 100, 1), h("a", 0.4, 10, 1), h("b", 0.4, 10, 1)],
      50,
    );

    expect(qty(result, "hot")).toBe(0);
    expect(result.orders.every((o) => o.quantity >= 0)).toBe(true);
  });

  it("never buys a zero-target holding", () => {
    const result = allocateCash([h("legacy", 0, 0, 1), h("core", 1, 0, 1)], 100);

    expect(qty(result, "legacy")).toBe(0);
    expect(qty(result, "core")).toBe(100);
  });

  it("respects whole-share lots and never exceeds the available cash", () => {
    const result = allocateCash(
      [h("a", 0.34, 0, 37), h("b", 0.33, 0, 113), h("c", 0.33, 0, 59)],
      1000,
    );

    expect(result.totalSpent).toBeLessThanOrEqual(1000);
    for (const order of result.orders) {
      expect(Number.isInteger(order.quantity)).toBe(true);
    }
    expect(result.totalSpent + result.leftoverCash).toBeCloseTo(1000, 9);
  });

  it("uses leftover cash on a cheaper holding when the preferred one is unaffordable", () => {
    // Expensive asset is most underweight but cash cannot buy a single share.
    const result = allocateCash([h("pricey", 0.5, 0, 5000), h("cheap", 0.5, 0, 10)], 1000);

    expect(qty(result, "pricey")).toBe(0);
    // Buying cheap still reduces distance to its own target (500 of 1000).
    expect(qty(result, "cheap")).toBe(50);
    expect(result.leftoverCash).toBe(500);
  });

  it("gives back cheap lots to fund a coarse lot when that fits targets better", () => {
    // Targets are 50 / 50. a=1, b=50 leaves a 20 short (distance² 400);
    // a=2, b=40 is 10 off on both sides (distance² 200) and spends all cash.
    const result = allocateCash([h("a", 0.5, 0, 30), h("b", 0.5, 0, 1)], 100);
    const a = result.after.items[0];

    expect(qty(result, "a")).toBe(2);
    expect(qty(result, "b")).toBe(40);
    expect(result.leftoverCash).toBe(0);
    expect(Math.abs(a.marketValue - 50)).toBeLessThanOrEqual(30 / 2);
  });

  it("never sells pre-existing units to fund a swap", () => {
    // b is already at target from existing units; only new cash may move.
    const result = allocateCash([h("a", 0.5, 0, 60), h("b", 0.5, 50, 1)], 50);

    expect(result.orders.every((o) => o.quantity >= 0)).toBe(true);
    expect(result.totalSpent).toBeLessThanOrEqual(50);
  });

  it("supports fractional lot sizes", () => {
    const result = allocateCash(
      [h("btc", 0.5, 0, 50000, { lotSize: 0.0001 }), h("cash", 0.5, 0, 1)],
      1000,
    );

    expect(qty(result, "btc")).toBeCloseTo(0.01, 10);
    expect(qty(result, "cash")).toBe(500);
    expect(result.after.maxAbsDrift).toBeCloseTo(0, 9);
  });

  it("returns clean quantities free of floating-point noise", () => {
    const result = allocateCash([h("a", 1, 0, 1, { lotSize: 0.1 })], 0.3);

    expect(qty(result, "a")).toBe(0.3);
  });

  it("reduces the maximum drift compared with the starting portfolio", () => {
    const holdings = [
      h("kr", 0.3, 120, 71.2),
      h("us", 0.4, 15, 412.5),
      h("bond", 0.2, 40, 98.3),
      h("gold", 0.1, 3, 250.7),
    ];
    const before = calculateDrift(holdings);
    const result = allocateCash(holdings, 5000);

    expect(result.after.maxAbsDrift).toBeLessThan(before.maxAbsDrift);
  });

  it("returns orders in input order with one entry per holding", () => {
    const holdings = [h("c", 0.2, 0, 1), h("a", 0.3, 0, 1), h("b", 0.5, 0, 1)];
    const result = allocateCash(holdings, 10);

    expect(result.orders.map((o) => o.id)).toEqual(["c", "a", "b"]);
  });

  it("reports cost as quantity * price and totalSpent as their sum", () => {
    const result = allocateCash([h("a", 0.5, 0, 12.5), h("b", 0.5, 0, 7)], 200);

    for (const order of result.orders) {
      const price = order.id === "a" ? 12.5 : 7;
      expect(order.cost).toBeCloseTo(order.quantity * price, 9);
    }
    expect(result.totalSpent).toBeCloseTo(
      result.orders.reduce((s, o) => s + o.cost, 0),
      9,
    );
  });

  it("is deterministic: equal candidates are resolved by input order", () => {
    // Either lot helps equally; only one is affordable.
    const holdings = [h("first", 0.5, 0, 8), h("second", 0.5, 0, 8)];
    const result = allocateCash(holdings, 10);

    expect(qty(result, "first")).toBe(1);
    expect(qty(result, "second")).toBe(0);
    expect(allocateCash(holdings, 10)).toEqual(result);
  });

  it("does not mutate the input holdings", () => {
    const holdings = [h("a", 0.5, 10, 3), h("b", 0.5, 2, 7)];
    const snapshot = structuredClone(holdings);

    allocateCash(holdings, 123);

    expect(holdings).toEqual(snapshot);
  });

  it("handles very large cash amounts efficiently", () => {
    const start = performance.now();
    const result = allocateCash(
      [h("a", 0.25, 0, 1), h("b", 0.25, 0, 3), h("c", 0.5, 0, 7)],
      1_000_000_000,
    );
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(result.totalSpent).toBeLessThanOrEqual(1_000_000_000);
    expect(result.leftoverCash).toBeLessThan(7);
    expect(result.after.maxAbsDrift).toBeLessThan(1e-6);
  });

  it("spends only within the budget when every holding is overweight-free but cash is tight", () => {
    // Cash smaller than total deficit: water-filling must cap at cash.
    const result = allocateCash(
      [h("a", 0.4, 0, 1), h("b", 0.3, 0, 1), h("c", 0.3, 100, 1)],
      10,
    );

    expect(result.totalSpent).toBeLessThanOrEqual(10);
    expect(qty(result, "c")).toBe(0);
    // a has the larger deficit and should receive more.
    expect(qty(result, "a")!).toBeGreaterThan(qty(result, "b")!);
  });

  describe("validation", () => {
    const valid = [h("a", 0.5, 1, 1), h("b", 0.5, 1, 1)];

    it("rejects negative cash", () => {
      expect(() => allocateCash(valid, -1)).toThrow(CapitalEngineError);
    });

    it("rejects non-finite cash", () => {
      expect(() => allocateCash(valid, Number.NaN)).toThrow(/finite/);
      expect(() => allocateCash(valid, Number.POSITIVE_INFINITY)).toThrow(/finite/);
    });

    it("rejects invalid holdings", () => {
      expect(() => allocateCash([h("a", 0.9, 1, 1)], 100)).toThrow(/sum to 1/);
      expect(() => allocateCash([], 100)).toThrow(CapitalEngineError);
    });
  });
});
