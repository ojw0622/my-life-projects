"use client";

import { useState } from "react";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  CodeIcon,
  HighlighterIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Soft highlighter colors; `label` is shown in tooltips. */
export const HIGHLIGHTS = [
  { color: "#fdf0b0", label: "노랑" },
  { color: "#d6f0de", label: "초록" },
  { color: "#fbdbe3", label: "분홍" },
  { color: "#d9e6fb", label: "파랑" },
] as const;

const BLOCKS = [
  { value: "p", label: "본문" },
  { value: "h1", label: "큰 제목" },
  { value: "h2", label: "중간 제목" },
  { value: "h3", label: "작은 제목" },
] as const;

export interface EditorChange {
  html: string;
  text: string;
}

export function RichEditor({
  initialHtml,
  onReady,
  onChange,
}: {
  initialHtml: string;
  /** Called once with the editor's normalized content (the "saved" baseline). */
  onReady: (change: EditorChange) => void;
  onChange: (change: EditorChange) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "여기에 생각을 적어 보세요…" }),
      CharacterCount,
    ],
    content: initialHtml,
    editorProps: {
      attributes: { class: "essay-prose", "aria-label": "본문", spellcheck: "false" },
    },
    onCreate: ({ editor }) => onReady({ html: editor.getHTML(), text: editor.getText() }),
    onUpdate: ({ editor }) => onChange({ html: editor.getHTML(), text: editor.getText() }),
  });

  if (!editor) {
    return <div className="essay-prose text-muted-foreground min-h-[50vh]">불러오는 중…</div>;
  }

  return (
    <div className="grid gap-4">
      <Toolbar editor={editor} />
      <SelectionMenu editor={editor} />
      <EditorContent editor={editor} className="min-h-[50vh]" />
    </div>
  );
}

function useActiveState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "p",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      highlightColor: (e.getAttributes("highlight").color as string | undefined) ?? null,
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useActiveState(editor);
  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="서식"
      className="bg-background/85 sticky top-14 z-20 -mx-2 flex flex-wrap items-center gap-0.5 rounded-xl border px-1.5 py-1 shadow-xs backdrop-blur"
    >
      <select
        aria-label="문단 스타일"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") chain().setParagraph().run();
          else chain().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
        }}
        className="hover:bg-accent h-8 rounded-md bg-transparent px-2 text-sm outline-none"
      >
        {BLOCKS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
      <Divider />
      <ToolButton label="굵게 (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <BoldIcon />
      </ToolButton>
      <ToolButton label="기울임 (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <ItalicIcon />
      </ToolButton>
      <ToolButton label="밑줄 (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolButton>
      <ToolButton label="취소선" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <StrikethroughIcon />
      </ToolButton>
      <HighlightPicker editor={editor} active={s.highlight} current={s.highlightColor} />
      <Divider />
      <ToolButton label="글머리 목록" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <ListIcon />
      </ToolButton>
      <ToolButton label="번호 목록" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrderedIcon />
      </ToolButton>
      <ToolButton label="체크리스트" active={s.task} onClick={() => chain().toggleTaskList().run()}>
        <ListTodoIcon />
      </ToolButton>
      <Divider />
      <ToolButton label="인용" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <QuoteIcon />
      </ToolButton>
      <ToolButton label="코드 블록" active={s.code} onClick={() => chain().toggleCodeBlock().run()}>
        <CodeIcon />
      </ToolButton>
      <ToolButton label="구분선" onClick={() => chain().setHorizontalRule().run()}>
        <MinusIcon />
      </ToolButton>
      <LinkButton editor={editor} active={s.link} />
      <div className="ml-auto flex">
        <ToolButton label="되돌리기 (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          <Undo2Icon />
        </ToolButton>
        <ToolButton label="다시 실행 (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          <Redo2Icon />
        </ToolButton>
      </div>
    </div>
  );
}

/** Small menu that appears above selected text. */
function SelectionMenu({ editor }: { editor: Editor }) {
  const s = useActiveState(editor);
  const chain = () => editor.chain().focus();

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, state }) => !state.selection.empty && !e.isActive("codeBlock")}
      className="bg-popover flex items-center gap-0.5 rounded-lg border p-1 shadow-lg"
    >
      <ToolButton label="굵게" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <BoldIcon />
      </ToolButton>
      <ToolButton label="기울임" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <ItalicIcon />
      </ToolButton>
      <ToolButton label="밑줄" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolButton>
      <ToolButton label="취소선" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <StrikethroughIcon />
      </ToolButton>
      <Divider />
      {HIGHLIGHTS.map((h) => (
        <Swatch
          key={h.color}
          color={h.color}
          label={`형광펜 ${h.label}`}
          active={s.highlightColor === h.color}
          onClick={() =>
            s.highlightColor === h.color
              ? chain().unsetHighlight().run()
              : chain().setHighlight({ color: h.color }).run()
          }
        />
      ))}
      <Divider />
      <LinkButton editor={editor} active={s.link} />
    </BubbleMenu>
  );
}

function HighlightPicker({ editor, active, current }: { editor: Editor; active: boolean; current: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <ToolButton label="형광펜" active={active} onClick={() => setOpen((o) => !o)}>
        <HighlighterIcon />
        <span
          aria-hidden
          className="absolute inset-x-1.5 bottom-1 h-0.5 rounded-full"
          style={{ background: current ?? HIGHLIGHTS[0].color }}
        />
      </ToolButton>
      {open ? (
        <div
          className="bg-popover animate-in fade-in zoom-in-95 absolute top-full left-0 z-30 mt-1 flex items-center gap-1 rounded-lg border p-1.5 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {HIGHLIGHTS.map((h) => (
            <Swatch
              key={h.color}
              color={h.color}
              label={`형광펜 ${h.label}`}
              active={current === h.color}
              onClick={() => {
                editor.chain().focus().setHighlight({ color: h.color }).run();
                setOpen(false);
              }}
            />
          ))}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground px-1.5 text-xs"
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
              setOpen(false);
            }}
          >
            지우기
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LinkButton({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function apply() {
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href === "") chain.unsetLink().run();
    else chain.setLink({ href: /^[a-z]+:/i.test(href) ? href : `https://${href}` }).run();
    setOpen(false);
  }

  return (
    <div className="relative">
      <ToolButton
        label="링크"
        active={active}
        onClick={() => {
          setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
          setOpen((o) => !o);
        }}
      >
        <LinkIcon />
      </ToolButton>
      {open ? (
        <form
          className="bg-popover animate-in fade-in zoom-in-95 absolute top-full right-0 z-30 mt-1 flex w-72 items-center gap-1 rounded-lg border p-1.5 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            placeholder="https://… (비우면 링크 해제)"
            aria-label="링크 주소"
            className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 text-sm outline-none"
          />
          <button type="submit" className="bg-primary text-primary-foreground h-7 rounded-md px-2.5 text-xs">
            적용
          </button>
        </form>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "text-muted-foreground relative inline-flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4",
        "hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35",
        active && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Swatch({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "size-6 rounded-full border border-black/10 transition-transform hover:scale-110",
        active && "ring-foreground/60 ring-2 ring-offset-1",
      )}
      style={{ background: color }}
    />
  );
}

function Divider() {
  return <span aria-hidden className="bg-border mx-1 h-5 w-px" />;
}
