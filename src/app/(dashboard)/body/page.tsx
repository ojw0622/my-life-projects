import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayIn, weekdayLabel } from "@/lib/date";
import { deleteRun, deleteWorkout } from "@/modules/body/actions";
import { RunForm } from "@/modules/body/components/run-form";
import { WeeklyMileageCard } from "@/modules/body/components/weekly-mileage-card";
import { WorkoutForm } from "@/modules/body/components/workout-form";
import { formatDuration, formatPace, weeklyMileage } from "@/modules/body/lib/run";
import { groupByDate, summarizeWorkouts, workoutVolume } from "@/modules/body/lib/workout";
import { getRecentRuns, getRecentWorkouts } from "@/modules/body/queries";

export const metadata = { title: "신체 · My Life Dashboard" };

const n = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

export default async function BodyPage() {
  const today = todayIn();
  const [workouts, runs] = await Promise.all([getRecentWorkouts(today), getRecentRuns(today)]);
  const week = weeklyMileage(runs, today);
  const days = groupByDate(workouts);

  return (
    <>
      <PageHeader eyebrow="Body" title="신체" description="맨몸운동과 러닝" />

      <Card>
        <CardHeader>
          <CardTitle>맨몸운동 기록</CardTitle>
          <CardDescription>종목을 고르고 세트·횟수·RPE만 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutForm today={today} />
        </CardContent>
      </Card>

      <section aria-labelledby="workout-log" className="grid gap-3">
        <h2 id="workout-log" className="text-muted-foreground text-sm font-medium">
          최근 2주
        </h2>
        {days.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            아직 기록이 없습니다.
          </p>
        ) : (
          days.map(({ date, rows }) => {
            const summary = summarizeWorkouts(rows);
            return (
              <Card key={date} className="gap-3 py-4">
                <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2">
                  <CardTitle className="text-base">
                    {date} ({weekdayLabel(date)}){date === today ? " · 오늘" : ""}
                  </CardTitle>
                  <CardDescription className="tabular-nums">
                    {summary.totalSets}세트 · {n(summary.totalReps)}회 · 볼륨 {n(summary.totalVolume)}kg
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y text-sm">
                    {rows.map((w) => (
                      <li key={w.id} className="flex items-center gap-3 py-1.5">
                        <span className="w-28 font-medium">{w.exercise_type}</span>
                        <span className="flex-1 tabular-nums">
                          {Number(w.weight) > 0 ? `+${n(Number(w.weight))}kg × ` : ""}
                          {w.reps}회 × {w.sets}세트
                          {w.rpe !== null ? <span className="text-muted-foreground"> · RPE {n(Number(w.rpe))}</span> : null}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {n(workoutVolume({ weight: Number(w.weight), reps: w.reps, sets: w.sets }))}kg
                        </span>
                        <DeleteButton action={deleteWorkout.bind(null, w.id)} label="운동 기록 삭제" />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <WeeklyMileageCard week={week} today={today} />
        <Card>
          <CardHeader>
            <CardTitle>러닝 기록</CardTitle>
            <CardDescription>페이스는 거리와 시간으로 자동 계산됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <RunForm today={today} />
            {runs.length > 0 ? (
              <ul className="divide-y text-sm">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-muted-foreground w-24 tabular-nums">{r.date}</span>
                    <span className="w-16 font-medium tabular-nums">{n(Number(r.distance_km))}km</span>
                    <span className="flex-1 tabular-nums">
                      {formatDuration(Number(r.duration_minutes))} · {formatPace(Number(r.avg_pace))}/km
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {r.avg_heart_rate ? `${r.avg_heart_rate}bpm` : ""}
                    </span>
                    <DeleteButton action={deleteRun.bind(null, r.id)} label="러닝 기록 삭제" />
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
