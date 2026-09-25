import { buildDriftReport } from "./drift";
import type { AllocationResult, Holding } from "./types";
import { validateCash, validateHoldings } from "./validation";

/** Absorbs floating-point noise when comparing money amounts. */
const EPSILON = 1e-9;

/** Upper bound on local-search swaps; each swap strictly improves the fit. */
const MAX_SWAPS = 10_000;

/**
 * Water-filling: the continuous buy-only allocation that minimises the
 * squared distance to the target values. Returns the amount of cash each
 * holding would receive if fractional purchases were unrestricted.
 *
 * Given deficits d_i (target value - current value), the optimum is
 * x_i = max(0, d_i - λ) with λ chosen so that Σ x_i = cash.
 */
function waterFill(deficits: readonly number[], cash: number): number[] {
  const positive = deficits.filter((d) => d > 0).sort((a, b) => b - a);
  const available = positive.reduce((sum, d) => sum + d, 0);

  if (available <= cash) {
    return deficits.map((d) => Math.max(0, d));
  }

  // Find λ such that Σ max(0, d_i - λ) = cash, taking the k largest deficits.
  let lambda = 0;
  let prefix = 0;
  for (let k = 0; k < positive.length; k++) {
    prefix += positive[k];
    const candidate = (prefix - cash) / (k + 1);
    const next = k + 1 < positive.length ? positive[k + 1] : 0;
    if (candidate >= next) {
      lambda = candidate;
      break;
    }
  }

  return deficits.map((d) => Math.max(0, d - lambda));
}

/** Rounds away floating-point noise from lot arithmetic (e.g. 3 * 0.1). */
function roundUnits(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

/**
 * Splits new cash across holdings (buy-only) so that the resulting
 * portfolio is as close as possible to the target weights.
 *
 * The target for every holding is `targetWeight * (currentTotal + cash)`.
 * Purchases respect each holding's lot size and never exceed `cash`.
 *
 * Algorithm:
 * 1. Water-fill the cash across underweight holdings (the exact continuous
 *    optimum) and buy the whole lots that fit into each share.
 * 2. Spend the remainder greedily, one lot at a time, always choosing the
 *    affordable lot that reduces the squared distance to target the most.
 *    A lot is only bought while it reduces that distance, so the function
 *    never overshoots a target by more than half a lot.
 * 3. Local search: when a helpful lot is unaffordable, give back lots bought
 *    in this allocation if that lowers the overall distance, then repeat
 *    step 2. Existing holdings are never sold.
 *
 * Ties are broken by input order, so results are deterministic.
 * The input is not mutated.
 *
 * @throws CapitalEngineError on invalid holdings or cash.
 */
export function allocateCash(holdings: readonly Holding[], cash: number): AllocationResult {
  validateHoldings(holdings);
  validateCash(cash);

  const lotCosts = holdings.map((h) => (h.lotSize ?? 1) * h.price);
  const values = holdings.map((h) => h.quantity * h.price);
  const finalTotal = values.reduce((sum, v) => sum + v, 0) + cash;
  const deficits = holdings.map((h, i) => h.targetWeight * finalTotal - values[i]);
  const lots = holdings.map(() => 0);

  let remaining = cash;

  // Phase 1: bulk purchase along the continuous optimum.
  const shares = waterFill(deficits, cash);
  shares.forEach((share, i) => {
    const count = Math.floor(share / lotCosts[i] + EPSILON);
    if (count > 0) {
      lots[i] = count;
      deficits[i] -= count * lotCosts[i];
      remaining -= count * lotCosts[i];
    }
  });

  // Guard against rounding pushing phase 1 over budget.
  for (let i = 0; i < lots.length && remaining < -EPSILON; i++) {
    while (lots[i] > 0 && remaining < -EPSILON) {
      lots[i] -= 1;
      deficits[i] += lotCosts[i];
      remaining += lotCosts[i];
    }
  }

  // Squared-distance comparisons scale with the portfolio size, so the
  // tolerance does too; this keeps float noise from causing endless swaps.
  const tolerance = 1e-12 * Math.max(1, finalTotal * finalTotal);

  const buyLot = (i: number, count: number) => {
    lots[i] += count;
    deficits[i] -= count * lotCosts[i];
    remaining -= count * lotCosts[i];
  };

  // Phase 2: greedy lot-by-lot refinement.
  const greedyFill = () => {
    for (;;) {
      let best = -1;
      let bestGain = tolerance;
      for (let i = 0; i < holdings.length; i++) {
        const lot = lotCosts[i];
        if (lot > remaining + EPSILON) continue;
        // Reduction of (value - target)^2 when buying one lot: d² - (d - p)².
        const gain = lot * (2 * deficits[i] - lot);
        if (gain > bestGain) {
          bestGain = gain;
          best = i;
        }
      }
      if (best === -1) return;
      buyLot(best, 1);
    }
  };

  // Phase 3: local search. A lot that would help but is unaffordable may be
  // funded by giving back lots bought earlier in this allocation (never
  // existing holdings). Apply the best improving swap, refill, repeat.
  const bestSwap = () => {
    let best: { buy: number; give: number; count: number } | null = null;
    let bestDelta = -tolerance;
    for (let i = 0; i < holdings.length; i++) {
      const lot = lotCosts[i];
      const shortfall = lot - remaining;
      if (shortfall <= EPSILON) continue;
      const buyDelta = lot * lot - 2 * deficits[i] * lot;
      if (buyDelta >= 0) continue;
      for (let j = 0; j < holdings.length; j++) {
        if (j === i || lots[j] === 0) continue;
        const count = Math.ceil(shortfall / lotCosts[j] - EPSILON);
        if (count > lots[j]) continue;
        const freed = count * lotCosts[j];
        const giveDelta = 2 * freed * deficits[j] + freed * freed;
        const delta = buyDelta + giveDelta;
        if (delta < bestDelta) {
          bestDelta = delta;
          best = { buy: i, give: j, count };
        }
      }
    }
    return best;
  };

  greedyFill();
  for (let iteration = 0; iteration < MAX_SWAPS; iteration++) {
    const swap = bestSwap();
    if (!swap) break;
    buyLot(swap.give, -swap.count);
    buyLot(swap.buy, 1);
    greedyFill();
  }

  const orders = holdings.map((h, i) => {
    const quantity = roundUnits(lots[i] * (h.lotSize ?? 1));
    return { id: h.id, quantity, cost: quantity * h.price };
  });
  const totalSpent = orders.reduce((sum, o) => sum + o.cost, 0);

  const after = buildDriftReport(
    holdings.map((h, i) => ({ ...h, quantity: roundUnits(h.quantity + orders[i].quantity) })),
  );

  return {
    orders,
    totalSpent,
    leftoverCash: Math.max(0, cash - totalSpent),
    after,
  };
}
