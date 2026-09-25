import { CapitalEngineError } from "./errors";
import type { Holding } from "./types";

/** Tolerance for the target weights summing to 1. */
export const WEIGHT_SUM_TOLERANCE = 1e-6;

function assertFinite(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CapitalEngineError(`${label} must be a finite number (got ${String(value)})`);
  }
}

export function validateHoldings(holdings: readonly Holding[]): void {
  if (holdings.length === 0) {
    throw new CapitalEngineError("Portfolio must contain at least one holding");
  }

  const seen = new Set<string>();
  let weightSum = 0;

  for (const h of holdings) {
    if (seen.has(h.id)) {
      throw new CapitalEngineError(`Duplicate holding id "${h.id}"`);
    }
    seen.add(h.id);

    assertFinite(h.targetWeight, `targetWeight of "${h.id}"`);
    assertFinite(h.quantity, `quantity of "${h.id}"`);
    assertFinite(h.price, `price of "${h.id}"`);

    if (h.targetWeight < 0 || h.targetWeight > 1) {
      throw new CapitalEngineError(`targetWeight of "${h.id}" must be within [0, 1]`);
    }
    if (h.quantity < 0) {
      throw new CapitalEngineError(`quantity of "${h.id}" must not be negative`);
    }
    if (h.price <= 0) {
      throw new CapitalEngineError(`price of "${h.id}" must be positive`);
    }
    if (h.lotSize !== undefined) {
      assertFinite(h.lotSize, `lotSize of "${h.id}"`);
      if (h.lotSize <= 0) {
        throw new CapitalEngineError(`lotSize of "${h.id}" must be positive`);
      }
    }

    weightSum += h.targetWeight;
  }

  if (Math.abs(weightSum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new CapitalEngineError(`Target weights must sum to 1 (got ${weightSum})`);
  }
}

export function validateCash(cash: number): void {
  assertFinite(cash, "cash");
  if (cash < 0) {
    throw new CapitalEngineError("cash must not be negative");
  }
}
