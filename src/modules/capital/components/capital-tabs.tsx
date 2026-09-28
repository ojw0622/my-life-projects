import Link from "next/link";

import { cn } from "@/lib/utils";

export const CAPITAL_TABS = [
  { key: "overview", label: "개요" },
  { key: "holdings", label: "보유 자산" },
  { key: "flows", label: "입금" },
  { key: "plan", label: "계획" },
] as const;

export type CapitalTab = (typeof CAPITAL_TABS)[number]["key"];

export function parseCapitalTab(value: string | string[] | undefined): CapitalTab {
  return CAPITAL_TABS.find((t) => t.key === value)?.key ?? "overview";
}

/** Section switcher; plain links so it works without client JS and keeps the URL shareable. */
export function CapitalTabs({ current, badges }: { current: CapitalTab; badges?: Partial<Record<CapitalTab, number>> }) {
  return (
    <nav aria-label="자본 섹션" className="bg-muted/70 inline-flex w-full gap-1 overflow-x-auto rounded-xl p-1 sm:w-auto sm:self-start">
      {CAPITAL_TABS.map((tab) => {
        const active = tab.key === current;
        const badge = badges?.[tab.key];
        return (
          <Link
            key={tab.key}
            href={tab.key === "overview" ? "/capital" : `/capital?tab=${tab.key}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm whitespace-nowrap transition-all sm:flex-none",
              active
                ? "bg-card text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {badge ? (
              <span className="bg-critical/90 text-background min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold tabular-nums">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
