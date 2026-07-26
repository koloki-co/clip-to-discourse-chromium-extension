// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { vi } from "vitest";
import { JSDOM } from "jsdom";
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
function createStorageArea(initialData = {}) {
  return {
    get: vi.fn((keys, callback) => {
      const result = {};
      if (typeof keys === "string") {
        result[keys] = initialData[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => {
          result[key] = initialData[key];
        });
      } else if (keys === null || keys === undefined) {
        Object.assign(result, initialData);
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
    setIcon: vi.fn(() => Promise.resolve()),
    setTitle: vi.fn(() => Promise.resolve())
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
  const syncStore = {};
  const localStore = {};
  const { allowHttp, theme, useFaviconForIcon, ...localData } = storage;
  Object.assign(localStore, localData);
  if (useFaviconForIcon !== undefined) {
    syncStore.useFaviconForIcon = useFaviconForIcon;
  }
  if (allowHttp !== undefined) {
    syncStore.allowHttp = allowHttp;
  }
  if (theme !== undefined) {
    syncStore.theme = theme;
  }

  globalThis.chrome = {
    storage: {
      sync: createStorageArea(syncStore),
      local: createStorageArea(localStore)
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
 * Poll until a condition holds
 */
export async function until(predicate, timeoutMs = 2000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/**
 * Load the real popup page and module under JSDOM with mocked chrome APIs
 * and a deferred fetch. Returns handles for driving the UI; callers must
 * pass the result to unmountPopup() afterwards.
 */
export async function mountPopup({ storage, scripting = {} } = {}) {
  vi.resetModules();

  const html = readFileSync(join(__dirname, "../popup.html"), "utf-8");
  const dom = new JSDOM(html, { url: "chrome-extension://test/popup/popup.html" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Event = dom.window.Event;

  setupChromeMock({ storage, scripting });

  // JSDOM has no canvas support, so keep icon updates out of the picture.
  vi.doMock("../../shared/favicon.js", () => ({
    updateActionIconForProfile: vi.fn(async () => {})
  }));

  const pendingFetches = [];
  const fetchMock = vi.fn((url) => new Promise((resolve) => {
    pendingFetches.push({ url, resolve });
  }));
  vi.stubGlobal("fetch", fetchMock);

  await import("../popup.js");
  await until(() => {
    const statusEl = dom.window.document.getElementById("status");
    const profileSelect = dom.window.document.getElementById("profileSelect");
    return statusEl.textContent === "" && profileSelect.options.length > 0;
  });

  return { dom, window: dom.window, fetchMock, pendingFetches };
}

/**
 * Tear down a popup mounted with mountPopup()
 */
export function unmountPopup(mounted) {
  cleanupChromeMock();
  vi.unstubAllGlobals();
  vi.doUnmock("../../shared/favicon.js");
  mounted?.dom?.window?.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.Event;
  vi.restoreAllMocks();
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
