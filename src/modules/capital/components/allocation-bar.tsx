import type { PortfolioCategory } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

import { formatMoney, formatPercent, formatPercentPoint } from "../lib/format";
import type { CategorySlice } from "../lib/performance";

/** Fixed colour per category, so a category keeps its colour whatever else is held. */
const CATEGORY_COLOR: Record<PortfolioCategory, string> = {
  index_etf: "bg-series-1",
  stock: "bg-series-2",
  bond: "bg-series-3",
  commodity: "bg-series-4",
  crypto: "bg-series-5",
  cash: "bg-series-6",
  other: "bg-series-7",
};

/** Part-to-whole by asset category: one stacked bar plus a labelled list. */
export function AllocationBar({ slices }: { slices: CategorySlice[] }) {
  const visible = slices.filter((s) => s.weight > 0);
  if (visible.length === 0) return <p className="text-muted-foreground text-sm">평가액이 있는 자산이 없습니다.</p>;

  return (
    <div className="grid gap-4">
      <div
        role="img"
        aria-label={visible.map((s) => `${s.label} ${formatPercent(s.weight)}`).join(", ")}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {visible.map((s) => (
          <div
            key={s.category}
            className={cn(CATEGORY_COLOR[s.category], "h-full first:rounded-l-full last:rounded-r-full")}
            style={{ width: `${s.weight * 100}%` }}
            title={`${s.label} ${formatPercent(s.weight)}`}
          />
        ))}
      </div>
      <ul className="grid gap-2 text-sm">
        {slices.map((s) => {
          const gap = s.weight - s.targetWeight;
          return (
            <li key={s.category} className="flex items-center gap-2.5">
              <span className={cn(CATEGORY_COLOR[s.category], "size-2.5 shrink-0 rounded-sm")} aria-hidden />
              <span className="flex-1">{s.label}</span>
              <span className="text-muted-foreground hidden tabular-nums sm:inline">{formatMoney(s.valueKrw)}</span>
              <span className="w-14 text-right font-medium tabular-nums">{formatPercent(s.weight)}</span>
              <span
                className={cn(
                  "w-20 text-right text-xs tabular-nums",
                  Math.abs(gap) >= 0.03 ? "text-foreground" : "text-muted-foreground",
                )}
                title={`목표 ${formatPercent(s.targetWeight)}`}
              >
                목표 {formatPercent(s.targetWeight, 0)}
                <span className="sr-only"> (차이 {formatPercentPoint(gap)})</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
