import { describe, expect, it } from "vitest";

import { allocateCash, type Holding } from "..";

/** Deterministic LCG so the property test is reproducible. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function randomCase(random: () => number) {
  const n = 2 + Math.floor(random() * 2);
  const raw = Array.from({ length: n }, () => random() + 0.05);
  const sum = raw.reduce((a, b) => a + b, 0);
  const holdings: Holding[] = raw.map((w, i) => ({
    id: `h${i}`,
    targetWeight: w / sum,
    quantity: Math.floor(random() * 5),
    price: 1 + Math.floor(random() * 40),
  }));
  const cash = Math.floor(random() * 150);
  return { holdings, cash };
}

/** Squared distance of holding values from their targets over (value + cash). */
function distance(holdings: Holding[], cash: number, buys: number[]) {
  const total = holdings.reduce((s, h) => s + h.quantity * h.price, 0) + cash;
  return holdings.reduce(
    (s, h, i) => s + (h.targetWeight * total - (h.quantity + buys[i]) * h.price) ** 2,
    0,
  );
}

/** Exhaustive search over every affordable whole-share combination. */
function bruteForceBest(holdings: Holding[], cash: number) {
  let best = Number.POSITIVE_INFINITY;
  const visit = (i: number, buys: number[], left: number) => {
    if (i === holdings.length) {
      best = Math.min(best, distance(holdings, cash, buys));
      return;
    }
    for (let k = 0; k * holdings[i].price <= left; k++) {
      visit(i + 1, [...buys, k], left - k * holdings[i].price);
    }
  };
  visit(0, [], cash);
  return best;
}

describe("allocateCash (randomised properties)", () => {
  const random = createRandom(42);
  const cases = Array.from({ length: 500 }, () => randomCase(random));

  it("never overspends, never sells, and never moves away from target", () => {
    for (const { holdings, cash } of cases) {
      const result = allocateCash(holdings, cash);
      const buys = result.orders.map((o) => o.quantity);

      expect(result.totalSpent).toBeLessThanOrEqual(cash + 1e-9);
      expect(buys.every((q) => q >= 0 && Number.isInteger(q))).toBe(true);
      expect(distance(holdings, cash, buys)).toBeLessThanOrEqual(
        distance(holdings, cash, buys.map(() => 0)) + 1e-9,
      );
    }
  });

  it("matches the exhaustive optimum in at least 99% of small cases", () => {
    let optimal = 0;
    for (const { holdings, cash } of cases) {
      const buys = allocateCash(holdings, cash).orders.map((o) => o.quantity);
      if (distance(holdings, cash, buys) <= bruteForceBest(holdings, cash) + 1e-6) {
        optimal++;
      }
    }

    expect(optimal / cases.length).toBeGreaterThanOrEqual(0.99);
  });
});
