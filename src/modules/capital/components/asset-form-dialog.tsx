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
        <FormField id="current_price" label="현재가" error={e.current_price} hint="현금은 1">
          <Input name="current_price" inputMode="decimal" defaultValue={v("current_price", asset?.current_price)} required />
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
