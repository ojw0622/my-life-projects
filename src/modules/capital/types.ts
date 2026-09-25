import type { Tables } from "@/lib/supabase/database.types";

import type { Holding } from "./engine";

export type CapitalPortfolioRow = Tables<"capital_portfolios">;
export type CapitalHoldingRow = Tables<"capital_holdings">;

/** Maps a `capital_holdings` row to the engine's input shape. */
export function toEngineHolding(row: CapitalHoldingRow): Holding {
  return {
    id: row.id,
    assetClass: row.asset_class,
    targetWeight: Number(row.target_weight),
    quantity: Number(row.quantity),
    price: Number(row.unit_price),
    lotSize: Number(row.lot_size),
  };
}
