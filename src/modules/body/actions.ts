"use server";

import { revalidatePath } from "next/cache";

import { failWith, parseForm, type ActionState } from "@/lib/forms";
import { requireUser } from "@/lib/supabase/auth";
import { dbErrorState } from "@/lib/supabase/errors";

import { runFormSchema, workoutFormSchema } from "./lib/schemas";

function revalidate() {
  revalidatePath("/body");
  revalidatePath("/");
}

export async function addWorkout(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(workoutFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("workouts")
    .insert({ ...parsed.data, rpe: parsed.data.rpe ?? null, user_id: user.id });
  if (error) return failWith(dbErrorState(error), formData);

  revalidate();
  return { ok: true, message: `${parsed.data.exercise_type} 기록 완료` };
}

export async function deleteWorkout(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw new Error("운동 기록을 삭제하지 못했습니다.");
  revalidate();
}

export async function addRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(runFormSchema, formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user } = await requireUser();
  const { date, distance_km, duration, avg_heart_rate } = parsed.data;
  const { error } = await supabase.from("runs").insert({
    user_id: user.id,
    date,
    distance_km,
    duration_minutes: Math.round(duration * 100) / 100,
    avg_heart_rate: avg_heart_rate ?? null,
  });
  if (error) return failWith(dbErrorState(error), formData);

  revalidate();
  return { ok: true, message: `${distance_km}km 기록 완료` };
}

export async function deleteRun(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("runs").delete().eq("id", id);
  if (error) throw new Error("러닝 기록을 삭제하지 못했습니다.");
  revalidate();
}
