import { marked } from "marked";

/**
 * Essays are stored as HTML produced by the rich-text editor. Essays written
 * before the editor existed are Markdown; they are converted when opened
 * and saved back as HTML on the next save.
 */
export function isHtmlContent(content: string): boolean {
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|pre|hr|div)\b/i.test(content);
}

export function toEditorHtml(content: string): string {
  if (content.trim() === "" || isHtmlContent(content)) return content;
  return marked.parse(content, { async: false, gfm: true, breaks: true });
}

/** Characters without whitespace, and minutes to read (~500 Korean chars/min). */
export function essayStats(plainText: string): { characters: number; minutes: number } {
  const characters = plainText.replace(/\s/g, "").length;
  return { characters, minutes: characters === 0 ? 0 : Math.max(1, Math.round(characters / 500)) };
}
