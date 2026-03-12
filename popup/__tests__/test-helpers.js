// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { vi } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load the popup HTML into the DOM for testing
 */
export function loadPopupHTML() {
  const html = readFileSync(join(__dirname, "../popup.html"), "utf-8");
  document.body.innerHTML = html;
}

/**
 * Mock chrome.storage.sync API
 */
export function createStorageMock(initialData = {}) {
  return {
    get: vi.fn((keys, callback) => {
      const result = {};
      if (typeof keys === "string") {
        result[keys] = initialData[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => {
          result[key] = initialData[key];
        });
      } else if (typeof keys === "object") {
        Object.keys(keys).forEach((key) => {
          result[key] = initialData[key] !== undefined ? initialData[key] : keys[key];
        });
      }
      callback?.(result);
      return Promise.resolve(result);
    }),
    set: vi.fn((items, callback) => {
      Object.assign(initialData, items);
      callback?.();
      return Promise.resolve();
    })
  };
}

/**
 * Mock chrome.tabs API
 */
export function createTabsMock(tabData = {}) {
  return {
    query: vi.fn(() => Promise.resolve([{
      id: 1,
      title: tabData.title || "Example Page",
      url: tabData.url || "https://example.com"
    }]))
  };
}

/**
 * Mock chrome.scripting API
 */
export function createScriptingMock(pageData = {}) {
  return {
    executeScript: vi.fn(() => Promise.resolve([{
      result: {
        title: pageData.title || "Example Page",
        url: pageData.url || "https://example.com",
        fullText: pageData.fullText || "",
        pageText: pageData.pageText || "",
        fullHtml: pageData.fullHtml || "<p>Example content</p>",
        pageHtml: pageData.pageHtml || "<p>Example content</p>",
        selectionText: pageData.selectionText || "",
        selectionHtml: pageData.selectionHtml || ""
      }
    }]))
  };
}

/**
 * Mock chrome.runtime API
 */
export function createRuntimeMock(version = "0.19.3") {
  return {
    getManifest: vi.fn(() => ({
      version
    }))
  };
}

/**
 * Mock chrome.action API
 */
export function createActionMock() {
  return {
    setIcon: vi.fn(() => Promise.resolve())
  };
}

/**
 * Set up complete chrome API mock
 */
export function setupChromeMock({
  storage = {},
  tabs = {},
  scripting = {},
  version = "0.19.3"
} = {}) {
  globalThis.chrome = {
    storage: {
      sync: createStorageMock(storage)
    },
    tabs: createTabsMock(tabs),
    scripting: createScriptingMock(scripting),
    runtime: createRuntimeMock(version),
    action: createActionMock()
  };
}

/**
 * Clean up chrome API mock
 */
export function cleanupChromeMock() {
  delete globalThis.chrome;
}

/**
 * Wait for async operations to complete
 */
export function waitFor(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trigger a change event on an input
 */
export function changeInput(element, value) {
  element.value = value;
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Trigger a form submission
 */
export function submitForm(form) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

/**
 * Click an element
 */
export function click(element) {
  // For radio/checkbox inputs, simulate the checked state change
  if (element.type === "radio") {
    // Uncheck other radios in the same group
    const name = element.name;
    if (name) {
      document.querySelectorAll(`input[name="${name}"][type="radio"]`).forEach((radio) => {
        radio.checked = false;
      });
    }
    element.checked = true;
  } else if (element.type === "checkbox") {
    element.checked = !element.checked;
  }
  
  element.dispatchEvent(new Event("click", { bubbles: true }));
}
