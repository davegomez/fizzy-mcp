import { marked } from "marked";
import TurndownService from "turndown";

// Fizzy API stores content as HTML; we convert markdown for LLM-friendly I/O
const turndown = new TurndownService({
	headingStyle: "atx",
	bulletListMarker: "-",
	codeBlockStyle: "fenced",
});

export function markdownToHtml(md: string): string {
	if (!md) return "";
	return marked.parse(md, { async: false }) as string;
}

export function htmlToMarkdown(html: string): string {
	if (!html) return "";
	return turndown.turndown(html);
}
