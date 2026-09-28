export interface ProjectionInput {
  /** Portfolio value today (KRW). */
  current: number;
  /** Money added every month (KRW). */
  monthly: number;
  /** Expected yearly return as a fraction (0.06 = 6%). */
  annualReturn: number;
  goal: number;
  today: string;
  /** Target date (YYYY-MM-DD), optional. */
  goalDate?: string | null;
  /** Longest horizon to simulate. */
  maxYears?: number;
}

export interface ProjectionPoint {
  /** "2027-03" */
  month: string;
  value: number;
  /** Money put in so far (current value + contributions). */
  contributed: number;
}

export interface Projection {
  series: ProjectionPoint[];
  /** First month the goal is reached, or null within the horizon. */
  reachMonth: string | null;
  /** Monthly amount needed to reach the goal by goalDate, or null without one. */
  requiredMonthly: number | null;
  /** Months between today and goalDate. */
  monthsToGoalDate: number | null;
}

export const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

/** Whole months from today's month to the date's month (≥ 0). */
export function monthsUntil(today: string, date: string): number {
  const [y1, m1] = today.split("-").map(Number);
  const [y2, m2] = date.split("-").map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1));
}

/** Month string `n` months after `today`'s month ("2026-09-28", 5 → "2027-02"). */
export function addMonths(today: string, n: number): string {
  const [y, m] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/**
 * Simulates month-end compounding: value grows by the monthly rate, then
 * the contribution is added. Runs until the goal (and goal date, if any)
 * is passed, capped at `maxYears`.
 */
export function projectGoal(input: ProjectionInput): Projection {
  const { current, monthly, annualReturn, goal, today, goalDate } = input;
  const maxMonths = (input.maxYears ?? 40) * 12;
  const r = monthlyRate(annualReturn);
  const monthsToGoalDate = goalDate ? monthsUntil(today, goalDate) : null;

  const series: ProjectionPoint[] = [{ month: today.slice(0, 7), value: current, contributed: current }];
  let value = current;
  let contributed = current;
  let reachMonth: string | null = current >= goal ? today.slice(0, 7) : null;
  const horizon = Math.max(monthsToGoalDate ?? 0, 12);

  for (let n = 1; n <= maxMonths; n++) {
    value = value * (1 + r) + monthly;
    contributed += monthly;
    const month = addMonths(today, n);
    series.push({ month, value, contributed });
    if (reachMonth === null && value >= goal) reachMonth = month;
    // Show a little past the later of the goal date and the month it is reached.
    if (reachMonth !== null && n >= horizon && n >= monthsUntil(today, `${reachMonth}-01`) + 6) break;
  }

  return {
    series,
    reachMonth,
    requiredMonthly: monthsToGoalDate === null ? null : requiredMonthly(current, goal, r, monthsToGoalDate),
    monthsToGoalDate,
  };
}

/** Monthly contribution that reaches `goal` in `months` at monthly rate `r`. */
export function requiredMonthly(current: number, goal: number, r: number, months: number): number {
  if (months <= 0) return Math.max(0, goal - current);
  const growth = Math.pow(1 + r, months);
  const gap = goal - current * growth;
  if (gap <= 0) return 0;
  return Math.abs(r) < 1e-12 ? gap / months : (gap * r) / (growth - 1);
}
