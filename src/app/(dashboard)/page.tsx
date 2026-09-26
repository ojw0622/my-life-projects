import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayIn } from "@/lib/date";
import { WeeklyMileageCard } from "@/modules/body/components/weekly-mileage-card";
import { weeklyMileage } from "@/modules/body/lib/run";
import { summarizeWorkouts } from "@/modules/body/lib/workout";
import { getRecentRuns, getRecentWorkouts } from "@/modules/body/queries";
import { formatMoney } from "@/modules/capital/lib/format";
import { buildPortfolioView } from "@/modules/capital/lib/portfolio";
import { getCapitalData } from "@/modules/capital/queries";
import { SpacedReflection } from "@/modules/mind/components/spaced-reflection";
import { pickReflection } from "@/modules/mind/lib/essay";
import { getReflectionCandidates } from "@/modules/mind/queries";

const longDate = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "long",
  timeZone: "Asia/Seoul",
});

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Seoul" }).format(now));
  if (hour < 5) return "늦은 밤이에요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

export default async function Home() {
  const now = new Date();
  const today = todayIn(now);
  const [capital, essays, runs, workouts] = await Promise.all([
    getCapitalData(),
    getReflectionCandidates(),
    getRecentRuns(today, 7),
    getRecentWorkouts(today, 1),
  ]);

  const portfolio = buildPortfolioView(capital.rows, capital.usdKrwRate);
  const todayWorkout = summarizeWorkouts(workouts.filter((w) => w.date === today));

  return (
    <>
      <PageHeader eyebrow={longDate.format(now)} title={greeting(now)} description="오늘의 자본 · 사유 · 신체" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpacedReflection pick={pickReflection(essays, now, today)} />
        </div>

        <ModuleCard href="/capital" title="자본" description="포트폴리오">
          <p className="text-2xl font-semibold tabular-nums">{formatMoney(portfolio.totalValueKrw)}</p>
          <p className="text-muted-foreground text-sm">
            {portfolio.items.length === 0
              ? "자산을 등록하세요"
              : portfolio.outOfBandCount > 0
                ? `밴드 이탈 ${portfolio.outOfBandCount}개 · 리밸런싱 검토`
                : "모든 자산이 허용 밴드 안"}
          </p>
        </ModuleCard>

        <WeeklyMileageCard week={weeklyMileage(runs, today)} today={today} />

        <ModuleCard href="/body" title="오늘의 운동" description="맨몸운동">
          <p className="text-2xl font-semibold tabular-nums">
            {todayWorkout.totalSets}세트 · {todayWorkout.totalReps.toLocaleString("ko-KR")}회
          </p>
          <p className="text-muted-foreground text-sm">
            {todayWorkout.byExercise.length > 0
              ? todayWorkout.byExercise.map((e) => e.exercise).join(", ")
              : "아직 기록이 없습니다"}
          </p>
        </ModuleCard>

        <ModuleCard href="/mind" title="사유" description="에세이">
          <p className="text-2xl font-semibold tabular-nums">{essays.length}편</p>
          <p className="text-muted-foreground text-sm">새 글 쓰기, 원칙 다시 보기</p>
        </ModuleCard>
      </div>
    </>
  );
}

function ModuleCard({
  href,
  title,
  description,
  children,
}: {
  href: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="group">
      <Card className="card-lift h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <ArrowRightIcon className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1">{children}</CardContent>
      </Card>
    </Link>
  );
}
