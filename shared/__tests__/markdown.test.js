// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from "vitest";
import { buildMarkdown, normalizeTitle, applyTitleTemplate } from "../markdown.js";
import { CLIP_STYLES, MAX_TITLE_LENGTH } from "../constants.js";

describe("markdown", () => {
  it("normalizes titles by trimming whitespace", () => {
    expect(normalizeTitle("  Hello  ")).toBe("Hello");
  });

  it("builds Title + URL markdown per spec", () => {
    const markdown = buildMarkdown({
      title: "Example Page",
      url: "https://example.com",
      clipStyle: CLIP_STYLES.TITLE_URL
    });

    expect(markdown).toBe("### Example Page\nhttps://example.com\n");
  });

  it("builds excerpt markdown with a title header", () => {
    const markdown = buildMarkdown({
      title: "Example Page",
      url: "https://example.com",
      clipStyle: CLIP_STYLES.EXCERPT,
      excerpt: "Line 1\nLine 2"
    });

    expect(markdown).toBe(
      "### Example Page\nhttps://example.com\n\nLine 1\nLine 2\n\nhttps://example.com"
    );
  });

  it("builds full text markdown with separators", () => {
    const markdown = buildMarkdown({
      title: "Example Page",
      url: "https://example.com",
      clipStyle: CLIP_STYLES.FULL_TEXT,
      fullText: "Full text"
    });

    expect(markdown).toBe(
      "### Example Page\nhttps://example.com\n\n---\n\nFull text\n\n---\n\nhttps://example.com"
    );
  });

  it("uses custom templates with selection placeholders", () => {
    const markdown = buildMarkdown({
      title: "Example Page",
      url: "https://example.com",
      clipStyle: CLIP_STYLES.TITLE_URL,
      selectionText: "First line\nSecond line",
      templates: {
        titleUrl: "## {{ title }}\n{{url}}\n\n{{text-selection-markdown}}\n"
      }
    });

    expect(markdown).toBe(
      "## Example Page\nhttps://example.com\n\nFirst line\nSecond line\n"
    );
  });
});

describe("applyTitleTemplate truncation", () => {
  it("truncates title after applying default template", () => {
    const longTitle = "A".repeat(255);
    const result = applyTitleTemplate(null, longTitle);
    
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(result).toMatch(/^Clip: A+$/);
  });

  it("truncates title after applying custom template", () => {
    const longTitle = "B".repeat(255);
    const template = "Custom Prefix: {{title}}";
    const result = applyTitleTemplate(template, longTitle);
    
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(result).toMatch(/^Custom Prefix: B+$/);
  });

  it("does not truncate short titles with template", () => {
    const shortTitle = "Short";
    const result = applyTitleTemplate(null, shortTitle);
    
    expect(result).toBe("Clip: Short");
    expect(result.length).toBeLessThan(MAX_TITLE_LENGTH);
  });

  it("truncates title with datetime template", () => {
    const longTitle = "C".repeat(255);
    const template = "{{datetime}} - {{title}}";
    const result = applyTitleTemplate(template, longTitle);
    
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC - C+$/);
  });

  it("truncates title when template is just {{title}}", () => {
    const longTitle = "D".repeat(300);
    const template = "{{title}}";
    const result = applyTitleTemplate(template, longTitle);
    
    expect(result.length).toBe(MAX_TITLE_LENGTH);
    expect(result).toBe("D".repeat(MAX_TITLE_LENGTH));
  });
});
