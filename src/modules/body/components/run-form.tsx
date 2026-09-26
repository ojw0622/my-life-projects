"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { fieldValue, initialActionState, type ActionState } from "@/lib/forms";

import { addRun } from "../actions";
import { formatPace, paceMinPerKm, parseDuration } from "../lib/run";

export function RunForm({ today }: { today: string }) {
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await addRun(prev, formData);
    if (result.ok) {
      setDistance("");
      setDuration("");
    }
    return result;
  }, initialActionState);
  const e = state.fieldErrors ?? {};

  const minutes = parseDuration(duration);
  const pace = minutes === null ? null : paceMinPerKm(Number(distance), minutes);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormField id="r-distance" label="거리 (km)" error={e.distance_km}>
          <Input
            name="distance_km"
            inputMode="decimal"
            value={distance}
            onChange={(ev) => setDistance(ev.target.value)}
            placeholder="5.0"
            required
          />
        </FormField>
        <FormField id="r-duration" label="시간" error={e.duration} hint="45 · 45:30 · 1:05:30">
          <Input
            name="duration"
            value={duration}
            onChange={(ev) => setDuration(ev.target.value)}
            placeholder="28:30"
            required
          />
        </FormField>
        <FormField id="r-hr" label="평균 심박" error={e.avg_heart_rate}>
          <Input name="avg_heart_rate" inputMode="numeric" placeholder="150" defaultValue={fieldValue(state, "avg_heart_rate")} />
        </FormField>
        <FormField id="r-date" label="날짜" error={e.date}>
          <Input name="date" type="date" defaultValue={fieldValue(state, "date", today)} required />
        </FormField>
      </div>
      <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-3">
        <p className="text-sm">
          평균 페이스 <strong className="tabular-nums">{formatPace(pace)}</strong>
          <span className="text-muted-foreground"> /km</span>
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
