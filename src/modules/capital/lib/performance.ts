import type { PortfolioCategory } from "@/lib/supabase/database.types";

import { addDays } from "@/lib/date";

import { CATEGORY_LABELS } from "./constants";
import type { PortfolioView } from "./portfolio";

export interface Snapshot {
  date: string;
  value: number;
  invested: number;
}

export interface PeriodReturn {
  key: string;
  label: string;
  /** Date of the snapshot compared against. */
  since: string;
  valueChange: number;
  valueRate: number | null;
  /** Change in unrealised P/L — the part not explained by new money. */
  pnlChange: number;
}

/** Start date for each period, from today. */
function periodStarts(today: string): { key: string; label: string; start: string }[] {
  return [
    { key: "1w", label: "1주", start: addDays(today, -7) },
    { key: "1m", label: "1개월", start: addDays(today, -30) },
    { key: "3m", label: "3개월", start: addDays(today, -91) },
    { key: "ytd", label: "올해", start: `${today.slice(0, 4)}-01-01` },
    { key: "1y", label: "1년", start: addDays(today, -365) },
  ];
}

/**
 * Change of the portfolio over common periods, measured against the last
 * snapshot on or before each period's start (the first snapshot when the
 * history is shorter, as long as it is older than today). `current` is
 * today's live total, so the result stays fresh between snapshots.
 */
export function periodReturns(
  snapshots: readonly Snapshot[],
  current: { value: number; invested: number },
  today: string,
): PeriodReturn[] {
  const past = snapshots.filter((s) => s.date < today).sort((a, b) => a.date.localeCompare(b.date));
  if (past.length === 0) return [];

  const results: PeriodReturn[] = [];
  let lastSince: string | null = null;
  for (const { key, label, start } of periodStarts(today)) {
    const base = [...past].reverse().find((s) => s.date <= start) ?? past[0];
    // Several periods falling back to the same first snapshot say the same thing; keep one.
    if (base.date > start && lastSince === base.date) continue;
    lastSince = base.date;
    results.push({
      key,
      label: base.date > start ? `${label}*` : label,
      since: base.date,
      valueChange: current.value - base.value,
      valueRate: base.value > 0 ? current.value / base.value - 1 : null,
      pnlChange: current.value - current.invested - (base.value - base.invested),
    });
  }
  return results;
}

export interface CategorySlice {
  category: PortfolioCategory;
  label: string;
  valueKrw: number;
  weight: number;
  targetWeight: number;
}

/** Portfolio value grouped by asset category, in a fixed category order. */
export function allocationByCategory(view: PortfolioView): CategorySlice[] {
  const order = Object.keys(CATEGORY_LABELS) as PortfolioCategory[];
  const slices = new Map<PortfolioCategory, CategorySlice>();
  for (const item of view.items) {
    const category = item.row.category;
    const slice =
      slices.get(category) ??
      { category, label: CATEGORY_LABELS[category], valueKrw: 0, weight: 0, targetWeight: 0 };
    slice.valueKrw += item.valueKrw;
    slice.weight += item.currentWeight;
    slice.targetWeight += item.targetWeight;
    slices.set(category, slice);
  }
  return order.filter((c) => slices.has(c)).map((c) => slices.get(c)!);
}
