import { describe, expect, it } from "vitest";

import { groupByDate, summarizeWorkouts, workoutReps, workoutVolume, type WorkoutRow } from "../workout";

const w = (exercise_type: string, weight: number, reps: number, sets: number, rpe: number | null = null): WorkoutRow => ({
  id: `${exercise_type}-${weight}-${reps}-${sets}`,
  user_id: "u",
  date: "2026-09-25",
  exercise_type,
  weight,
  reps,
  sets,
  rpe,
  created_at: "2026-09-25T00:00:00Z",
});

describe("workoutVolume", () => {
  it("multiplies sets × reps × weight", () => {
    expect(workoutVolume({ weight: 20, reps: 8, sets: 5 })).toBe(800);
  });

  it("is 0 for bodyweight-only sets", () => {
    expect(workoutVolume({ weight: 0, reps: 10, sets: 3 })).toBe(0);
    expect(workoutReps({ weight: 0, reps: 10, sets: 3 })).toBe(30);
  });
});

describe("summarizeWorkouts", () => {
  it("aggregates per exercise and in total", () => {
    const summary = summarizeWorkouts([
      w("풀업", 10, 5, 3, 8),
      w("딥스", 0, 12, 3),
      w("풀업", 20, 3, 2, 9),
    ]);

    expect(summary.byExercise.map((e) => e.exercise)).toEqual(["풀업", "딥스"]);
    const pullUp = summary.byExercise[0];
    expect(pullUp).toMatchObject({ sets: 5, reps: 21, volume: 150 + 120, maxWeight: 20 });
    expect(pullUp.avgRpe).toBeCloseTo((8 * 3 + 9 * 2) / 5);
    expect(summary.byExercise[1].avgRpe).toBeNull();
    expect(summary).toMatchObject({ totalSets: 8, totalReps: 57, totalVolume: 270 });
  });

  it("returns zeros for no workouts", () => {
    expect(summarizeWorkouts([])).toEqual({ totalSets: 0, totalReps: 0, totalVolume: 0, byExercise: [] });
  });
});

describe("groupByDate", () => {
  it("groups rows by date in first-seen order", () => {
    const rows = [{ date: "2026-09-25", n: 1 }, { date: "2026-09-24", n: 2 }, { date: "2026-09-25", n: 3 }];
    expect(groupByDate(rows)).toEqual([
      { date: "2026-09-25", rows: [rows[0], rows[2]] },
      { date: "2026-09-24", rows: [rows[1]] },
    ]);
  });
});
