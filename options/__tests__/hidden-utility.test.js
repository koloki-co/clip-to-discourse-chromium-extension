// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Regression: `.hidden { display: none }` is declared near the top of
// options.css, so later single-class rules that set `display` (.hint,
// .checkbox) used to beat it on equal specificity. The markup carried the
// `hidden` class and the JS toggled it correctly, but the elements stayed on
// screen - most visibly the plaintext-credentials HTTP warning, which is
// meant to appear only once "Allow HTTP connections" is ticked.

function read(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

function renderPage(htmlPath, cssPath) {
  const html = read(htmlPath);
  const css = read(cssPath);
  const dom = new JSDOM(html);
  const style = dom.window.document.createElement("style");
  style.textContent = css;
  dom.window.document.head.appendChild(style);
  return dom;
}

describe.each([
  ["options", "../options.html", "../options.css"],
  ["popup", "../../popup/popup.html", "../../popup/popup.css"]
])("%s: .hidden beats every competing display rule", (_name, htmlPath, cssPath) => {
  it("collapses every element that ships with the hidden class", () => {
    const dom = renderPage(htmlPath, cssPath);
    const { document, getComputedStyle } = dom.window;

    const hiddenElements = Array.from(document.querySelectorAll(".hidden"));
    expect(hiddenElements.length).toBeGreaterThan(0);

    const stillVisible = hiddenElements
      .filter((element) => getComputedStyle(element).display !== "none")
      .map((element) => element.id || element.className);

    expect(stillVisible).toEqual([]);
    dom.window.close();
  });
});

describe("options page HTTP warning", () => {
  it("stays hidden until the hidden class is removed, then renders", () => {
    const dom = renderPage("../options.html", "../options.css");
    const { document, getComputedStyle } = dom.window;

    const warning = document.getElementById("httpWarning");
    const toggle = document.querySelector(".allow-http-toggle");

    expect(warning.classList.contains("hidden")).toBe(true);
    expect(getComputedStyle(warning).display).toBe("none");
    expect(getComputedStyle(toggle).display).toBe("none");

    // The utility must not permanently suppress the element.
    warning.classList.remove("hidden");
    toggle.classList.remove("hidden");
    expect(getComputedStyle(warning).display).toBe("block");
    expect(getComputedStyle(toggle).display).toBe("flex");

    dom.window.close();
  });
});
