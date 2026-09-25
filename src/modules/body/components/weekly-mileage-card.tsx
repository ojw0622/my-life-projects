import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { weekdayLabel } from "@/lib/date";
import { cn } from "@/lib/utils";

import { formatDuration, formatPace, type WeeklyMileage } from "../lib/run";

const km = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

/** This week's distance, with a Monday→Sunday bar per day. */
export function WeeklyMileageCard({ week, today }: { week: WeeklyMileage; today: string }) {
  const max = Math.max(...week.daily.map((d) => d.km), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>주간 마일리지</CardTitle>
        <CardDescription>
          {week.start.slice(5).replace("-", "/")} – {week.end.slice(5).replace("-", "/")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums">{km(week.totalKm)}</span>
          <span className="text-muted-foreground">km</span>
        </div>
        <dl className="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt>러닝</dt>
            <dd className="text-foreground text-sm tabular-nums">{week.runCount}회</dd>
          </div>
          <div>
            <dt>시간</dt>
            <dd className="text-foreground text-sm tabular-nums">{week.runCount ? formatDuration(week.totalMinutes) : "–"}</dd>
          </div>
          <div>
            <dt>평균 페이스</dt>
            <dd className="text-foreground text-sm tabular-nums">{formatPace(week.avgPace)}</dd>
          </div>
        </dl>
        <ol className="grid h-28 grid-cols-7 items-end gap-2" aria-label="요일별 거리">
          {week.daily.map((day) => (
            <li key={day.date} className="flex h-full flex-col items-center justify-end gap-1" title={`${day.date} ${km(day.km)}km`}>
              <span className="text-muted-foreground text-[10px] tabular-nums">{day.km > 0 ? km(day.km) : ""}</span>
              <span
                className={cn("w-full max-w-6 rounded-t", day.km > 0 ? "bg-series-1" : "bg-muted")}
                style={{ height: day.km > 0 ? `${Math.max(6, (day.km / max) * 72)}px` : "2px" }}
                aria-hidden
              />
              <span className={cn("text-xs", day.date === today ? "text-foreground font-semibold" : "text-muted-foreground")}>
                {weekdayLabel(day.date)}
              </span>
              <span className="sr-only">{km(day.km)}km</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
