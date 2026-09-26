import { PlusIcon, RepeatIcon } from "lucide-react";

import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCashFlow } from "@/modules/capital/actions";
import { AssetFormDialog } from "@/modules/capital/components/asset-form-dialog";
import { AssetTable } from "@/modules/capital/components/asset-table";
import { MonthlyInflowChart, ValueHistoryChart } from "@/modules/capital/components/capital-charts";
import { CashFlowForm } from "@/modules/capital/components/cash-flow-form";
import { ChangeText } from "@/modules/capital/components/change-text";
import { FxRateForm } from "@/modules/capital/components/fx-rate-form";
import { PlansSection } from "@/modules/capital/components/plans-section";
import { PriceRefresher } from "@/modules/capital/components/price-refresher";
import { RebalanceCalculator } from "@/modules/capital/components/rebalance-calculator";
import { WeightChart } from "@/modules/capital/components/weight-chart";
import { dividendsByAsset, duePlans, monthlyLedger, monthOf, summarizeCashFlows } from "@/modules/capital/lib/cash-flow";
import { formatMoney, formatPercent, formatSignedMoney } from "@/modules/capital/lib/format";
import { buildPortfolioView } from "@/modules/capital/lib/portfolio";
import { quoteSources } from "@/modules/capital/lib/quotes";
import { getCapitalData } from "@/modules/capital/queries";

export const metadata = { title: "자본 · My Life Dashboard" };

/** Cash-flow rows shown in the list; older ones still count in the charts. */
const FLOW_LIST_LIMIT = 30;

