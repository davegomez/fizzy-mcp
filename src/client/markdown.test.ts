import { describe, expect, test } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./markdown.js";

describe("markdownToHtml", () => {
	test("should convert headers", () => {
		expect(markdownToHtml("# Heading 1")).toBe("<h1>Heading 1</h1>\n");
		expect(markdownToHtml("## Heading 2")).toBe("<h2>Heading 2</h2>\n");
	});

	test("should convert bold and italic", () => {
		expect(markdownToHtml("**bold**")).toBe("<p><strong>bold</strong></p>\n");
		expect(markdownToHtml("*italic*")).toBe("<p><em>italic</em></p>\n");
		expect(markdownToHtml("***bold italic***")).toBe(
			"<p><em><strong>bold italic</strong></em></p>\n",
		);
	});

	test("should convert unordered lists", () => {
		const md = "- item 1\n- item 2";
		const html = markdownToHtml(md);
		expect(html).toContain("<ul>");
		expect(html).toContain("<li>item 1</li>");
		expect(html).toContain("<li>item 2</li>");
	});

	test("should convert ordered lists", () => {
		const md = "1. first\n2. second";
		const html = markdownToHtml(md);
		expect(html).toContain("<ol>");
		expect(html).toContain("<li>first</li>");
		expect(html).toContain("<li>second</li>");
	});

	test("should convert inline code", () => {
		expect(markdownToHtml("`code`")).toBe("<p><code>code</code></p>\n");
	});

	test("should convert fenced code blocks", () => {
		const md = "```javascript\nconst x = 1;\n```";
		const html = markdownToHtml(md);
		expect(html).toContain("<pre>");
		expect(html).toContain("<code");
		expect(html).toContain("const x = 1;");
	});

	test("should convert links", () => {
		expect(markdownToHtml("[text](https://example.com)")).toBe(
			'<p><a href="https://example.com">text</a></p>\n',
		);
	});

	test("should convert images", () => {
		const html = markdownToHtml("![alt](https://example.com/img.png)");
		expect(html).toContain('<img src="https://example.com/img.png"');
		expect(html).toContain('alt="alt"');
	});

	test("should return empty string for empty input", () => {
		expect(markdownToHtml("")).toBe("");
	});
});

describe("htmlToMarkdown", () => {
	test("should convert headers", () => {
		expect(htmlToMarkdown("<h1>Heading 1</h1>")).toBe("# Heading 1");
		expect(htmlToMarkdown("<h2>Heading 2</h2>")).toBe("## Heading 2");
	});

	test("should convert bold and italic", () => {
		expect(htmlToMarkdown("<strong>bold</strong>")).toBe("**bold**");
		expect(htmlToMarkdown("<em>italic</em>")).toBe("_italic_");
	});

	test("should convert unordered lists", () => {
		const html = "<ul><li>item 1</li><li>item 2</li></ul>";
		const md = htmlToMarkdown(html);
		expect(md).toContain("-   item 1");
		expect(md).toContain("-   item 2");
	});

	test("should convert ordered lists", () => {
		const html = "<ol><li>first</li><li>second</li></ol>";
		const md = htmlToMarkdown(html);
		expect(md).toContain("1.  first");
		expect(md).toContain("2.  second");
	});

	test("should convert inline code", () => {
		expect(htmlToMarkdown("<code>code</code>")).toBe("`code`");
	});

	test("should convert code blocks", () => {
		const html = "<pre><code>const x = 1;</code></pre>";
		const md = htmlToMarkdown(html);
		expect(md).toContain("```");
		expect(md).toContain("const x = 1;");
	});

	test("should convert links", () => {
		expect(htmlToMarkdown('<a href="https://example.com">text</a>')).toBe(
			"[text](https://example.com)",
		);
	});

	test("should convert images", () => {
		const md = htmlToMarkdown(
			'<img src="https://example.com/img.png" alt="alt">',
		);
		expect(md).toBe("![alt](https://example.com/img.png)");
	});

	test("should return empty string for empty input", () => {
		expect(htmlToMarkdown("")).toBe("");
	});

	test("should preserve HTML entities", () => {
		const html = "<p>a &amp; b &lt; c &gt; d</p>";
		const md = htmlToMarkdown(html);
		expect(md).toContain("&");
		expect(md).toContain("<");
		expect(md).toContain(">");
	});
});

describe("roundtrip conversion", () => {
	test("should preserve basic formatting through roundtrip", () => {
		const original = "# Title\n\nSome **bold** and *italic* text.";
		const html = markdownToHtml(original);
		const backToMd = htmlToMarkdown(html);
		expect(backToMd).toContain("Title");
		expect(backToMd).toContain("**bold**");
	});
});
