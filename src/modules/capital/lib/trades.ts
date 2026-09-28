import type { Tables, TradeSide } from "@/lib/supabase/database.types";

export type TradeRow = Tables<"trades">;

export interface Position {
  quantity: number;
  avgPrice: number;
}

export interface TradeInput {
  side: TradeSide;
  quantity: number;
  price: number;
  fee?: number;
}

export type TradeResult =
  | { ok: true; position: Position; realizedPnl: number | null }
  | { ok: false; error: string };

/** Rounds away float noise at the column's precision. */
const round = (value: number, digits: number) => Number(value.toFixed(digits));

/**
 * Applies a buy or sell to a position. A buy moves the average price to the
 * weighted average (fees count as cost); a sell keeps the average and
 * realises (price − average) × quantity − fee.
 */
export function applyTrade(position: Position, trade: TradeInput): TradeResult {
  const fee = trade.fee ?? 0;
  if (!(trade.quantity > 0)) return { ok: false, error: "수량은 0보다 커야 합니다." };
  if (trade.price < 0 || fee < 0) return { ok: false, error: "가격과 수수료는 0 이상이어야 합니다." };

  if (trade.side === "buy") {
    const quantity = position.quantity + trade.quantity;
    const cost = position.quantity * position.avgPrice + trade.quantity * trade.price + fee;
    return { ok: true, position: { quantity: round(quantity, 8), avgPrice: round(cost / quantity, 4) }, realizedPnl: null };
  }

  if (trade.quantity > position.quantity + 1e-9) {
    return { ok: false, error: `보유 수량(${position.quantity})보다 많이 팔 수 없습니다.` };
  }
  const quantity = round(position.quantity - trade.quantity, 8);
  return {
    ok: true,
    position: { quantity, avgPrice: quantity === 0 ? 0 : position.avgPrice },
    realizedPnl: round((trade.price - position.avgPrice) * trade.quantity - fee, 4),
  };
}

/** Realised profit per year in the given currency rows, for the summary line. */
export function realizedThisYear(trades: readonly Pick<TradeRow, "date" | "realized_pnl">[], year: string): number {
  return trades.reduce((sum, t) => (t.date.startsWith(year) && t.realized_pnl !== null ? sum + Number(t.realized_pnl) : sum), 0);
}
