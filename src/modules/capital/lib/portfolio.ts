import type { Currency, Tables } from "@/lib/supabase/database.types";

import { allocateCash, CapitalEngineError, type Holding } from "../engine";
import { buildDriftReport } from "../engine/drift";
import { WEIGHT_SUM_TOLERANCE } from "../engine/validation";
import { lotSizeFor, quantityUnit } from "./constants";
import { dailyChange } from "./quotes";

export type PortfolioRow = Tables<"portfolios">;

export function toKrw(amount: number, currency: Currency, usdKrwRate: number): number {
  return currency === "USD" ? amount * usdKrwRate : amount;
}

export interface PortfolioViewItem {
  row: PortfolioRow;
  /** Current price converted to KRW. */
  priceKrw: number;
  valueKrw: number;
  currentWeight: number;
  targetWeight: number;
  /** currentWeight - targetWeight. */
  drift: number;
  /** |drift| exceeds the asset's tolerance band. */
  outOfBand: boolean;
  /** Unrealised return vs average buy price, or null without a buy price. */
  returnRate: number | null;
  /** Cost basis (qty × average buy price) in KRW, or 0 without a buy price. */
  costKrw: number;
  /** valueKrw − costKrw, or null without a buy price. */
  pnlKrw: number | null;
  /** Change since the previous close as a fraction, or null when unknown. */
  dayChange: number | null;
  /** Value change since the previous close in KRW (0 when unknown). */
  dayChangeKrw: number;
}

export interface PortfolioView {
  items: PortfolioViewItem[];
  totalValueKrw: number;
  targetSum: number;
  /** Target ratios sum to 100% (required by the allocation engine). */
  targetsValid: boolean;
  outOfBandCount: number;
  /** Cost basis of the assets that have a buy price. */
  totalCostKrw: number;
  /** Unrealised P/L over the assets that have a buy price. */
  totalPnlKrw: number;
  totalPnlRate: number | null;
  /** Value change since the previous close across all assets. */
  dayChangeKrw: number;
  dayChangeRate: number | null;
}

/**
 * Values every asset in KRW and compares current with target weights.
 * Works on incomplete portfolios too (targets not summing to 100%, missing
 * prices), which is why it does not go through the validating engine API.
 */
export function buildPortfolioView(rows: readonly PortfolioRow[], usdKrwRate: number): PortfolioView {
  const priced = rows.map((row) => ({
    row,
    priceKrw: toKrw(Number(row.current_price), row.currency, usdKrwRate),
  }));
  const report = buildDriftReport(
    priced.map(({ row, priceKrw }) => ({
      id: row.id,
      targetWeight: Number(row.target_ratio),
      quantity: Number(row.current_qty),
      price: priceKrw,
    })),
  );

  const items = priced.map(({ row, priceKrw }, i) => {
    const drift = report.items[i];
    const avgBuy = Number(row.avg_buy_price);
    const qty = Number(row.current_qty);
    const price = Number(row.current_price);
    const costKrw = avgBuy > 0 ? toKrw(qty * avgBuy, row.currency, usdKrwRate) : 0;
    const dayChange = dailyChange(price, row.prev_close === null ? null : Number(row.prev_close));
    const dayChangeKrw =
      dayChange === null ? 0 : toKrw(qty * (price - Number(row.prev_close)), row.currency, usdKrwRate);
    return {
      row,
      priceKrw,
      valueKrw: drift.marketValue,
      currentWeight: drift.currentWeight,
      targetWeight: drift.targetWeight,
      drift: drift.drift,
      outOfBand: report.totalValue > 0 && Math.abs(drift.drift) > Number(row.tolerance_band) + 1e-12,
      returnRate: avgBuy > 0 ? price / avgBuy - 1 : null,
      costKrw,
      pnlKrw: avgBuy > 0 ? drift.marketValue - costKrw : null,
      dayChange,
      dayChangeKrw,
    };
  });

  const targetSum = rows.reduce((sum, r) => sum + Number(r.target_ratio), 0);
  const withCost = items.filter((i) => i.pnlKrw !== null);
  const totalCostKrw = withCost.reduce((s, i) => s + i.costKrw, 0);
  const totalPnlKrw = withCost.reduce((s, i) => s + (i.pnlKrw ?? 0), 0);
  const dayChangeKrw = items.reduce((s, i) => s + i.dayChangeKrw, 0);
  const previousTotal = report.totalValue - dayChangeKrw;

  return {
    items,
    totalValueKrw: report.totalValue,
    targetSum,
    targetsValid: rows.length > 0 && Math.abs(targetSum - 1) <= WEIGHT_SUM_TOLERANCE,
    outOfBandCount: items.filter((i) => i.outOfBand).length,
    totalCostKrw,
    totalPnlKrw,
    totalPnlRate: totalCostKrw > 0 ? totalPnlKrw / totalCostKrw : null,
    dayChangeKrw,
    dayChangeRate: items.some((i) => i.dayChange !== null) && previousTotal > 0 ? dayChangeKrw / previousTotal : null,
  };
}

