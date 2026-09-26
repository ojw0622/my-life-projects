import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders Markdown (GFM: tables, task lists, strikethrough). Raw HTML in the
 * source is not rendered, so user content cannot inject markup or scripts.
 */
export function MarkdownView({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("prose prose-neutral dark:prose-invert max-w-none break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
