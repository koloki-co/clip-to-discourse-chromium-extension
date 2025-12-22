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
});
