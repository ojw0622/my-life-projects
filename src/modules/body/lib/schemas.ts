import { z } from "zod";

import { blankToUndefined, numberField } from "@/lib/forms";

import { parseDuration } from "./run";

const date = z.iso.date({ error: "날짜를 확인하세요." });

const integer = (label: string, min: number, max: number) =>
  numberField(label).refine((v) => Number.isInteger(v) && v >= min && v <= max, {
    error: `${label}은(는) ${min}~${max} 사이의 정수여야 합니다.`,
  });

export const workoutFormSchema = z.object({
  date,
  exercise_type: z.string().trim().min(1, "종목을 입력하세요.").max(50),
  weight: z.preprocess(
    blankToUndefined,
    numberField("중량")
      .refine((v) => v >= 0 && v <= 500, { error: "중량은 0~500kg 사이여야 합니다." })
      .default(0),
  ),
  reps: integer("횟수", 1, 1000),
  sets: integer("세트", 1, 100),
  rpe: z.preprocess(
    blankToUndefined,
    numberField("RPE")
      .refine((v) => v >= 1 && v <= 10 && Number.isInteger(v * 2), {
        error: "RPE는 1~10 사이(0.5 단위)여야 합니다.",
      })
      .optional(),
  ),
});

export const runFormSchema = z.object({
  date,
  distance_km: numberField("거리").refine((v) => v > 0 && v <= 500, {
    error: "거리는 0~500km 사이여야 합니다.",
  }),
  duration: z
    .string()
    .transform((v, ctx) => {
      const minutes = parseDuration(v);
      if (minutes === null) {
        ctx.addIssue({ code: "custom", message: "시간은 45, 45:30, 1:05:30 형식으로 입력하세요." });
        return z.NEVER;
      }
      return minutes;
    }),
  avg_heart_rate: z.preprocess(
    blankToUndefined,
    integer("평균 심박", 30, 250).optional(),
  ),
});
