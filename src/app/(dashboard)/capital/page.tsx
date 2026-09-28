import Link from "next/link";
import { AlertTriangleIcon, PlusIcon, RepeatIcon } from "lucide-react";

import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCashFlow } from "@/modules/capital/actions";
import { AllocationBar } from "@/modules/capital/components/allocation-bar";
import { AssetFormDialog } from "@/modules/capital/components/asset-form-dialog";
import { AssetTable } from "@/modules/capital/components/asset-table";
import { CapitalTabs, parseCapitalTab } from "@/modules/capital/components/capital-tabs";
import { MonthlyInflowChart } from "@/modules/capital/components/capital-charts";
import { CashFlowForm } from "@/modules/capital/components/cash-flow-form";
import { ChangeText } from "@/modules/capital/components/change-text";
import { FxRateForm } from "@/modules/capital/components/fx-rate-form";
import { GoalPlanner, GoalSummary } from "@/modules/capital/components/goal-card";
import { PerformanceCard } from "@/modules/capital/components/performance-card";
import { PlansSection } from "@/modules/capital/components/plans-section";
import { PriceRefresher } from "@/modules/capital/components/price-refresher";
import { RebalanceCalculator } from "@/modules/capital/components/rebalance-calculator";
import { TradesSection } from "@/modules/capital/components/trades-section";
import { WeightChart } from "@/modules/capital/components/weight-chart";
import { dividendsByAsset, duePlans, monthlyLedger, monthOf, summarizeCashFlows } from "@/modules/capital/lib/cash-flow";
import { formatMoney, formatPercent, formatPercentPoint, formatSignedMoney } from "@/modules/capital/lib/format";
import { allocationByCategory, periodReturns } from "@/modules/capital/lib/performance";
import { buildPortfolioView } from "@/modules/capital/lib/portfolio";
import { projectGoal } from "@/modules/capital/lib/projection";
import { quoteSources } from "@/modules/capital/lib/quotes";
import { realizedThisYear } from "@/modules/capital/lib/trades";
import { getCapitalData } from "@/modules/capital/queries";

export const metadata = { title: "자본 · My Life Dashboard" };

/** Cash-flow rows shown in the list; older ones still count in the charts. */
const FLOW_LIST_LIMIT = 30;

