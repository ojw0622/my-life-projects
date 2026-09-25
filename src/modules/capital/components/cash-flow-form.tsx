"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { fieldValue, formKey, initialActionState } from "@/lib/forms";

import { addCashFlow } from "../actions";

export function CashFlowForm({ today }: { today: string }) {
  // React resets the fields after a successful submit; failures echo values back.
  const [state, action, pending] = useActionState(addCashFlow, initialActionState);
  const e = state.fieldErrors ?? {};

  return (
    <form key={formKey(state)} action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto] sm:items-end">
      <FormField id="cf-amount" label="금액 (KRW)" error={e.amount}>
        <Input name="amount" inputMode="numeric" placeholder="500,000" defaultValue={fieldValue(state, "amount")} required />
      </FormField>
      <FormField id="cf-type" label="유형" error={e.flow_type}>
        <NativeSelect name="flow_type" defaultValue={fieldValue(state, "flow_type", "saving")}>
          <option value="saving">저축</option>
          <option value="dividend">배당</option>
        </NativeSelect>
      </FormField>
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
