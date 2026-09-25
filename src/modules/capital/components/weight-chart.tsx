"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatPercent, formatPercentPoint } from "../lib/format";

export interface WeightDatum {
  name: string;
  current: number;
  target: number;
  drift: number;
  outOfBand: boolean;
}

const BAR_SIZE = 14;

/** Bullet chart: current weight as a bar, target weight as a tick mark. */
export function WeightChart({ data }: { data: WeightDatum[] }) {
  if (data.length === 0) return null;

  const max = Math.max(...data.flatMap((d) => [d.current, d.target]));
  const domainMax = Math.min(1, Math.ceil((max + 0.05) * 10) / 10);
  const ticks = Array.from({ length: Math.round(domainMax * 10) + 1 }, (_, i) => i / 10);
  const summary = data
    .map((d) => `${d.name} 현재 ${formatPercent(d.current)}, 목표 ${formatPercent(d.target)}`)
    .join("; ");

  return (
    <figure className="grid gap-3">
      <figcaption className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">현재 비중 vs 목표 비중</span>
        <span className="flex items-center gap-1.5">
          <span className="bg-series-1 inline-block h-2.5 w-3 rounded-sm" aria-hidden />
          현재 비중
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-foreground inline-block h-3 w-0.5" aria-hidden />
          목표 비중
        </span>
      </figcaption>
      <div role="img" aria-label={summary} style={{ height: data.length * 40 + 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barGap={-BAR_SIZE}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              domain={[0, domainMax]}
              ticks={ticks}
              tickFormatter={(v: number) => formatPercent(v, 0)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: "var(--foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: "var(--muted)" }} content={<WeightTooltip />} />
            <Bar
              dataKey="current"
              barSize={BAR_SIZE}
              fill="var(--series-1)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
            <Bar dataKey="target" barSize={BAR_SIZE} isAnimationActive={false} shape={TargetTick} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Draws the target as a 2px vertical tick at the end of an invisible bar. */
function TargetTick(props: unknown) {
  const { x = 0, y = 0, width = 0, height = 0 } = props as { x?: number; y?: number; width?: number; height?: number };
  const tx = x + width;
  return (
    <line
      x1={tx}
      x2={tx}
      y1={y - 4}
      y2={y + height + 4}
      stroke="var(--foreground)"
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

function WeightTooltip({ active, payload }: { active?: boolean; payload?: { payload: WeightDatum }[] }) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="bg-popover text-popover-foreground grid gap-1 rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{datum.name}</p>
      <p className="tabular-nums">현재 {formatPercent(datum.current)}</p>
      <p className="tabular-nums">목표 {formatPercent(datum.target)}</p>
      <p className="text-muted-foreground tabular-nums">
        괴리 {formatPercentPoint(datum.drift)}
        {datum.outOfBand ? " · 밴드 이탈" : ""}
      </p>
    </div>
  );
}