export default async function CapitalPage({ searchParams }: PageProps<"/capital">) {
  const tab = parseCapitalTab((await searchParams).tab);
  const { today, rows, usdKrwRate, autoFx, cashFlows, plans, snapshots, trades, goal } = await getCapitalData();
  const view = buildPortfolioView(rows, usdKrwRate);
  const flows = summarizeCashFlows(cashFlows, today);
  const ledger = monthlyLedger(cashFlows, plans, today, 12);
  const thisMonth = ledger.at(-1)!;
  const due = duePlans(plans, cashFlows, today);
  const month = monthOf(today);
  const year = today.slice(0, 4);

  const assetName = new Map(rows.map((r) => [r.id, r.asset_name]));
  const assetOptions = rows.filter((r) => r.category !== "cash").map((r) => ({ id: r.id, name: r.asset_name }));
  const recordedPlanIds = new Set(cashFlows.filter((f) => f.plan_id && monthOf(f.date) === month).map((f) => f.plan_id));

  const livePriced = rows.filter((r) => quoteSources(r).length > 0);
  const lastPriceAt =
    livePriced
      .map((r) => r.price_updated_at)
      .filter((t): t is string => !!t)
      .sort()
      .at(0) ?? null;

  // Monthly contribution assumed by the goal projection.
  const planTotal = thisMonth.planned;
  const averageInflow = ledger.reduce((s, m) => s + m.total, 0) / ledger.length;
  const monthly = planTotal > 0 ? planTotal : Math.round(averageInflow);
  const monthlySource = planTotal > 0 ? "등록한 매달 입금 합계" : "최근 12개월 평균 입금";
  const projection = goal.amount
    ? projectGoal({
        current: view.totalValueKrw,
        monthly,
        annualReturn: goal.expectedReturn,
        goal: goal.amount,
        today,
        goalDate: goal.date,
      })
    : null;

  const outOfBand = view.items.filter((i) => i.outOfBand);
  const currencyOf = new Map(rows.map((r) => [r.id, r.currency]));
  const realizedKrw = realizedThisYear(trades.filter((t) => currencyOf.get(t.asset_id) !== "USD"), year);
  const usdTrades = trades.filter((t) => currencyOf.get(t.asset_id) === "USD");
  const realizedUsd = realizedThisYear(usdTrades, year);

  return (
    <>
      <PageHeader
        eyebrow="Capital"
        title="자본"
        description="실시간 평가액, 목표 비중 대비 괴리, 매달 입금과 목표까지의 길"
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
          label={goal.amount ? "목표 달성률" : "밴드 이탈"}
          value={goal.amount ? formatPercent(Math.min(view.totalValueKrw / goal.amount, 1)) : `${view.outOfBandCount}개`}
          tone={!goal.amount && view.outOfBandCount > 0 ? "critical" : undefined}
          note={
            goal.amount
              ? projection?.reachMonth
                ? `${formatMoney(goal.amount)} · ${projection.reachMonth.slice(0, 4)}년 ${Number(projection.reachMonth.slice(5))}월 예상`
                : formatMoney(goal.amount)
              : view.items.length > 0 && !view.targetsValid
                ? `목표 비중 합계 ${formatPercent(view.targetSum, 2)} — 100%로 맞춰주세요`
                : view.outOfBandCount > 0
                  ? "계산기로 입금액을 배분하세요"
                  : "모든 자산이 허용 밴드 안"
          }
        />
      </section>

      {due.length > 0 && tab !== "flows" ? (
        <Link
          href="/capital?tab=flows"
          className="bg-series-1/8 border-series-1/25 hover:bg-series-1/12 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors"
        >
          <span>
            이번 달 매달 입금 <b>{due.length}건</b>이 아직 기록되지 않았어요.
          </span>
          <span className="text-series-1 font-medium whitespace-nowrap">기록하러 가기 →</span>
        </Link>
      ) : null}

      <CapitalTabs
        current={tab}
        badges={{ holdings: view.outOfBandCount || undefined, flows: due.length || undefined }}
      />

      {tab === "overview" && rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>첫 자산을 등록해 보세요</CardTitle>
            <CardDescription>
              보유 종목과 목표 비중을 등록하면 실시간 평가액, 리밸런싱, 목표까지의 예상을 한눈에 볼 수 있어요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssetFormDialog
              trigger={
                <Button>
                  <PlusIcon /> 자산 등록
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === "overview" && rows.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>자산 추이</CardTitle>
              <CardDescription>기간별 수익률과 평가액 흐름 (시세를 새로고침할 때 하루 한 칸씩 기록)</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceCard
                snapshots={snapshots}
                returns={periodReturns(snapshots, { value: view.totalValueKrw, invested: view.totalCostKrw }, today)}
                today={today}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>자산 배분</CardTitle>
                <CardDescription>분류별 현재 비중과 목표 비중</CardDescription>
              </CardHeader>
              <CardContent>
                <AllocationBar slices={allocationByCategory(view)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>재무 목표</CardTitle>
                <CardDescription>지금 속도로 언제 도달할까</CardDescription>
              </CardHeader>
              <CardContent>
                <GoalSummary goal={goal} current={view.totalValueKrw} projection={projection} monthly={monthly} showLink />
              </CardContent>
            </Card>
          </div>

          {outOfBand.length > 0 ? (
            <Card className="border-critical/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangleIcon className="text-critical size-4" aria-hidden /> 리밸런싱 점검
                </CardTitle>
                <CardDescription>허용 밴드를 벗어난 자산이에요. 다음 입금을 계산기로 배분하면 자연스럽게 맞춰집니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <ul className="grid gap-2 text-sm">
                  {outOfBand.map((i) => (
                    <li key={i.row.id} className="flex items-center justify-between gap-3">
                      <span>{i.row.asset_name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatPercent(i.currentWeight)} → 목표 {formatPercent(i.targetWeight)}{" "}
                        <span className="text-foreground font-medium">
                          ({formatPercentPoint(i.drift)} {i.drift > 0 ? "초과" : "미달"})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm" variant="outline" className="justify-self-start">
                  <Link href="/capital?tab=plan">계산기 열기</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === "holdings" ? (
        <>
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

          <Card>
            <CardHeader>
              <CardTitle>매수 · 매도 기록</CardTitle>
              <CardDescription>
                기록하면 보유 수량과 평균 매수가가 자동으로 바뀝니다. 올해 실현 손익 {formatSignedMoney(realizedKrw)}
                {usdTrades.length > 0 ? ` · ${formatSignedMoney(realizedUsd, "USD")}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TradesSection
                trades={trades}
                today={today}
                assets={rows
                  .filter((r) => r.category !== "cash")
                  .map((r) => ({
                    id: r.id,
                    name: r.asset_name,
                    currency: r.currency,
                    price: Number(r.current_price),
                    quantity: Number(r.current_qty),
                  }))}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === "flows" ? (
        <>
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
                {formatMoney(averageInflow)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6">
              {cashFlows.length > 0 ? <MonthlyInflowChart data={ledger} /> : null}
              <DividendList flows={cashFlows} year={year} assetName={assetName} />
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
      ) : null}

      {tab === "plan" ? (
        <>
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
              <CardTitle>재무 목표 시뮬레이터</CardTitle>
              <CardDescription>목표 금액과 기대 수익률을 정하면, 도달 시점과 필요한 월 입금을 계산합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <GoalPlanner
                goal={goal}
                current={view.totalValueKrw}
                projection={projection}
                monthly={monthly}
                monthlySource={`${monthlySource} ${formatMoney(monthly)}`}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  );
}

function DividendList({
  flows,
  year,
  assetName,
}: {
  flows: Parameters<typeof dividendsByAsset>[0];
  year: string;
  assetName: Map<string, string>;
}) {
  const dividends = dividendsByAsset(flows, year);
  if (dividends.length === 0) return null;
  return (
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
  );
}
