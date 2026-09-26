"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldValue, initialActionState } from "@/lib/forms";

import { saveFxRate } from "../actions";

export function FxRateForm({ usdKrwRate }: { usdKrwRate: number }) {
  const [state, action, pending] = useActionState(saveFxRate, initialActionState);
  const error = state.fieldErrors?.usd_krw_rate ?? (!state.ok ? state.message : undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Label htmlFor="usd_krw_rate" className="text-muted-foreground text-xs">
        USD/KRW
      </Label>
      <Input
        id="usd_krw_rate"
        name="usd_krw_rate"
        inputMode="decimal"
        defaultValue={fieldValue(state, "usd_krw_rate", usdKrwRate)}
        aria-invalid={error ? true : undefined}
        className="h-8 w-28 text-right tabular-nums"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        저장
      </Button>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </form>
  );
}
