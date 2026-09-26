import { z } from "zod";

import { blankToUndefined, numberField as number } from "@/lib/forms";

import { CATEGORIES, CURRENCIES, DEFAULT_TOLERANCE_BAND } from "./constants";

/** A percentage entered in the UI (e.g. "25") stored as a fraction (0.25). */
const percentAsFraction = (label: string) =>
  number(label)
    .refine((v) => v >= 0 && v <= 100, { error: `${label}은(는) 0~100% 사이여야 합니다.` })
    .transform((v) => Math.round(v * 100) / 10_000);

export const assetFormSchema = z.object({
  id: z.preprocess(blankToUndefined, z.uuid().optional()),
  asset_name: z.string().trim().min(1, "자산명을 입력하세요.").max(100),
  ticker: z.preprocess(
    blankToUndefined,
    z.string().trim().max(20).toUpperCase().optional(),
  ),
  category: z.enum(CATEGORIES, { error: "분류를 선택하세요." }),
  currency: z.enum(CURRENCIES, { error: "통화를 선택하세요." }),
  target_ratio: percentAsFraction("목표 비중"),
  current_qty: number("보유 수량").refine((v) => v >= 0, { error: "보유 수량은 0 이상이어야 합니다." }),
  avg_buy_price: z.preprocess(
    blankToUndefined,
    number("평균 매수가").refine((v) => v >= 0, { error: "평균 매수가는 0 이상이어야 합니다." }).default(0),
  ),
  // May be left blank for auto-priced assets; the live quote fills it in.
  current_price: z.preprocess(
    blankToUndefined,
    number("현재가").refine((v) => v >= 0, { error: "현재가는 0 이상이어야 합니다." }).default(0),
  ),
  tolerance_band: z.preprocess(
    blankToUndefined,
    percentAsFraction("허용 밴드").default(DEFAULT_TOLERANCE_BAND),
  ),
  // Checkbox: present ("on") when ticked.
  auto_price: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  quote_symbol: z.preprocess(
    blankToUndefined,
    z.string().trim().max(30).toUpperCase().optional(),
  ),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const cashFlowFormSchema = z.object({
  amount: number("금액").refine((v) => v > 0, { error: "금액은 0보다 커야 합니다." }),
  flow_type: z.enum(["saving", "dividend"], { error: "유형을 선택하세요." }),
  date: z.iso.date({ error: "날짜를 확인하세요." }),
  asset_id: z.preprocess(blankToUndefined, z.uuid().optional()),
  note: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
});

export const fxRateFormSchema = z.object({
  usd_krw_rate: number("환율").refine((v) => v > 0, { error: "환율은 0보다 커야 합니다." }),
});

export const planFormSchema = z.object({
  id: z.preprocess(blankToUndefined, z.uuid().optional()),
  flow_type: z.enum(["saving", "dividend"], { error: "유형을 선택하세요." }),
  amount: number("금액").refine((v) => v > 0, { error: "금액은 0보다 커야 합니다." }),
  day_of_month: number("입금일").refine((v) => Number.isInteger(v) && v >= 1 && v <= 28, {
    error: "입금일은 1~28일 사이여야 합니다.",
  }),
  asset_id: z.preprocess(blankToUndefined, z.uuid().optional()),
  note: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
});
