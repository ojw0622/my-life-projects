"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { refreshPrices, type RefreshSummary } from "../actions";
import { formatUpdatedAt } from "../lib/format";

/** Prices older than this are refreshed as soon as the page opens. */
const STALE_MS = 5 * 60_000;
/** While the page is open and visible, refresh this often. */
const INTERVAL_MS = 60_000;

/**
 * Keeps auto-priced assets current: refreshes on open when prices are
 * stale, then every minute while the tab is visible, plus a manual button.
 */
export function PriceRefresher({ lastUpdatedAt, enabled }: { lastUpdatedAt: string | null; enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<RefreshSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const pendingRef = useRef(false);

  function refresh() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    startTransition(async () => {
      try {
        setSummary(await refreshPrices());
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        pendingRef.current = false;
      }
    });
  }

  // Timers call the latest `refresh` through a ref.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) return;
    const stale = !lastUpdatedAt || Date.now() - new Date(lastUpdatedAt).getTime() > STALE_MS;
    const initial = stale ? window.setTimeout(() => refreshRef.current(), 0) : undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshRef.current();
    }, INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Only on mount: later updates come from the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const at = summary?.at ?? lastUpdatedAt;
  const status = pending
    ? "시세 불러오는 중…"
    : failed
      ? "시세를 불러오지 못했습니다"
      : summary && summary.failed.length > 0
        ? `일부 실패: ${summary.failed.join(", ")} (이전 가격 유지)`
        : at
          ? `${formatUpdatedAt(at)} 기준 시세`
          : enabled
            ? "시세를 아직 불러오지 않았습니다"
            : "자동 시세 자산 없음";

  return (
    <div className="flex items-center gap-2">
      <span
        role="status"
        className={cn(
          "flex items-center gap-1.5 text-xs",
          failed || summary?.failed.length ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {enabled && !failed ? (
          <span className="relative flex size-2" aria-hidden>
            <span className={cn("bg-good absolute inline-flex size-full rounded-full opacity-60", pending && "animate-ping")} />
            <span className="bg-good relative inline-flex size-2 rounded-full" />
          </span>
        ) : null}
        {status}
      </span>
      <Button type="button" size="sm" variant="outline" onClick={refresh} disabled={pending}>
        <RefreshCwIcon className={cn(pending && "animate-spin")} /> 시세 새로고침
      </Button>
    </div>
  );
}
