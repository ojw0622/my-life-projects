import { z } from "zod";

import { blankToUndefined } from "@/lib/forms";

import { PRINCIPLE_CATEGORIES } from "./constants";
import { parseTags } from "./essay";

export const essayFormSchema = z.object({
  id: z.preprocess(blankToUndefined, z.uuid().optional()),
  title: z.string().trim().min(1, "제목을 입력하세요.").max(200, "제목은 200자 이하여야 합니다."),
  content: z.string().max(100_000, "본문이 너무 깁니다.").default(""),
  tags: z
    .string()
    .default("")
    .transform((v) => parseTags(v)),
});

export const principleFormSchema = z.object({
  category: z.enum(PRINCIPLE_CATEGORIES, { error: "분류를 선택하세요." }),
  rule_text: z.string().trim().min(1, "원칙을 입력하세요.").max(500, "500자 이하로 입력하세요."),
});
