"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { formatMoney, formatPercent, formatQuantity } from "../lib/format";
import { planAllocation, type PortfolioRow } from "../lib/portfolio";

const QUICK_AMOUNTS = [1_000_000, 5_000_000, 10_000_000];

function parseAmount(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  return digits === "" ? 0 : Number(digits);
}

export function RebalanceCalculator({
  rows,
  usdKrwRate,
  quickAmounts,
}: {
  rows: PortfolioRow[];
  usdKrwRate: number;
  /** Recent inflows (this month, last 30 days…) offered as one-click amounts. */
  quickAmounts: { label: string; amount: number }[];
}) {
  const [input, setInput] = useState("");
  const cash = parseAmount(input);
  const deferredCash = useDeferredValue(cash);

  const plan = useMemo(
    () => (deferredCash > 0 ? planAllocation(rows, deferredCash, usdKrwRate) : null),
    [rows, deferredCash, usdKrwRate],
  );

  const setAmount = (amount: number) => setInput(amount.toLocaleString("ko-KR"));
  const buys = plan?.ok ? plan.rows.filter((r) => r.quantity > 0) : [];
  const holds = plan?.ok ? plan.rows.filter((r) => r.quantity === 0) : [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="cash-input">투입할 현금 (KRW)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="cash-input"
            inputMode="numeric"
            placeholder="예: 3,000,000"
            value={input}
            onChange={(e) => {
              const amount = parseAmount(e.target.value);
              setInput(amount > 0 ? amount.toLocaleString("ko-KR") : "");
            }}
            className="max-w-56 text-right tabular-nums"
          />
          {QUICK_AMOUNTS.map((amount) => (
            <Button key={amount} type="button" variant="outline" size="sm" onClick={() => setAmount(cash + amount)}>
              +{amount / 10_000}만
            </Button>
          ))}
          {quickAmounts
            .filter((q) => q.amount > 0)
            .map((q) => (
              <Button key={q.label} type="button" variant="secondary" size="sm" onClick={() => setAmount(q.amount)}>
                {q.label} {formatMoney(q.amount)}
              </Button>
            ))}
        </div>
      </div>

      {plan && !plan.ok ? (
        <p role="alert" className="text-destructive text-sm">
          {plan.error}
        </p>
      ) : null}

      {plan?.ok ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>종목</TableHead>
                <TableHead className="text-right">매수 수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">매수 금액 (KRW)</TableHead>
                <TableHead className="text-right">비중 변화</TableHead>
                <TableHead className="text-right">목표</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...buys, ...holds].map((r) => (
                <TableRow key={r.id} className={cn(r.quantity === 0 && "text-muted-foreground")}>
                  <TableCell>
                    <span className="font-medium">{r.assetName}</span>
                    {r.ticker ? <span className="text-muted-foreground ml-2 text-xs">{r.ticker}</span> : null}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {r.quantity > 0 ? `${formatQuantity(r.quantity)}${r.unit}` : "–"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(r.unitPrice, r.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.quantity > 0 ? formatMoney(r.costKrw) : "–"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(r.weightBefore)} → {formatPercent(r.weightAfter)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(r.targetWeight)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>매수 합계 / 잔여 현금</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(plan.totalSpentKrw)}</TableCell>
                <TableCell colSpan={2} className="text-right tabular-nums">
                  잔여 {formatMoney(plan.leftoverKrw)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          <p className="text-muted-foreground text-xs">
            매수만으로 목표 비중에 가장 가까워지는 조합입니다. 기존 보유분은 팔지 않습니다. USD 자산은 환율{" "}
            {usdKrwRate.toLocaleString("ko-KR")}원으로 환산했습니다.
          </p>
        </>
      ) : null}
    </div>
  );
}
