import { addDays, startOfWeek } from "@/lib/date";
import { requireUser } from "@/lib/supabase/auth";
import { unwrap } from "@/lib/supabase/errors";

/** Workouts from the last `days` days, newest first. */
export async function getRecentWorkouts(today: string, days = 14) {
  const { supabase } = await requireUser();
  return unwrap(
    await supabase
      .from("workouts")
      .select("*")
      .gte("date", addDays(today, -(days - 1)))
      .order("date", { ascending: false })
      .order("created_at", { ascending: true }),
    "운동 기록",
  );
}

/** Runs from the start of this week or the last `days` days, whichever is earlier. */
export async function getRecentRuns(today: string, days = 30) {
  const { supabase } = await requireUser();
  const since = [startOfWeek(today), addDays(today, -(days - 1))].sort()[0];
  return unwrap(
    await supabase
      .from("runs")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    "러닝 기록",
  );
}