export default async function CapitalPage() {
  const { today, rows, usdKrwRate, autoFx, cashFlows, plans, snapshots } = await getCapitalData();
  const view = buildPortfolioView(rows, usdKrwRate);
  const flows = summarizeCashFlows(cashFlows, today);
  const ledger = monthlyLedger(cashFlows, plans, today, 12);
  const thisMonth = ledger.at(-1)!;
  const due = duePlans(plans, cashFlows, today);
  const month = monthOf(today);

  const assetName = new Map(rows.map((r) => [r.id, r.asset_name]));
  const assetOptions = rows.filter((r) => r.category !== "cash").map((r) => ({ id: r.id, name: r.asset_name }));
  const recordedPlanIds = new Set(cashFlows.filter((f) => f.plan_id && monthOf(f.date) === month).map((f) => f.plan_id));
  const dividends = dividendsByAsset(cashFlows, today.slice(0, 4));

  const livePriced = rows.filter((r) => quoteSources(r).length > 0);
  const lastPriceAt =
    livePriced
      .map((r) => r.price_updated_at)
      .filter((t): t is string => !!t)
      .sort()
      .at(0) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Capital"
        title="자본"
        description="실시간 평가액, 목표 비중 대비 괴리, 매달 입금과 신규 현금 배분"
        actions={
          <div className="flex flex-col items-end gap-2">
            <PriceRefresher
              enabled={livePriced.length > 0 || (autoFx && rows.some((r) => r.currency === "USD"))}
              lastUpdatedAt={livePriced.length > 0 && livePriced.every((r) => r.price_updated_at) ? lastPriceAt : null}
            />
            <FxRateForm usdKrwRate={usdKrwRate} autoFx={autoFx} />
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="총 평가액"
          value={formatMoney(view.totalValueKrw)}
          note={
            view.dayChangeRate !== null ? (
              <span className="flex items-center gap-1">
                오늘 <ChangeText rate={view.dayChangeRate} amount={formatSignedMoney(view.dayChangeKrw)} />
              </span>
            ) : (
              `${view.items.length}개 자산`
            )
          }
        />
        <Stat
          label="평가손익"
          value={view.totalPnlRate === null ? "–" : formatSignedMoney(view.totalPnlKrw)}
          note={
            view.totalPnlRate === null ? (
              "평균 매수가를 입력하면 계산됩니다"
            ) : (
              <span className="flex items-center gap-1">
                원금 {formatMoney(view.totalCostKrw)} <ChangeText rate={view.totalPnlRate} />
              </span>
            )
          }
        />
        <Stat
          label="이번 달 입금"
          value={formatMoney(thisMonth.total)}
          note={
            thisMonth.planned > 0
              ? thisMonth.total >= thisMonth.planned
                ? `매달 목표 ${formatMoney(thisMonth.planned)} 달성`
                : `매달 목표 ${formatMoney(thisMonth.planned)} 중 ${formatPercent(thisMonth.total / thisMonth.planned, 0)}`
              : `저축 ${formatMoney(thisMonth.saving)} · 배당 ${formatMoney(thisMonth.dividend)}`
          }
        />
        <Stat
          label="밴드 이탈"
          value={`${view.outOfBandCount}개`}
          tone={view.outOfBandCount > 0 ? "critical" : undefined}
          note={
            view.items.length > 0 && !view.targetsValid
              ? `목표 비중 합계 ${formatPercent(view.targetSum, 2)} — 100%가 되어야 계산기를 쓸 수 있습니다`
              : view.outOfBandCount > 0
                ? "아래 계산기로 입금액을 배분하세요"
                : "모든 자산이 허용 밴드 안"
          }
        />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <CardTitle>포트폴리오</CardTitle>
            <CardDescription>
              현재가 아래는 전일 대비 변동(▲ 상승 · ▼ 하락). 괴리 = 현재 비중 − 목표 비중, 허용 밴드를 넘으면 경고합니다.
            </CardDescription>
          </div>
          <AssetFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon /> 자산 등록
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6">
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

      {snapshots.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>자산 추이</CardTitle>
            <CardDescription>시세를 새로고침할 때마다 하루 한 칸씩 기록됩니다 (최근 1년).</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshots.length > 1 ? (
              <ValueHistoryChart data={snapshots} />
            ) : (
              <p className="text-muted-foreground text-sm">
                오늘 {formatMoney(snapshots[0].value)}을 첫 기록으로 남겼어요. 내일부터 추이 그래프가 그려집니다.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>신규 현금 배분 계산기</CardTitle>
          <CardDescription>투입할 금액을 입력하면 목표 비중에 수렴하는 매수 수량을 바로 계산합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <RebalanceCalculator
            rows={rows}
            usdKrwRate={usdKrwRate}
            quickAmounts={[
              { label: "이번 달 입금", amount: thisMonth.total },
              ...(flows.last30Days !== thisMonth.total ? [{ label: "최근 30일 입금", amount: flows.last30Days }] : []),
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>매달 입금</CardTitle>
          <CardDescription>
            정기 저축·배당을 등록해 두면 매달 그날이 지나면 알려주고, 버튼 한 번으로 입금 기록에 들어갑니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlansSection
            items={plans.map((plan) => ({
              plan,
              assetName: plan.asset_id ? (assetName.get(plan.asset_id) ?? null) : null,
              recorded: recordedPlanIds.has(plan.id),
            }))}
            dueIds={due.map((p) => p.id)}
            monthLabel={`${Number(month.slice(5))}월`}
            assets={assetOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>저축 · 배당 입금</CardTitle>
          <CardDescription>
            올해 저축 {formatMoney(flows.yearSaving)} · 배당 {formatMoney(flows.yearDividend)} · 최근 12개월 월평균{" "}
            {formatMoney(ledger.reduce((s, m) => s + m.total, 0) / ledger.length)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6">
          {cashFlows.length > 0 ? <MonthlyInflowChart data={ledger} /> : null}
          {dividends.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-muted-foreground text-xs">올해 종목별 배당</p>
              <ul className="flex flex-wrap gap-2 text-sm">
                {dividends.map((d) => (
                  <li key={d.assetId ?? "none"} className="bg-muted/60 rounded-md px-2.5 py-1">
                    {d.assetId ? (assetName.get(d.assetId) ?? "삭제된 자산") : "종목 미지정"}{" "}
                    <span className="font-medium tabular-nums">{formatMoney(d.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <CashFlowForm today={today} assets={assetOptions} />
          {cashFlows.length > 0 ? (
            <ul className="divide-y text-sm">
              {cashFlows.slice(0, FLOW_LIST_LIMIT).map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-2">
                  <span className="text-muted-foreground w-24 tabular-nums">{f.date}</span>
                  <span className="w-10">{f.flow_type === "saving" ? "저축" : "배당"}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {f.plan_id ? (
                      <Badge variant="outline" className="gap-1" title="매달 입금에서 기록됨">
                        <RepeatIcon className="size-3" aria-hidden /> 매달
                      </Badge>
                    ) : null}
                    <span className="truncate">
                      {[f.asset_id ? assetName.get(f.asset_id) : null, f.note].filter(Boolean).join(" · ")}
                    </span>
                  </span>
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
