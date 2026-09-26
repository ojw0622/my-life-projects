"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarClockIcon, CheckIcon, PauseIcon, PlayIcon } from "lucide-react";

import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { fieldValue, formKey, initialActionState, type ActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { deletePlan, recordPlans, savePlan, setPlanActive } from "../actions";
import type { CashFlowPlanRow } from "../lib/cash-flow";
import { formatMoney } from "../lib/format";
import type { AssetOption } from "./cash-flow-form";

export interface PlanItem {
  plan: CashFlowPlanRow;
  assetName: string | null;
  /** Already recorded for the current month. */
  recorded: boolean;
}

const TYPE_LABEL = { saving: "저축", dividend: "배당" } as const;

export function PlansSection({
  items,
  dueIds,
  monthLabel,
  assets,
}: {
  items: PlanItem[];
  dueIds: string[];
  monthLabel: string;
  assets: AssetOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const dueTotal = items.filter((i) => dueIds.includes(i.plan.id)).reduce((s, i) => s + Number(i.plan.amount), 0);

  const record = (ids: string[]) =>
    startTransition(async () => {
      try {
        const { recorded } = await recordPlans(ids);
        setMessage(recorded > 0 ? `${recorded}건을 기록했습니다.` : "이미 이번 달에 기록되어 있습니다.");
      } catch {
        setMessage("기록하지 못했습니다. 잠시 후 다시 시도하세요.");
      }
    });

  return (
    <div className="grid gap-4">
      {dueIds.length > 0 ? (
        <div className="bg-series-1/8 border-series-1/25 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <p className="flex items-center gap-2 text-sm">
            <CalendarClockIcon className="text-series-1 size-4 shrink-0" aria-hidden />
            <span>
              {monthLabel} 입금 <b>{dueIds.length}건</b>({formatMoney(dueTotal)})이 아직 기록되지 않았어요.
            </span>
          </p>
          <Button size="sm" onClick={() => record(dueIds)} disabled={pending}>
            {pending ? "기록 중…" : "이번 달 기록하기"}
          </Button>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="divide-y rounded-lg border text-sm">
          {items.map(({ plan, assetName, recorded }) => (
            <li key={plan.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5", !plan.active && "opacity-55")}>
              <span className="text-muted-foreground w-16 tabular-nums">매월 {plan.day_of_month}일</span>
              <Badge variant={plan.flow_type === "saving" ? "secondary" : "outline"}>{TYPE_LABEL[plan.flow_type]}</Badge>
              <span className="min-w-0 flex-1 truncate">
                {[assetName, plan.note].filter(Boolean).join(" · ") || (plan.flow_type === "saving" ? "매달 저축" : "매달 배당")}
              </span>
              <span className="font-medium tabular-nums">{formatMoney(Number(plan.amount))}</span>
              <span className="flex w-24 justify-end">
                {!plan.active ? (
                  <span className="text-muted-foreground text-xs">일시중지</span>
                ) : recorded ? (
                  <span className="text-good inline-flex items-center gap-1 text-xs">
                    <CheckIcon className="size-3.5" aria-hidden /> 이번 달 완료
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={pending} onClick={() => record([plan.id])}>
                    지금 기록
                  </Button>
                )}
              </span>
              <span className="flex">
                <ToggleButton id={plan.id} active={plan.active} />
                <DeleteButton action={deletePlan.bind(null, plan.id)} label="매달 입금 삭제" confirmMessage="이 매달 입금을 삭제할까요? 이미 기록된 입금은 남습니다." />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          매달 들어가는 저축·배당을 한 번 등록해 두면, 날짜가 되면 알려주고 버튼 한 번으로 기록됩니다.
        </p>
      )}

      <PlanForm assets={assets} />
    </div>
  );
}

function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const label = active ? "일시중지" : "다시 시작";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => startTransition(() => setPlanActive(id, !active))}
    >
      {active ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
    </Button>
  );
}

function PlanForm({ assets }: { assets: AssetOption[] }) {
  // Controlled so the asset picker follows the type. React resets the form
  // after a successful submit, so the type goes back to 저축 with it.
  const [flowType, setFlowType] = useState("saving");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await savePlan(prev, formData);
    if (result.ok) setFlowType("saving");
    return result;
  }, initialActionState);
  const e = state.fieldErrors ?? {};
  const dividend = flowType === "dividend";

  return (
    <form
      key={formKey(state)}
      action={action}
      aria-label="매달 입금 추가"
      className={cn(
        "grid grid-cols-2 gap-3 sm:items-end",
        dividend ? "sm:grid-cols-[0.8fr_1fr_0.7fr_1fr_1.2fr_auto]" : "sm:grid-cols-[0.8fr_1fr_0.7fr_1.5fr_auto]",
      )}
    >
      <FormField id="plan-type" label="유형" error={e.flow_type}>
        <NativeSelect name="flow_type" value={flowType} onChange={(event) => setFlowType(event.target.value)}>
          <option value="saving">저축</option>
          <option value="dividend">배당</option>
        </NativeSelect>
      </FormField>
      <FormField id="plan-amount" label="매달 금액 (KRW)" error={e.amount}>
        <Input name="amount" inputMode="numeric" placeholder="500,000" defaultValue={fieldValue(state, "amount")} required />
      </FormField>
      <FormField id="plan-day" label="매월 (일)" error={e.day_of_month}>
        <Input name="day_of_month" type="number" min={1} max={28} defaultValue={fieldValue(state, "day_of_month", 25)} required />
      </FormField>
      {dividend ? (
        <FormField id="plan-asset" label="배당 종목" error={e.asset_id}>
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
      <FormField id="plan-note" label="메모" error={e.note}>
        <Input name="note" placeholder="월급날 자동이체" defaultValue={fieldValue(state, "note")} />
      </FormField>
      <Button type="submit" variant="outline" disabled={pending} className="col-span-2 sm:col-span-1">
        매달 입금 추가
      </Button>
      {state.message && !state.ok ? (
        <p role="alert" className="text-destructive col-span-full text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
