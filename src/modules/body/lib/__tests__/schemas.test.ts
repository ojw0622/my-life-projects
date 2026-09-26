import { describe, expect, it } from "vitest";

import { runFormSchema, workoutFormSchema } from "../schemas";

describe("workoutFormSchema", () => {
  it("defaults blank weight to bodyweight and blank RPE to none", () => {
    expect(
      workoutFormSchema.parse({ date: "2026-09-25", exercise_type: "풀업", weight: "", reps: "8", sets: "5", rpe: "" }),
    ).toEqual({ date: "2026-09-25", exercise_type: "풀업", weight: 0, reps: 8, sets: 5, rpe: undefined });
  });

  it("accepts half-step RPE and rejects anything else", () => {
    const base = { date: "2026-09-25", exercise_type: "딥스", reps: "10", sets: "3" };
    expect(workoutFormSchema.parse({ ...base, rpe: "8.5" }).rpe).toBe(8.5);
    expect(workoutFormSchema.safeParse({ ...base, rpe: "8.3" }).success).toBe(false);
    expect(workoutFormSchema.safeParse({ ...base, rpe: "11" }).success).toBe(false);
    expect(workoutFormSchema.safeParse({ ...base, reps: "2.5" }).success).toBe(false);
  });
});

describe("runFormSchema", () => {
  it("parses a h:mm:ss duration into minutes", () => {
    expect(
      runFormSchema.parse({ date: "2026-09-25", distance_km: "10", duration: "0:52:30", avg_heart_rate: "" }),
    ).toEqual({ date: "2026-09-25", distance_km: 10, duration: 52.5, avg_heart_rate: undefined });
  });

  it("reports an unparseable duration on the duration field", () => {
    const result = runFormSchema.safeParse({ date: "2026-09-25", distance_km: "5", duration: "half an hour" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["duration"]);
  });
});
