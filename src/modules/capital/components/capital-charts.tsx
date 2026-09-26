"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LedgerMonth } from "../lib/cash-flow";
import { formatMoney } from "../lib/format";

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

/** 1,234,567 → "123만", 150,000,000 → "1.5억". */
function compactKrw(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${Number((value / 1e8).toFixed(1))}억`;
  if (abs >= 1e4) return `${Math.round(value / 1e4).toLocaleString("ko-KR")}만`;
  return value.toLocaleString("ko-KR");
}

function Legend({ items }: { items: { label: string; swatch: React.ReactNode }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {item.swatch}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: { name: string; value: number }[];
}) {
  if (!active) return null;
  return (
    <div className="bg-popover text-popover-foreground grid gap-1 rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      {rows.map((r) => (
        <p key={r.name} className="tabular-nums">
          {r.name} {formatMoney(r.value)}
        </p>
      ))}
    </div>
  );
}

/** Savings and dividends per month, stacked, with the monthly plan as a line. */
export function MonthlyInflowChart({ data }: { data: LedgerMonth[] }) {
  const planned = data.at(-1)?.planned ?? 0;
  const chartData = data.map((d) => ({ ...d, label: `${Number(d.month.slice(5))}월` }));
  const summary = data.map((d) => `${d.month} 저축 ${formatMoney(d.saving)}, 배당 ${formatMoney(d.dividend)}`).join("; ");

  return (
    <figure className="grid min-w-0 gap-3">
      <figcaption>
        <Legend
          items={[
            { label: "저축", swatch: <span className="bg-series-1 inline-block h-2.5 w-3 rounded-sm" aria-hidden /> },
            { label: "배당", swatch: <span className="bg-series-2 inline-block h-2.5 w-3 rounded-sm" aria-hidden /> },
            ...(planned > 0
              ? [{ label: `매달 목표 ${formatMoney(planned)}`, swatch: <span className="border-foreground/60 inline-block w-4 border-t-2 border-dashed" aria-hidden /> }]
              : []),
          ]}
        />
      </figcaption>
      <div role="img" aria-label={summary} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={compactKrw} tick={axisTick} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as (LedgerMonth & { label: string }) | undefined;
                return d ? (
                  <ChartTooltip
                    active={active}
                    label={d.month}
                    rows={[
                      { name: "저축", value: d.saving },
                      { name: "배당", value: d.dividend },
                      { name: "합계", value: d.total },
                    ]}
                  />
                ) : null;
              }}
            />
            <Bar dataKey="saving" stackId="in" fill="var(--series-1)" isAnimationActive={false} maxBarSize={28} />
            <Bar dataKey="dividend" stackId="in" fill="var(--series-2)" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={28} />
            {planned > 0 ? <ReferenceLine y={planned} stroke="var(--foreground)" strokeOpacity={0.6} strokeDasharray="4 4" /> : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export interface ValuePoint {
  date: string;
  value: number;
  invested: number;
}

/** Total portfolio value over time, with the cost basis beneath it. */
export function ValueHistoryChart({ data }: { data: ValuePoint[] }) {
  const showInvested = data.some((d) => d.invested > 0);
  const first = data[0];
  const last = data.at(-1)!;
  const summary = `${first.date} ${formatMoney(first.value)}에서 ${last.date} ${formatMoney(last.value)}`;

  return (
    <figure className="grid min-w-0 gap-3">
      <figcaption>
        <Legend
          items={[
            { label: "평가액", swatch: <span className="bg-series-1 inline-block h-0.5 w-4" aria-hidden /> },
            ...(showInvested
              ? [{ label: "투자 원금", swatch: <span className="border-muted-foreground inline-block w-4 border-t-2 border-dashed" aria-hidden /> }]
              : []),
          ]}
        />
      </figcaption>
      <div role="img" aria-label={summary} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="value-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={compactKrw}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={56}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as ValuePoint | undefined;
                return d ? (
                  <ChartTooltip
                    active={active}
                    label={d.date}
                    rows={[
                      { name: "평가액", value: d.value },
                      ...(d.invested > 0 ? [{ name: "투자 원금", value: d.invested }] : []),
                    ]}
                  />
                ) : null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--series-1)"
              strokeWidth={2}
              fill="url(#value-fill)"
              isAnimationActive={false}
            />
            {showInvested ? (
              <Line
                type="stepAfter"
                dataKey="invested"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
