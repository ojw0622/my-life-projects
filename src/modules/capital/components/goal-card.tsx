"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { fieldValue, initialActionState } from "@/lib/forms";

import { saveGoal } from "../actions";
import { formatMoney, formatPercent } from "../lib/format";
import type { Projection } from "../lib/projection";
import { ProjectionChart } from "./capital-charts";

export interface GoalInfo {
  amount: number | null;
  date: string | null;
  expectedReturn: number;
}

const monthLabel = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;

/** Progress towards the goal plus the headline projection numbers. */
export function GoalSummary({
  goal,
  current,
  projection,
  monthly,
  showLink,
}: {
  goal: GoalInfo;
  current: number;
  projection: Projection | null;
  monthly: number;
  showLink?: boolean;
}) {
  if (!goal.amount || !projection) {
    return (
      <div className="grid gap-3 text-sm">
        <p className="text-muted-foreground">
          목표 금액을 정하면 지금 속도로 언제 도달하는지, 매달 얼마를 넣어야 하는지 계산해 드려요.
        </p>
        {showLink ? (
          <Button asChild size="sm" variant="outline" className="justify-self-start">
            <Link href="/capital?tab=plan">목표 정하기</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const progress = Math.min(current / goal.amount, 1);
  const onTrack =
    projection.requiredMonthly === null ? null : monthly >= projection.requiredMonthly - 1;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xl font-semibold tabular-nums">{formatPercent(progress, 1)}</span>
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatMoney(current)} / {formatMoney(goal.amount)}
          </span>
        </div>
        <div
          className="bg-muted h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="목표 달성률"
        >
          <div className="bg-series-1 h-full rounded-full transition-[width] duration-700" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">지금 속도면 도달</dt>
          <dd className="font-medium">
            {projection.reachMonth ? monthLabel(projection.reachMonth) : "40년 안에 어려움"}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">
            {goal.date ? `${monthLabel(goal.date.slice(0, 7))}까지 필요한 월 입금` : "매달 입금 가정"}
          </dt>
          <dd className="font-medium tabular-nums">
            {projection.requiredMonthly === null ? formatMoney(monthly) : formatMoney(projection.requiredMonthly)}
            {onTrack === null ? null : (
              <span className={onTrack ? "text-good ml-1.5 text-xs" : "text-muted-foreground ml-1.5 text-xs"}>
                {onTrack ? "✓ 지금 속도로 충분" : `지금 ${formatMoney(monthly)}`}
              </span>
            )}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-[11px]">
        연 {formatPercent(goal.expectedReturn, 1)} 수익, 매달 {formatMoney(monthly)} 입금을 가정한 추정치예요.
      </p>
      {showLink ? (
        <Link href="/capital?tab=plan" className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4">
          목표 조정 · 예상 그래프 보기
        </Link>
      ) : null}
    </div>
  );
}

/** The goal editor with the projection chart (계획 tab). */
export function GoalPlanner({
  goal,
  current,
  projection,
  monthly,
  monthlySource,
}: {
  goal: GoalInfo;
  current: number;
  projection: Projection | null;
  monthly: number;
  monthlySource: string;
}) {
  const [state, action, pending] = useActionState(saveGoal, initialActionState);
  const e = state.fieldErrors ?? {};

  return (
    <div className="grid gap-6">
      <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-[1.2fr_1fr_0.8fr_auto] sm:items-end">
        <FormField id="goal-amount" label="목표 금액 (KRW)" error={e.goal_amount}>
          <Input
            name="goal_amount"
            inputMode="numeric"
            placeholder="100,000,000"
            defaultValue={fieldValue(state, "goal_amount", goal.amount ? goal.amount.toLocaleString("ko-KR") : "")}
          />
        </FormField>
        <FormField id="goal-date" label="목표 날짜 (선택)" error={e.goal_date}>
          <Input name="goal_date" type="date" defaultValue={fieldValue(state, "goal_date", goal.date ?? "")} />
        </FormField>
        <FormField id="goal-return" label="기대 연수익률 (%)" error={e.expected_return}>
          <Input
            name="expected_return"
            inputMode="decimal"
            defaultValue={fieldValue(state, "expected_return", Number((goal.expectedReturn * 100).toFixed(2)))}
          />
        </FormField>
        <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
          {pending ? "저장 중…" : "목표 저장"}
        </Button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-muted-foreground col-span-full text-sm" : "text-destructive col-span-full text-sm"}>
            {state.message}
          </p>
        ) : null}
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="grid content-start gap-3">
          <GoalSummary goal={goal} current={current} projection={projection} monthly={monthly} />
          <p className="text-muted-foreground text-xs">매달 입금 기준: {monthlySource}</p>
        </div>
        {goal.amount && projection ? (
          <ProjectionChart
            data={projection.series}
            goal={goal.amount}
            goalMonth={goal.date ? goal.date.slice(0, 7) : null}
          />
        ) : null}
      </div>
    </div>
  );
}
