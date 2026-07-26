// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only
// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { THEMES } from "../constants.js";
import { applyTheme, normalizeTheme } from "../theme.js";

describe("theme", () => {
  it("normalizes unknown values to System", () => {
    expect(normalizeTheme(THEMES.DARK)).toBe(THEMES.DARK);
    expect(normalizeTheme("sepia")).toBe(THEMES.SYSTEM);
    expect(normalizeTheme(undefined)).toBe(THEMES.SYSTEM);
  });

  it("applies the normalized theme to the document root", () => {
    applyTheme(THEMES.LIGHT);
    expect(document.documentElement.dataset.theme).toBe(THEMES.LIGHT);

    applyTheme("invalid");
    expect(document.documentElement.dataset.theme).toBe(THEMES.SYSTEM);
  });
});
