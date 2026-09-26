import { describe, expect, it } from "vitest";

import { formatDuration, formatPace, paceMinPerKm, parseDuration, weeklyMileage, type RunRow } from "../run";

const run = (date: string, distance_km: number, duration_minutes: number): RunRow => ({
  id: `${date}-${distance_km}`,
  user_id: "u",
  date,
  distance_km,
  duration_minutes,
  avg_pace: duration_minutes / distance_km,
  avg_heart_rate: null,
  created_at: `${date}T00:00:00Z`,
});

describe("pace", () => {
  it("computes minutes per km", () => {
    expect(paceMinPerKm(10, 55)).toBe(5.5);
    expect(paceMinPerKm(0, 30)).toBeNull();
  });

  it("formats pace as m'ss\" and carries rounded seconds", () => {
    expect(formatPace(5.5)).toBe(`5'30"`);
    expect(formatPace(4.9999)).toBe(`5'00"`);
    expect(formatPace(null)).toBe("–");
  });
});

describe("parseDuration", () => {
  it.each([
    ["45", 45],
    ["45.5", 45.5],
    ["45:30", 45.5],
    ["1:05:30", 65.5],
    ["0:00:30", 0.5],
  ])("parses %s", (input, minutes) => {
    expect(parseDuration(input)).toBeCloseTo(minutes);
  });

  it.each(["", "abc", "0", "45:75", "1:75:00", "1:2:3:4", "-5", "12:"])("rejects %j", (input) => {
    expect(parseDuration(input)).toBeNull();
  });

  it("round-trips through formatDuration", () => {
    expect(formatDuration(65.5)).toBe("1:05:30");
    expect(formatDuration(32.25)).toBe("32:15");
  });
});

describe("weeklyMileage", () => {
  const today = "2026-09-24"; // Thursday; week is 09-21 (Mon) … 09-27 (Sun)

  it("sums only runs in the current Monday–Sunday week", () => {
    const summary = weeklyMileage(
      [
        run("2026-09-20", 10, 60), // previous Sunday
        run("2026-09-21", 5, 30),
        run("2026-09-23", 8, 40),
        run("2026-09-23", 2, 12),
        run("2026-09-27", 12, 66), // later this week still counts
        run("2026-09-28", 21, 120), // next Monday
      ],
      today,
    );

    expect(summary).toMatchObject({ start: "2026-09-21", end: "2026-09-27", runCount: 4 });
    expect(summary.totalKm).toBe(27);
    expect(summary.daily.map((d) => d.km)).toEqual([5, 0, 10, 0, 0, 0, 12]);
    expect(summary.avgPace).toBeCloseTo(148 / 27);
  });

  it("returns an empty week without runs", () => {
    const summary = weeklyMileage([], today);
    expect(summary.totalKm).toBe(0);
    expect(summary.avgPace).toBeNull();
    expect(summary.daily).toHaveLength(7);
  });
});
