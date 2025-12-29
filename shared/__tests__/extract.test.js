// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from "vitest";
import { buildExcerpt, normalizeText } from "../extract.js";

describe("extract", () => {
  it("normalizes whitespace while preserving paragraphs", () => {
    const input = "Line 1\n\n\nLine   2\t\tLine 3";
    expect(normalizeText(input)).toBe("Line 1\n\nLine 2 Line 3");
  });

  it("builds an excerpt with a max length", () => {
    const input = "abcdefghijklmnopqrstuvwxyz";
    expect(buildExcerpt(input, 10)).toBe("abcdefghij");
  });
});
