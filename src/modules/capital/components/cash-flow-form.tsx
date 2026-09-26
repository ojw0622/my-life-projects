"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { fieldValue, formKey, initialActionState, type ActionState } from "@/lib/forms";

import { addCashFlow } from "../actions";

export interface AssetOption {
  id: string;
  name: string;
}

export function CashFlowForm({ today, assets }: { today: string; assets: AssetOption[] }) {
  // React resets the fields after a successful submit; failures echo values back.
  // Controlled so the asset picker follows the type. React resets the form
  // after a successful submit, so the type goes back to 저축 with it.
  const [flowType, setFlowType] = useState("saving");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await addCashFlow(prev, formData);
    if (result.ok) setFlowType("saving");
    return result;
  }, initialActionState);
  const e = state.fieldErrors ?? {};
  const dividend = flowType === "dividend";

  return (
    <form
      key={formKey(state)}
      action={action}
      className={
        dividend
          ? "grid grid-cols-2 gap-3 sm:grid-cols-[1fr_0.8fr_1fr_1fr_1.2fr_auto] sm:items-end"
          : "grid grid-cols-2 gap-3 sm:grid-cols-[1fr_0.8fr_1fr_1.5fr_auto] sm:items-end"
      }
    >
      <FormField id="cf-amount" label="금액 (KRW)" error={e.amount}>
        <Input name="amount" inputMode="numeric" placeholder="500,000" defaultValue={fieldValue(state, "amount")} required />
      </FormField>
      <FormField id="cf-type" label="유형" error={e.flow_type}>
        <NativeSelect name="flow_type" value={flowType} onChange={(event) => setFlowType(event.target.value)}>
          <option value="saving">저축</option>
          <option value="dividend">배당</option>
        </NativeSelect>
      </FormField>
      {dividend ? (
        <FormField id="cf-asset" label="배당 종목" error={e.asset_id}>
          <NativeSelect name="asset_id" defaultValue={fieldValue(state, "asset_id", "")}>
            <option value="">선택 안 함</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      ) : null}
      <FormField id="cf-date" label="날짜" error={e.date}>
        <Input name="date" type="date" defaultValue={fieldValue(state, "date", today)} required />
      </FormField>
      <FormField id="cf-note" label="메모" error={e.note}>
        <Input name="note" placeholder="9월 월급 저축" defaultValue={fieldValue(state, "note")} />
      </FormField>
      <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
        추가
      </Button>
      {state.message && !state.ok ? (
        <p role="alert" className="text-destructive col-span-full text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
