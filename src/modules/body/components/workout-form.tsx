"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { initialActionState, type ActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { addWorkout } from "../actions";
import { EXERCISE_PRESETS, workoutReps, workoutVolume } from "../lib/workout";

const toNumber = (text: string) => (text.trim() === "" ? 0 : Number(text));

/**
 * Quick entry: pick an exercise, adjust numbers, submit. Values are kept
 * after saving so the next identical set is one tap away.
 */
export function WorkoutForm({ today }: { today: string }) {
  const [exercise, setExercise] = useState(EXERCISE_PRESETS[0]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("8");
  const [sets, setSets] = useState("3");
  const [rpe, setRpe] = useState("");
  const [date, setDate] = useState(today);
  const [state, action, pending] = useActionState(
    (prev: ActionState, formData: FormData) => addWorkout(prev, formData),
    initialActionState,
  );
  const e = state.fieldErrors ?? {};

  const input = { weight: toNumber(weight), reps: toNumber(reps), sets: toNumber(sets) };
  const valid = [input.weight, input.reps, input.sets].every(Number.isFinite);
  const volume = valid ? workoutVolume(input) : 0;
  const totalReps = valid ? workoutReps(input) : 0;

  return (
    <form action={action} className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">종목</legend>
        <div className="flex flex-wrap gap-1.5">
          {EXERCISE_PRESETS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={exercise === name}
              onClick={() => setExercise(name)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                exercise === name ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-accent",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <Input
          name="exercise_type"
          aria-label="종목 직접 입력"
          value={exercise}
          onChange={(ev) => setExercise(ev.target.value)}
          maxLength={50}
          required
          aria-invalid={e.exercise_type ? true : undefined}
        />
        {e.exercise_type ? <p className="text-destructive text-xs">{e.exercise_type}</p> : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FormField id="w-weight" label="추가 중량 (kg)" error={e.weight} hint="맨몸은 비워두기">
          <Input name="weight" inputMode="decimal" value={weight} onChange={(ev) => setWeight(ev.target.value)} placeholder="0" />
        </FormField>
        <FormField id="w-reps" label="횟수" error={e.reps}>
          <Input name="reps" inputMode="numeric" value={reps} onChange={(ev) => setReps(ev.target.value)} required />
        </FormField>
        <FormField id="w-sets" label="세트" error={e.sets}>
          <Input name="sets" inputMode="numeric" value={sets} onChange={(ev) => setSets(ev.target.value)} required />
        </FormField>
        <FormField id="w-rpe" label="RPE (1–10)" error={e.rpe}>
          <Input name="rpe" inputMode="decimal" value={rpe} onChange={(ev) => setRpe(ev.target.value)} placeholder="8" />
        </FormField>
        <FormField id="w-date" label="날짜" error={e.date}>
          <Input name="date" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} required />
        </FormField>
      </div>

      <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-3">
        <p className="text-sm">
          총 <strong className="tabular-nums">{totalReps.toLocaleString("ko-KR")}회</strong>
          {" · "}볼륨 <strong className="tabular-nums">{volume.toLocaleString("ko-KR")}kg</strong>
          <span className="text-muted-foreground"> (세트 × 횟수 × 추가 중량)</span>
        </p>
        <div className="flex items-center gap-3">
          {state.message ? (
            <span role="status" className={state.ok ? "text-muted-foreground text-sm" : "text-destructive text-sm"}>
              {state.message}
            </span>
          ) : null}
          <Button type="submit" disabled={pending}>
            기록
          </Button>
        </div>
      </div>
    </form>
  );
}
