"use client";

import { useState } from "react";

import { addDays } from "@/lib/date";
import { cn } from "@/lib/utils";

import { formatSignedMoney } from "../lib/format";
import type { PeriodReturn, Snapshot } from "../lib/performance";
import { ValueHistoryChart } from "./capital-charts";
import { ChangeText } from "./change-text";

const RANGES = [
  { key: "1m", label: "1개월", days: 30 },
  { key: "3m", label: "3개월", days: 91 },
  { key: "1y", label: "1년", days: 365 },
  { key: "all", label: "전체", days: null },
] as const;

/** Period returns as chips, and the value history with a range picker. */
export function PerformanceCard({
  snapshots,
  returns,
  today,
}: {
  snapshots: Snapshot[];
  returns: PeriodReturn[];
  today: string;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("3m");
  const days = RANGES.find((r) => r.key === range)?.days ?? null;
  const from = days === null ? "" : addDays(today, -days);
  const data = snapshots.filter((s) => s.date >= from);

  return (
    <div className="grid gap-5">
      {returns.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {returns.map((r) => (
            <li key={r.key} className="bg-muted/50 grid gap-0.5 rounded-lg px-3 py-2" title={`${r.since} 대비`}>
              <span className="text-muted-foreground text-xs">{r.label}</span>
              <ChangeText rate={r.valueRate} className="text-sm font-medium" />
              <span className="text-muted-foreground text-[11px] tabular-nums">
                손익 {formatSignedMoney(r.pnlChange)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {snapshots.length > 1 ? (
        <div className="grid gap-3">
          <div role="group" aria-label="기간" className="flex gap-1 self-end justify-self-end">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  range === r.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {data.length > 1 ? (
            <ValueHistoryChart data={data} />
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">이 기간에는 기록이 하나뿐입니다.</p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          시세를 새로고침할 때마다 하루 한 칸씩 기록돼요. 내일부터 추이 그래프와 기간별 수익률이 보입니다.
        </p>
      )}
      {returns.some((r) => r.label.endsWith("*")) ? (
        <p className="text-muted-foreground text-[11px]">* 기록이 그 기간보다 짧아 첫 기록부터 계산했습니다. 손익은 새로 넣은 돈을 뺀 변화입니다.</p>
      ) : returns.length > 0 ? (
        <p className="text-muted-foreground text-[11px]">위: 평가액 변화율 · 아래: 새로 넣은 돈을 뺀 손익 변화</p>
      ) : null}
    </div>
  );
}
