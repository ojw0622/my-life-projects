import { describe, expect, it } from "vitest";

import { addDays, daysBetween, startOfWeek, todayIn, weekdayLabel } from "../date";

describe("date helpers", () => {
  it("resolves today in Asia/Seoul, not the host time zone", () => {
    // 2026-03-01 16:30 UTC is already 2026-03-02 01:30 in Seoul.
    expect(todayIn(new Date("2026-03-01T16:30:00Z"))).toBe("2026-03-02");
    expect(todayIn(new Date("2026-03-01T14:59:00Z"))).toBe("2026-03-01");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-09-21", "2026-09-27")).toBe(6);
    expect(daysBetween("2026-09-27", "2026-09-21")).toBe(-6);
  });

  it("starts weeks on Monday", () => {
    expect(startOfWeek("2026-09-24")).toBe("2026-09-21"); // Thursday
    expect(startOfWeek("2026-09-21")).toBe("2026-09-21"); // Monday
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21"); // Sunday
  });

  it("labels weekdays in Korean", () => {
    expect(weekdayLabel("2026-09-21")).toBe("월");
    expect(weekdayLabel("2026-09-27")).toBe("일");
  });
});
