"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { saveEssay } from "../actions";
import { parseTags, type EssayRow } from "../lib/essay";
import { essayStats, toEditorHtml } from "../lib/essay-content";
import { RichEditor } from "./rich-editor";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: "Asia/Seoul" });

export function EssayEditor({ essay, actions }: { essay?: EssayRow; actions?: React.ReactNode }) {
  const initialHtml = useMemo(() => toEditorHtml(essay?.content ?? ""), [essay?.content]);
  const [title, setTitle] = useState(essay?.title ?? "");
  const [tags, setTags] = useState<string[]>(essay?.tags ?? []);
  const [html, setHtml] = useState(initialHtml);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(() => snapshot(essay?.title ?? "", essay?.tags ?? [], initialHtml));
  const [result, setResult] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  const dirty = snapshot(title, tags, html) !== saved;
  const stats = essayStats(text);

  function save() {
    if (pending) return;
    const formData = new FormData();
    if (essay) formData.set("id", essay.id);
    formData.set("title", title);
    formData.set("content", html);
    formData.set("tags", tags.join(","));
    const current = snapshot(title, tags, html);
    startTransition(async () => {
      const next = await saveEssay(initialActionState, formData);
      setResult(next);
      if (next.ok) setSaved(current);
    });
  }

  // Ctrl/Cmd+S saves; leaving with unsaved changes asks first.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const titleError = result.fieldErrors?.title;
  const status = pending
    ? "저장 중…"
    : !result.ok && result.message
      ? result.message
      : dirty
        ? "저장하지 않은 변경 사항"
        : essay || result.ok
          ? "모두 저장됨"
          : "";

  return (
    <article className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/mind"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" /> 사유
        </Link>
        <div className="flex items-center gap-2">
          <span
            role="status"
            className={cn(
              "text-xs transition-colors",
              !result.ok && result.message ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {status}
          </span>
          {actions}
          <Button size="sm" onClick={save} disabled={pending || (!dirty && !!essay)}>
            저장
          </Button>
        </div>
      </div>

      <header className="grid gap-3">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="제목 없음"
          aria-label="제목"
          aria-invalid={titleError ? true : undefined}
          rows={1}
          maxLength={200}
          className="field-sizing-content font-serif placeholder:text-muted-foreground/50 w-full resize-none bg-transparent text-3xl leading-tight font-semibold tracking-tight outline-none sm:text-4xl"
        />
        {titleError ? <p className="text-destructive text-sm">{titleError}</p> : null}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span>{dateFormat.format(essay ? new Date(essay.created_at) : new Date())}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {stats.characters.toLocaleString("ko-KR")}자{stats.minutes > 0 ? ` · 약 ${stats.minutes}분` : ""}
          </span>
          <span aria-hidden>·</span>
          <TagInput tags={tags} onChange={setTags} />
        </div>
      </header>

      <RichEditor
        initialHtml={initialHtml}
        onReady={(change) => {
          setHtml(change.html);
          setText(change.text);
          setSaved(snapshot(title, tags, change.html));
        }}
        onChange={(change) => {
          setHtml(change.html);
          setText(change.text);
        }}
      />

      <p className="text-muted-foreground/80 border-t pt-4 text-xs leading-relaxed">
        빠르게 쓰기: <Kbd># </Kbd> 제목 · <Kbd>- </Kbd> 목록 · <Kbd>[] </Kbd> 체크리스트 · <Kbd>&gt; </Kbd> 인용 ·{" "}
        <Kbd>==글자==</Kbd> 형광펜 · 글자를 드래그하면 서식 메뉴 · <Kbd>Ctrl+S</Kbd> 저장
      </p>
    </article>
  );
}

function snapshot(title: string, tags: string[], html: string): string {
  return JSON.stringify([title.trim(), tags, html]);
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function commit(value: string) {
    const next = parseTags([...tags, value].join(","));
    if (next.length !== tags.length) onChange(next);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs"
        >
          #{tag}
          <button
            type="button"
            aria-label={`${tag} 태그 삭제`}
            className="hover:bg-foreground/10 rounded-full p-0.5"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) commit(v.slice(0, -1));
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={tags.length === 0 ? "+ 태그 추가" : "+"}
        aria-label="태그 추가 (Enter)"
        className="placeholder:text-muted-foreground/70 w-24 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="bg-muted rounded px-1 py-px font-mono text-[11px]">{children}</kbd>;
}
