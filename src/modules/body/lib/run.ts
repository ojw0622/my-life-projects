import { addDays, daysBetween, startOfWeek } from "@/lib/date";
import type { Tables } from "@/lib/supabase/database.types";

export type RunRow = Tables<"runs">;

/** Pace in minutes per km, or null when distance is not positive. */
export function paceMinPerKm(distanceKm: number, durationMinutes: number): number | null {
  if (!(distanceKm > 0) || !(durationMinutes > 0)) return null;
  return durationMinutes / distanceKm;
}

/** 5.5 → `5'30"`. Rounds to whole seconds, carrying into minutes. */
export function formatPace(minPerKm: number | null): string {
  if (minPerKm === null || !Number.isFinite(minPerKm) || minPerKm <= 0) return "–";
  const totalSeconds = Math.round(minPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}'${String(seconds).padStart(2, "0")}"`;
}

/**
 * Parses a duration typed by the user into minutes.
 * Accepts "45" or "45.5" (minutes), "45:30" (mm:ss) and "1:05:30" (h:mm:ss).
 * Returns null for anything else or a non-positive result.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim();
  if (text === "") return null;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const minutes = Number(text);
    return minutes > 0 ? minutes : null;
  }

  const parts = text.split(":");
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) return null;

  const numbers = parts.map(Number);
  const [h, m, s] = numbers.length === 3 ? numbers : [0, numbers[0], numbers[1]];
  if (s >= 60 || (numbers.length === 3 && m >= 60)) return null;

  const minutes = h * 60 + m + s / 60;
  return minutes > 0 ? minutes : null;
}

/** 65.5 → "1:05:30", 32.25 → "32:15". */
export function formatDuration(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export interface WeeklyMileage {
  /** Monday of the week. */
  start: string;
  /** Sunday of the week. */
  end: string;
  totalKm: number;
  totalMinutes: number;
  runCount: number;
  /** Distance-weighted pace for the week, or null without runs. */
  avgPace: number | null;
  /** Monday → Sunday. */
  daily: { date: string; km: number }[];
}

/** Sums the runs that fall in the Monday–Sunday week containing `today`. */
export function weeklyMileage(runs: readonly RunRow[], today: string): WeeklyMileage {
  const start = startOfWeek(today);
  const daily = Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), km: 0 }));

  let totalKm = 0;
  let totalMinutes = 0;
  let runCount = 0;

  for (const run of runs) {
    const offset = daysBetween(start, run.date);
    if (offset < 0 || offset > 6) continue;
    const km = Number(run.distance_km);
    daily[offset].km += km;
    totalKm += km;
    totalMinutes += Number(run.duration_minutes);
    runCount += 1;
  }

  return {
    start,
    end: addDays(start, 6),
    totalKm,
    totalMinutes,
    runCount,
    avgPace: paceMinPerKm(totalKm, totalMinutes),
    daily,
  };
}
