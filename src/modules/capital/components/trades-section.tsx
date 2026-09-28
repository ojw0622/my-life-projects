"use client";

import { useActionState, useState } from "react";

import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Currency } from "@/lib/supabase/database.types";
import { fieldValue, formKey, initialActionState, type ActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { deleteTrade, recordTrade } from "../actions";
import { formatMoney, formatQuantity, formatSignedMoney } from "../lib/format";
import type { TradeRow } from "../lib/trades";

export interface TradeAsset {
  id: string;
  name: string;
  currency: Currency;
  price: number;
  quantity: number;
}

/** Buy/sell log: recording a trade updates the holding's quantity and average price. */
export function TradesSection({ trades, assets, today }: { trades: TradeRow[]; assets: TradeAsset[]; today: string }) {
  const byId = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="grid gap-5">
      {assets.length > 0 ? (
        <TradeForm assets={assets} today={today} />
      ) : (
        <p className="text-muted-foreground text-sm">먼저 자산을 등록하세요.</p>
      )}
      {trades.length > 0 ? (
        <ul className="divide-y text-sm">
          {trades.map((t) => {
            const asset = byId.get(t.asset_id);
            const currency = asset?.currency ?? "KRW";
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="text-muted-foreground w-24 tabular-nums">{t.date}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    t.side === "buy" ? "bg-up/10 text-up" : "bg-down/10 text-down",
                  )}
                >
                  {t.side === "buy" ? "매수" : "매도"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {asset?.name ?? "삭제된 자산"}
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatQuantity(Number(t.quantity))} × {formatMoney(Number(t.price), currency)}
                  </span>
                </span>
                {t.realized_pnl !== null ? (
                  <span
                    className={cn("text-xs tabular-nums", Number(t.realized_pnl) >= 0 ? "text-up" : "text-down")}
                    title="실현 손익"
                  >
                    실현 {formatSignedMoney(Number(t.realized_pnl), currency)}
                  </span>
                ) : null}
                <span className="tabular-nums">
                  {formatMoney(Number(t.quantity) * Number(t.price), currency)}
                </span>
                <DeleteButton
                  action={deleteTrade.bind(null, t.id)}
                  label="거래 기록 삭제"
                  confirmMessage="이 거래 기록을 지울까요? 보유 수량과 평균 매수가는 바뀌지 않습니다."
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function TradeForm({ assets, today }: { assets: TradeAsset[]; today: string }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [assetId, setAssetId] = useState(assets[0].id);
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await recordTrade(prev, formData);
    if (result.ok) setSide("buy");
    return result;
  }, initialActionState);
  const e = state.fieldErrors ?? {};
  const asset = assets.find((a) => a.id === assetId) ?? assets[0];

  return (
    <form
      key={formKey(state)}
      action={action}
      aria-label="거래 기록"
      className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_1.3fr_0.8fr_1fr_0.8fr_1fr_auto] sm:items-end"
    >
      <input type="hidden" name="side" value={side} />
      <div className="col-span-2 grid gap-1.5 sm:col-span-1">
        <span className="text-sm font-medium">구분</span>
        <div role="radiogroup" aria-label="매수 또는 매도" className="bg-muted inline-flex h-9 rounded-md p-0.5">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              onClick={() => setSide(s)}
              className={cn(
                "flex-1 rounded px-3 text-sm transition-colors",
                side === s ? (s === "buy" ? "bg-up text-white" : "bg-down text-white") : "text-muted-foreground",
              )}
            >
              {s === "buy" ? "매수" : "매도"}
            </button>
          ))}
        </div>
      </div>
      <FormField id="trade-asset" label="자산" error={e.asset_id} className="col-span-2 sm:col-span-1">
        <NativeSelect name="asset_id" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="trade-qty" label="수량" error={e.quantity}>
        <Input name="quantity" inputMode="decimal" placeholder={side === "sell" ? `보유 ${formatQuantity(asset.quantity)}` : "10"} defaultValue={fieldValue(state, "quantity")} required />
      </FormField>
      <FormField id="trade-price" label={`가격 (${asset.currency})`} error={e.price}>
        <Input
          key={asset.id}
          name="price"
          inputMode="decimal"
          defaultValue={fieldValue(state, "price", asset.price > 0 ? asset.price : "")}
          required
        />
      </FormField>
      <FormField id="trade-fee" label="수수료" error={e.fee}>
        <Input name="fee" inputMode="decimal" placeholder="0" defaultValue={fieldValue(state, "fee")} />
      </FormField>
      <FormField id="trade-date" label="날짜" error={e.date}>
        <Input name="date" type="date" defaultValue={fieldValue(state, "date", today)} required />
      </FormField>
      <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
        기록
      </Button>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={cn("col-span-full text-sm", state.ok ? "text-muted-foreground" : "text-destructive")}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
