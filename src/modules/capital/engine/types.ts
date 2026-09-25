/** A single position in a portfolio, as seen by the capital engine. */
export interface Holding {
  /** Unique identifier within the portfolio. */
  id: string;
  /** 자산군 (asset class), informational only. */
  assetClass?: string;
  /** Target weight as a fraction in [0, 1]. Targets must sum to 1. */
  targetWeight: number;
  /** Units currently held (>= 0). */
  quantity: number;
  /** Current price per unit (> 0). */
  price: number;
  /**
   * Smallest purchasable increment in units (> 0). Defaults to 1 (whole
   * shares). Use e.g. 0.0001 for fractional shares or crypto.
   */
  lotSize?: number;
}

export interface DriftItem {
  id: string;
  marketValue: number;
  /** Current weight as a fraction of total market value. */
  currentWeight: number;
  targetWeight: number;
  /** currentWeight - targetWeight. Positive = overweight. */
  drift: number;
  /** drift / targetWeight, or null when the target weight is 0. */
  relativeDrift: number | null;
  /** Market value this holding would have at exactly its target weight. */
  targetValue: number;
  /** targetValue - marketValue. Positive = amount to buy to reach target. */
  valueGap: number;
}

export interface DriftReport {
  totalValue: number;
  items: DriftItem[];
  /** Largest |drift| across all holdings. */
  maxAbsDrift: number;
}

export interface BuyOrder {
  id: string;
  /** Units to buy (a multiple of the holding's lot size). */
  quantity: number;
  /** quantity * price. */
  cost: number;
}

export interface AllocationResult {
  /** One entry per input holding, in input order (quantity may be 0). */
  orders: BuyOrder[];
  totalSpent: number;
  /** Cash that could not be deployed without moving away from targets. */
  leftoverCash: number;
  /** Drift of the holdings after the orders are filled. */
  after: DriftReport;
}
