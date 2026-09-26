import type { Tables } from "@/lib/supabase/database.types";

export type WorkoutRow = Tables<"workouts">;

export const EXERCISE_PRESETS = ["풀업", "딥스", "스쿼트", "푸시업", "친업", "피스톨 스쿼트", "플랭크"];

export interface SetInput {
  weight: number;
  reps: number;
  sets: number;
}

/** Load volume in kg: sets × reps × added weight. Bodyweight-only sets are 0. */
export function workoutVolume({ weight, reps, sets }: SetInput): number {
  return Math.max(0, weight) * reps * sets;
}

export function workoutReps({ reps, sets }: SetInput): number {
  return reps * sets;
}

export interface ExerciseSummary {
  exercise: string;
  sets: number;
  reps: number;
  volume: number;
  maxWeight: number;
  /** Mean RPE over entries that recorded one, weighted by set count. */
  avgRpe: number | null;
}

export interface WorkoutSummary {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  byExercise: ExerciseSummary[];
}

/** Totals per exercise, in first-seen order, plus grand totals. */
export function summarizeWorkouts(rows: readonly WorkoutRow[]): WorkoutSummary {
  const map = new Map<string, ExerciseSummary & { rpeSets: number; rpeSum: number }>();

  for (const row of rows) {
    const input = { weight: Number(row.weight), reps: row.reps, sets: row.sets };
    const entry =
      map.get(row.exercise_type) ??
      { exercise: row.exercise_type, sets: 0, reps: 0, volume: 0, maxWeight: 0, avgRpe: null, rpeSets: 0, rpeSum: 0 };

    entry.sets += row.sets;
    entry.reps += workoutReps(input);
    entry.volume += workoutVolume(input);
    entry.maxWeight = Math.max(entry.maxWeight, input.weight);
    if (row.rpe !== null) {
      entry.rpeSets += row.sets;
      entry.rpeSum += Number(row.rpe) * row.sets;
    }
    map.set(row.exercise_type, entry);
  }

  const byExercise = [...map.values()].map(({ rpeSets, rpeSum, ...rest }) => ({
    ...rest,
    avgRpe: rpeSets > 0 ? rpeSum / rpeSets : null,
  }));

  return {
    totalSets: byExercise.reduce((s, e) => s + e.sets, 0),
    totalReps: byExercise.reduce((s, e) => s + e.reps, 0),
    totalVolume: byExercise.reduce((s, e) => s + e.volume, 0),
    byExercise,
  };
}

/** Groups rows by date, preserving the input order of dates and rows. */
export function groupByDate<T extends { date: string }>(rows: readonly T[]): { date: string; rows: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(row.date);
    if (list) list.push(row);
    else groups.set(row.date, [row]);
  }
  return [...groups].map(([date, list]) => ({ date, rows: list }));
}
