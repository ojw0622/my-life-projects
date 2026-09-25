import { PlusIcon } from "lucide-react";

import { DeleteButton } from "@/components/delete-button";
import { Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayIn } from "@/lib/date";
import { deleteCashFlow } from "@/modules/capital/actions";
import { AssetFormDialog } from "@/modules/capital/components/asset-form-dialog";
import { AssetTable } from "@/modules/capital/components/asset-table";
import { CashFlowForm } from "@/modules/capital/components/cash-flow-form";
import { FxRateForm } from "@/modules/capital/components/fx-rate-form";
import { RebalanceCalculator } from "@/modules/capital/components/rebalance-calculator";
import { WeightChart } from "@/modules/capital/components/weight-chart";
import { summarizeCashFlows } from "@/modules/capital/lib/cash-flow";
import { formatMoney, formatPercent } from "@/modules/capital/lib/format";
import { buildPortfolioView } from "@/modules/capital/lib/portfolio";
import { getCapitalData } from "@/modules/capital/queries";

export const metadata = { title: "자본 · My Life Dashboard" };

export default async function CapitalPage() {
  const { rows, usdKrwRate, cashFlows } = await getCapitalData();
  const today = todayIn();
  const view = buildPortfolioView(rows, usdKrwRate);
  const flows = summarizeCashFlows(cashFlows, today);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">자본</h1>
          <p className="text-muted-foreground text-sm">목표 비중 대비 괴리와 신규 현금 배분</p>
        </div>
        <FxRateForm usdKrwRate={usdKrwRate} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="총 평가액" value={formatMoney(view.totalValueKrw)} />
        <Stat label="자산 수" value={`${view.items.length}개`} />
        <Stat
          label="밴드 이탈"
          value={`${view.outOfBandCount}개`}
          tone={view.outOfBandCount > 0 ? "critical" : undefined}
        />
        <Stat
          label="목표 비중 합계"
          value={formatPercent(view.targetSum, 2)}
          tone={view.items.length > 0 && !view.targetsValid ? "critical" : undefined}
          note={view.items.length > 0 && !view.targetsValid ? "100%가 되어야 계산기를 쓸 수 있습니다" : undefined}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <CardTitle>포트폴리오</CardTitle>
            <CardDescription>괴리 = 현재 비중 − 목표 비중. 허용 밴드를 넘으면 경고합니다.</CardDescription>
          </div>
          <AssetFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon /> 자산 등록
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="grid gap-6">
          <AssetTable view={view} />
          {view.totalValueKrw > 0 ? (
            <WeightChart
              data={view.items.map((i) => ({
                name: i.row.asset_name,
                current: i.currentWeight,
                target: i.targetWeight,
                drift: i.drift,
                outOfBand: i.outOfBand,
              }))}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>신규 현금 배분 계산기</CardTitle>
          <CardDescription>투입할 금액을 입력하면 목표 비중에 수렴하는 매수 수량을 바로 계산합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <RebalanceCalculator rows={rows} usdKrwRate={usdKrwRate} recentInflowKrw={flows.last30Days} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>저축 · 배당 입금</CardTitle>
          <CardDescription>
            올해 저축 {formatMoney(flows.yearSaving)} · 배당 {formatMoney(flows.yearDividend)} · 최근 30일{" "}
            {formatMoney(flows.last30Days)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CashFlowForm today={today} />
          {cashFlows.length > 0 ? (
            <ul className="divide-y text-sm">
              {cashFlows.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2">
                  <span className="text-muted-foreground w-24 tabular-nums">{f.date}</span>
                  <span className="w-10">{f.flow_type === "saving" ? "저축" : "배당"}</span>
                  <span className="flex-1 truncate">{f.note}</span>
                  <span className="tabular-nums">{formatMoney(Number(f.amount))}</span>
                  <DeleteButton action={deleteCashFlow.bind(null, f.id)} label="입금 기록 삭제" />
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