export interface PlanRow {
  id: string;
  assetName: string;
  ticker: string | null;
  currency: Currency;
  quantity: number;
  /** "주", "개", "원" or "달러". */
  unit: string;
  /** Price in the asset's own currency. */
  unitPrice: number;
  costKrw: number;
  weightBefore: number;
  weightAfter: number;
  targetWeight: number;
}

export type AllocationPlan =
  | { ok: true; rows: PlanRow[]; totalSpentKrw: number; leftoverKrw: number }
  | { ok: false; error: string };

/**
 * Runs the capital engine for the rebalancing calculator and shapes the
 * result for display. Never throws: problems come back as `{ ok: false }`.
 */
export function planAllocation(
  rows: readonly PortfolioRow[],
  cashKrw: number,
  usdKrwRate: number,
): AllocationPlan {
  if (rows.length === 0) return { ok: false, error: "먼저 자산을 등록하세요." };
  if (!Number.isFinite(cashKrw) || cashKrw <= 0) {
    return { ok: false, error: "투입할 현금을 0보다 크게 입력하세요." };
  }
  if (!Number.isFinite(usdKrwRate) || usdKrwRate <= 0) {
    return { ok: false, error: "USD/KRW 환율을 확인하세요." };
  }

  const unpriced = rows.filter((r) => !(Number(r.current_price) > 0));
  if (unpriced.length > 0) {
    return {
      ok: false,
      error: `현재가가 없는 자산이 있습니다: ${unpriced.map((r) => r.asset_name).join(", ")}`,
    };
  }

  const holdings: Holding[] = rows.map((r) => ({
    id: r.id,
    assetClass: r.category,
    targetWeight: Number(r.target_ratio),
    quantity: Number(r.current_qty),
    price: toKrw(Number(r.current_price), r.currency, usdKrwRate),
    lotSize: lotSizeFor(r.category, r.currency),
  }));

  let result;
  try {
    result = allocateCash(holdings, cashKrw);
  } catch (error) {
    if (error instanceof CapitalEngineError && /sum to 1/.test(error.message)) {
      const sum = rows.reduce((s, r) => s + Number(r.target_ratio), 0);
      return {
        ok: false,
        error: `목표 비중 합계가 100%가 아닙니다 (현재 ${(sum * 100).toFixed(2)}%).`,
      };
    }
    if (error instanceof CapitalEngineError) return { ok: false, error: error.message };
    throw error;
  }

  const before = buildDriftReport(holdings);

  return {
    ok: true,
    rows: rows.map((r, i) => ({
      id: r.id,
      assetName: r.asset_name,
      ticker: r.ticker,
      currency: r.currency,
      quantity: result.orders[i].quantity,
      unit: quantityUnit(r.category, r.currency),
      unitPrice: Number(r.current_price),
      costKrw: result.orders[i].cost,
      weightBefore: before.items[i].currentWeight,
      weightAfter: result.after.items[i].currentWeight,
      targetWeight: holdings[i].targetWeight,
    })),
    totalSpentKrw: result.totalSpent,
    leftoverKrw: result.leftoverCash,
  };
}
