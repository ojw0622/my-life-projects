/**
 * Calendar-date helpers. Dates are ISO strings ("YYYY-MM-DD") matching the
 * Postgres `date` columns; arithmetic runs in UTC so the host time zone
 * never shifts a day.
 */

export const APP_TIME_ZONE = "Asia/Seoul";

const DAY_MS = 86_400_000;

/** Today's date in the app time zone (the dashboard is used from Korea). */
export function todayIn(now: Date = new Date(), timeZone: string = APP_TIME_ZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** Monday of the ISO week containing `date`. */
export function startOfWeek(date: string): string {
  const weekday = new Date(toUtcMs(date)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayLabel(date: string): string {
  return WEEKDAY_LABELS[new Date(toUtcMs(date)).getUTCDay()];
}
