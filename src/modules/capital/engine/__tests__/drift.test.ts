import { describe, expect, it } from "vitest";

import { calculateDrift, CapitalEngineError, needsRebalance, type Holding } from "..";

const h = (
  id: string,
  targetWeight: number,
  quantity: number,
  price: number,
  extra: Partial<Holding> = {},
): Holding => ({ id, targetWeight, quantity, price, ...extra });

describe("calculateDrift", () => {
  it("reports zero drift for a portfolio exactly at target", () => {
    const report = calculateDrift([h("stock", 0.6, 60, 1), h("bond", 0.4, 40, 1)]);

    expect(report.totalValue).toBe(100);
    expect(report.maxAbsDrift).toBeCloseTo(0, 12);
    for (const item of report.items) {
      expect(item.drift).toBeCloseTo(0, 12);
      expect(item.valueGap).toBeCloseTo(0, 12);
    }
  });

  it("reports positive drift for overweight and negative for underweight holdings", () => {
    const report = calculateDrift([h("stock", 0.5, 70, 1), h("bond", 0.5, 30, 1)]);
    const [stock, bond] = report.items;

    expect(stock.currentWeight).toBeCloseTo(0.7);
    expect(stock.drift).toBeCloseTo(0.2);
    expect(stock.valueGap).toBeCloseTo(-20);
    expect(bond.drift).toBeCloseTo(-0.2);
    expect(bond.valueGap).toBeCloseTo(20);
    expect(report.maxAbsDrift).toBeCloseTo(0.2);
  });

  it("uses quantity * price as market value", () => {
    const report = calculateDrift([h("a", 0.5, 3, 250), h("b", 0.5, 10, 25)]);

    expect(report.items[0].marketValue).toBe(750);
    expect(report.items[1].marketValue).toBe(250);
    expect(report.totalValue).toBe(1000);
    expect(report.items[0].currentWeight).toBeCloseTo(0.75);
  });

  it("drifts always sum to zero for a non-empty portfolio", () => {
    const report = calculateDrift([
      h("a", 0.25, 13, 7.3),
      h("b", 0.35, 2, 101.1),
      h("c", 0.4, 55, 3.9),
    ]);
    const sum = report.items.reduce((s, i) => s + i.drift, 0);

    expect(sum).toBeCloseTo(0, 12);
  });

  it("computes relative drift as drift / target", () => {
    const report = calculateDrift([h("a", 0.2, 30, 1), h("b", 0.8, 70, 1)]);

    expect(report.items[0].relativeDrift).toBeCloseTo(0.5); // 30% vs 20% → +50%
    expect(report.items[1].relativeDrift).toBeCloseTo(-0.125); // 70% vs 80%
  });

  it("returns null relative drift for a zero-target holding", () => {
    const report = calculateDrift([h("legacy", 0, 10, 1), h("core", 1, 90, 1)]);

    expect(report.items[0].relativeDrift).toBeNull();
    expect(report.items[0].drift).toBeCloseTo(0.1);
    expect(report.items[0].valueGap).toBeCloseTo(-10);
  });

  it("treats an all-zero portfolio as 0% current weight everywhere", () => {
    const report = calculateDrift([h("a", 0.7, 0, 10), h("b", 0.3, 0, 5)]);

    expect(report.totalValue).toBe(0);
    expect(report.items.map((i) => i.currentWeight)).toEqual([0, 0]);
    expect(report.items[0].drift).toBeCloseTo(-0.7);
    expect(report.items[1].drift).toBeCloseTo(-0.3);
    expect(report.maxAbsDrift).toBeCloseTo(0.7);
    expect(report.items.every((i) => Number.isFinite(i.drift))).toBe(true);
  });

  it("handles a single holding at 100% target", () => {
    const report = calculateDrift([h("only", 1, 5, 20)]);

    expect(report.items[0].currentWeight).toBe(1);
    expect(report.items[0].drift).toBe(0);
  });

  it("supports fractional quantities", () => {
    const report = calculateDrift([h("btc", 0.5, 0.25, 400), h("cash", 0.5, 100, 1)]);

    expect(report.items[0].marketValue).toBeCloseTo(100);
    expect(report.items[0].drift).toBeCloseTo(0);
  });

  it("accepts target weights that sum to 1 within floating-point tolerance", () => {
    const holdings = [h("a", 0.1, 1, 1), h("b", 0.2, 1, 1), h("c", 0.7, 1, 1)];
    // 0.1 + 0.2 + 0.7 === 0.9999999999999999 in IEEE-754
    expect(() => calculateDrift(holdings)).not.toThrow();
  });

  it("does not mutate the input holdings", () => {
    const holdings = [h("a", 0.5, 10, 1), h("b", 0.5, 20, 1)];
    const snapshot = structuredClone(holdings);

    calculateDrift(holdings);

    expect(holdings).toEqual(snapshot);
  });

  describe("validation", () => {
    it("rejects an empty portfolio", () => {
      expect(() => calculateDrift([])).toThrow(CapitalEngineError);
    });

    it("rejects target weights that do not sum to 1", () => {
      expect(() => calculateDrift([h("a", 0.5, 1, 1), h("b", 0.4, 1, 1)])).toThrow(
        /sum to 1/,
      );
    });

    it("rejects negative target weights", () => {
      expect(() => calculateDrift([h("a", -0.2, 1, 1), h("b", 1.2, 1, 1)])).toThrow(
        CapitalEngineError,
      );
    });

    it("rejects negative quantities", () => {
      expect(() => calculateDrift([h("a", 1, -1, 1)])).toThrow(/quantity/);
    });

    it("rejects zero or negative prices", () => {
      expect(() => calculateDrift([h("a", 1, 1, 0)])).toThrow(/price/);
      expect(() => calculateDrift([h("a", 1, 1, -5)])).toThrow(/price/);
    });

    it("rejects NaN and Infinity values", () => {
      expect(() => calculateDrift([h("a", 1, Number.NaN, 1)])).toThrow(/finite/);
      expect(() => calculateDrift([h("a", 1, 1, Number.POSITIVE_INFINITY)])).toThrow(/finite/);
      expect(() => calculateDrift([h("a", Number.NaN, 1, 1)])).toThrow(/finite/);
    });

    it("rejects duplicate ids", () => {
      expect(() => calculateDrift([h("a", 0.5, 1, 1), h("a", 0.5, 1, 1)])).toThrow(
        /Duplicate/,
      );
    });

    it("rejects a non-positive lot size", () => {
      expect(() => calculateDrift([h("a", 1, 1, 1, { lotSize: 0 })])).toThrow(/lotSize/);
    });
  });
});

describe("needsRebalance", () => {
  const report = calculateDrift([h("stock", 0.5, 55, 1), h("bond", 0.5, 45, 1)]);

  it("is true when max drift exceeds the threshold", () => {
    expect(needsRebalance(report, 0.03)).toBe(true);
  });

  it("is false when max drift is within the threshold", () => {
    expect(needsRebalance(report, 0.1)).toBe(false);
  });
});
