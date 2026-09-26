"use client";

import { useActionState, useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldValue, initialActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { saveEssay } from "../actions";
import type { EssayRow } from "../lib/essay";
import { MarkdownView } from "./markdown-view";

type Mode = "split" | "write" | "preview";

export function EssayEditor({ essay }: { essay?: EssayRow }) {
  const [state, action, pending] = useActionState(saveEssay, initialActionState);
  const [content, setContent] = useState(essay?.content ?? "");
  const [mode, setMode] = useState<Mode>("split");
  const preview = useDeferredValue(content);
  const e = state.fieldErrors ?? {};
  const words = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;

  return (
    <form action={action} className="grid gap-4">
      {essay ? <input type="hidden" name="id" value={essay.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <FormField id="title" label="제목" error={e.title}>
          <Input name="title" defaultValue={fieldValue(state, "title", essay?.title)} placeholder="오늘의 생각" required maxLength={200} />
        </FormField>
        <FormField id="tags" label="태그" error={e.tags} hint="쉼표로 구분">
          <Input name="tags" defaultValue={fieldValue(state, "tags", essay?.tags.join(", "))} placeholder="투자, 삶" />
        </FormField>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="편집 모드" className="bg-muted inline-flex rounded-md p-0.5 text-sm">
          {(
            [
              ["split", "나란히"],
              ["write", "쓰기"],
              ["preview", "미리보기"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded px-3 py-1 transition-colors",
                mode === value ? "bg-background shadow-xs" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {content.length.toLocaleString("ko-KR")}자 · {words.toLocaleString("ko-KR")}단어
        </span>
      </div>

      <div className={cn("grid gap-4", mode === "split" && "lg:grid-cols-2")}>
        <div className={cn(mode === "preview" && "hidden")}>
          <label htmlFor="content" className="sr-only">
            본문 (Markdown)
          </label>
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(ev) => setContent(ev.target.value)}
            placeholder={"# 제목\n\n마크다운으로 작성하세요. **굵게**, - 목록, > 인용"}
            className="min-h-[28rem] font-mono text-sm leading-relaxed"
            aria-invalid={e.content ? true : undefined}
          />
          {e.content ? <p className="text-destructive mt-1 text-xs">{e.content}</p> : null}
        </div>
        <div
          aria-label="미리보기"
          className={cn("min-h-[28rem] rounded-md border p-4", mode === "write" && "hidden")}
        >
          {preview.trim() ? (
            <MarkdownView content={preview} />
          ) : (
            <p className="text-muted-foreground text-sm">미리보기가 여기에 표시됩니다.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {state.message ? (
          <p role="status" className={state.ok ? "text-muted-foreground text-sm" : "text-destructive text-sm"}>
            {state.message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </form>
  );
}
