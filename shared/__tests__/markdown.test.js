// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from "vitest";
import { buildMarkdown, normalizeTitle } from "../markdown.js";
import { CLIP_STYLES } from "../constants.js";

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
