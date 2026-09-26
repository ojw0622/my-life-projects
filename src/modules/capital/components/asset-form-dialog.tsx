"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { fieldValue, formKey, initialActionState, type ActionState } from "@/lib/forms";

import { saveAsset } from "../actions";
import { CATEGORIES, CATEGORY_LABELS, CURRENCIES, DEFAULT_TOLERANCE_BAND } from "../lib/constants";
import type { PortfolioRow } from "../lib/portfolio";

/** Fraction → percent string for inputs, without float noise (0.07 → "7"). */
const toPercentInput = (fraction: number) => String(Number((fraction * 100).toFixed(4)));

export function AssetFormDialog({ asset, trigger }: { asset?: PortfolioRow; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{asset ? "자산 수정" : "자산 등록"}</DialogTitle>
          <DialogDescription>비중과 밴드는 % 단위로 입력합니다.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts with a clean form state. */}
        <AssetForm asset={asset} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AssetForm({ asset, onSaved }: { asset?: PortfolioRow; onSaved: () => void }) {
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveAsset(prev, formData);
    if (result.ok) onSaved();
    return result;
  }, initialActionState);
  const e = state.fieldErrors ?? {};
  const v = (name: string, fallback?: string | number | null) => fieldValue(state, name, fallback);

  return (
    <form key={formKey(state)} action={action} className="grid gap-4">
      {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <FormField id="asset_name" label="자산명" error={e.asset_name} className="col-span-2 sm:col-span-1">
          <Input name="asset_name" defaultValue={v("asset_name", asset?.asset_name)} placeholder="KODEX 200" required />
        </FormField>
        <FormField id="ticker" label="티커" error={e.ticker} className="col-span-2 sm:col-span-1">
          <Input name="ticker" defaultValue={v("ticker", asset?.ticker)} placeholder="069500" />
        </FormField>
        <FormField id="category" label="분류" error={e.category}>
          <NativeSelect name="category" defaultValue={v("category", asset?.category ?? "index_etf")}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="currency" label="통화" error={e.currency}>
          <NativeSelect name="currency" defaultValue={v("currency", asset?.currency ?? "KRW")}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="current_qty" label="보유 수량" error={e.current_qty}>
          <Input name="current_qty" inputMode="decimal" defaultValue={v("current_qty", asset?.current_qty ?? 0)} required />
        </FormField>
        <FormField id="current_price" label="현재가" error={e.current_price} hint="자동 시세면 비워도 됨 · 현금은 1">
          <Input name="current_price" inputMode="decimal" defaultValue={v("current_price", asset?.current_price || "")} />
        </FormField>
        <FormField id="avg_buy_price" label="평균 매수가" error={e.avg_buy_price}>
          <Input name="avg_buy_price" inputMode="decimal" defaultValue={v("avg_buy_price", asset?.avg_buy_price || "")} />
        </FormField>
        <FormField id="target_ratio" label="목표 비중 (%)" error={e.target_ratio}>
          <Input
            name="target_ratio"
            inputMode="decimal"
            defaultValue={v("target_ratio", asset ? toPercentInput(Number(asset.target_ratio)) : "")}
            required
          />
        </FormField>
        <FormField id="tolerance_band" label="허용 밴드 (%p)" error={e.tolerance_band} hint="기본 3">
          <Input
            name="tolerance_band"
            inputMode="decimal"
            defaultValue={v("tolerance_band", toPercentInput(Number(asset?.tolerance_band ?? DEFAULT_TOLERANCE_BAND)))}
          />
        </FormField>
      </div>
      <fieldset className="bg-muted/50 grid gap-3 rounded-lg border p-3">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="auto_price"
            defaultChecked={state.values ? state.values.auto_price === "on" : (asset?.auto_price ?? true)}
            className="accent-primary mt-0.5 size-4"
          />
          <span className="grid gap-0.5">
            <span className="font-medium">실시간 시세 자동 반영</span>
            <span className="text-muted-foreground text-xs">
              티커로 현재가를 자동으로 가져옵니다. 국내주식·ETF는 6자리 코드(069500), 미국은 VOO, 코인은 BTC.
            </span>
          </span>
        </label>
        <FormField id="quote_symbol" label="시세 코드 (선택)" error={e.quote_symbol} hint="자동으로 못 찾을 때만: 예) 005930.KS, KRW-BTC">
          <Input name="quote_symbol" defaultValue={v("quote_symbol", asset?.quote_symbol)} placeholder="비워두면 티커 사용" />
        </FormField>
      </fieldset>
      {state.message && !state.ok ? (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </DialogFooter>
    </form>
  );
}
