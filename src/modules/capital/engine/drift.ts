import type { DriftReport, Holding } from "./types";
import { validateHoldings } from "./validation";

/** Builds a drift report without validating input (internal use). */
export function buildDriftReport(holdings: readonly Holding[]): DriftReport {
  const values = holdings.map((h) => h.quantity * h.price);
  const totalValue = values.reduce((sum, v) => sum + v, 0);

  let maxAbsDrift = 0;
  const items = holdings.map((h, i) => {
    const marketValue = values[i];
    const currentWeight = totalValue > 0 ? marketValue / totalValue : 0;
    const drift = currentWeight - h.targetWeight;
    const targetValue = h.targetWeight * totalValue;
    maxAbsDrift = Math.max(maxAbsDrift, Math.abs(drift));

    return {
      id: h.id,
      marketValue,
      currentWeight,
      targetWeight: h.targetWeight,
      drift,
      relativeDrift: h.targetWeight > 0 ? drift / h.targetWeight : null,
      targetValue,
      valueGap: targetValue - marketValue,
    };
  });

  return { totalValue, items, maxAbsDrift };
}

/**
 * Computes how far each holding's current weight has drifted from its
 * target weight (괴리율).
 *
 * An empty portfolio (total value 0) reports every current weight as 0, so
 * each holding's drift equals minus its target weight.
 *
 * @throws CapitalEngineError on invalid holdings.
 */
export function calculateDrift(holdings: readonly Holding[]): DriftReport {
  validateHoldings(holdings);
  return buildDriftReport(holdings);
}

/** True when any holding's absolute drift exceeds `threshold` (a fraction). */
export function needsRebalance(report: DriftReport, threshold: number): boolean {
  return report.maxAbsDrift > threshold;
}
