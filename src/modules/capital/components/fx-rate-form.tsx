"use client";

import { useActionState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldValue, initialActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { saveFxRate, setAutoFx } from "../actions";

/**
 * USD/KRW rate. Automatic by default (refreshed with the prices); typing a
 * rate and saving switches to the manual rate until 자동 is turned back on.
 */
export function FxRateForm({ usdKrwRate, autoFx }: { usdKrwRate: number; autoFx: boolean }) {
  const [state, action, pending] = useActionState(saveFxRate, initialActionState);
  const [toggling, startTransition] = useTransition();
  const error = state.fieldErrors?.usd_krw_rate ?? (!state.ok ? state.message : undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Label htmlFor="usd_krw_rate" className="text-muted-foreground text-xs">
        USD/KRW
      </Label>
      <Input
        // Remount when the rate changes so a refreshed rate shows up.
        key={usdKrwRate}
        id="usd_krw_rate"
        name="usd_krw_rate"
        inputMode="decimal"
        defaultValue={fieldValue(state, "usd_krw_rate", Number(usdKrwRate.toFixed(2)))}
        aria-invalid={error ? true : undefined}
        className="h-8 w-28 text-right tabular-nums"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending} title="직접 입력한 환율로 고정">
        저장
      </Button>
      <button
        type="button"
        role="switch"
        aria-checked={autoFx}
        disabled={toggling}
        onClick={() => startTransition(() => setAutoFx(!autoFx))}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs transition-colors",
          autoFx ? "border-good/40 bg-good/10 text-foreground" : "text-muted-foreground hover:bg-muted",
        )}
        title={autoFx ? "시세와 함께 환율도 자동 갱신 중" : "눌러서 자동 환율 켜기"}
      >
        자동 환율 {autoFx ? "켜짐" : "꺼짐"}
      </button>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </form>
  );
}
