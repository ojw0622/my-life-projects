"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { fieldValue, formKey, initialActionState } from "@/lib/forms";

import { addPrinciple } from "../actions";
import { PRINCIPLE_CATEGORIES, PRINCIPLE_CATEGORY_LABELS } from "../lib/constants";

export function PrincipleForm() {
  const [state, action, pending] = useActionState(addPrinciple, initialActionState);
  const error = state.fieldErrors?.rule_text ?? state.fieldErrors?.category ?? (!state.ok ? state.message : undefined);

  return (
    <form key={formKey(state)} action={action} className="grid gap-2">
      <div className="flex gap-2">
        <NativeSelect name="category" aria-label="분류" defaultValue={fieldValue(state, "category", "investment")} className="w-24">
          {PRINCIPLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PRINCIPLE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
        <Input
          name="rule_text"
          aria-label="원칙"
          placeholder="예: 밴드를 벗어나기 전에는 리밸런싱하지 않는다"
          maxLength={500}
          defaultValue={fieldValue(state, "rule_text")}
          required
          aria-invalid={error ? true : undefined}
        />
        <Button type="submit" disabled={pending}>
          추가
        </Button>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </form>
  );
}
