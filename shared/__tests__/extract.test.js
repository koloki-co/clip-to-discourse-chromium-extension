// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only
// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildExcerpt, htmlToMarkdown, htmlToMarkdownFullPage, normalizeText } from "../extract.js";

describe("extract", () => {
  it("normalizes whitespace while preserving paragraphs", () => {
    const input = "Line 1\n\n\nLine   2\t\tLine 3";
    expect(normalizeText(input)).toBe("Line 1\n\nLine 2 Line 3");
  });

  it("builds an excerpt with a max length", () => {
    const input = "abcdefghijklmnopqrstuvwxyz";
    expect(buildExcerpt(input, 10)).toBe("abcdefghij");
  });

  if (typeof DOMParser !== "undefined") {
    it("converts basic HTML to markdown", () => {
      const input = "<h2>Title</h2><p>Hello <strong>world</strong>.</p>";
      expect(htmlToMarkdown(input)).toBe("## Title\n\nHello **world**.");
    });

    it("extracts full page content with Readability defaults", () => {
      const input = `
        <html>
          <head><title>Example</title></head>
          <body>
            <nav><a href="/home">Home</a></nav>
            <article>
              <h1>Article Title</h1>
              <p>Hello <strong>world</strong>.</p>
              <p><a href="/docs">Docs</a></p>
            </article>
          </body>
        </html>
      `;

      const markdown = htmlToMarkdownFullPage(input, { baseUrl: "https://example.com" });

      expect(markdown).toContain("# Article Title");
      expect(markdown).toContain("Hello **world**.");
      expect(markdown).toContain("[Docs](https://example.com/docs)");
      expect(markdown).not.toContain("Home");
    });

    it("preserves article body text that mentions chrome phrases", () => {
      const input = `
        <html>
          <body>
            <article>
              <h1>How to design a newsletter</h1>
              <p>Subscribers want a great newsletter, so follow us through this guide.</p>
              <p>Make sure to follow us on every channel for updates.</p>
            </article>
          </body>
        </html>
      `;

      const markdown = htmlToMarkdownFullPage(input, { baseUrl: "https://example.com" });

      // Body paragraphs that merely mention "newsletter" / "follow us" must
      // survive the chrome-phrase pass — only standalone widget-shaped
      // elements should be removed.
      expect(markdown).toContain("follow us through this guide");
      expect(markdown).toContain("follow us on every channel");
    });

    it("preserves syntax-highlighted code comments in full page mode", () => {
      const input = `
        <html>
          <body>
            <article>
              <h1>Submodule Notes</h1>
              <pre>
                <span class="hljs-comment"># initialize the submodule</span>
                <span class="hljs-comment">-- keep SQL comments too</span>
                <span class="hljs-keyword">git</span> submodule update --init
              </pre>
            </article>
          </body>
        </html>
      `;

      const markdown = htmlToMarkdownFullPage(input);

      expect(markdown).toContain("# initialize the submodule");
      expect(markdown).toContain("-- keep SQL comments too");
      expect(markdown).toContain("git submodule update --init");
    });
  } else {
    it("falls back to plain text when DOMParser is unavailable", () => {
      const input = "<h2>Title</h2><p>Hello <strong>world</strong>.</p>";
      expect(htmlToMarkdown(input)).toBe("Title Hello world.");
    });
  }
});
