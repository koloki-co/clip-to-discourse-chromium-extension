// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../../shared/constants.js";
import { setupChromeMock, cleanupChromeMock } from "./test-helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeProfile(id, name, baseUrl) {
  return {
    id,
    name,
    baseUrl,
    authMethod: AUTH_METHODS.ADMIN_API_KEY,
    apiUsername: "user",
    apiKey: "key",
    defaultClipStyle: CLIP_STYLES.TITLE_URL,
    defaultDestination: DESTINATIONS.NEW_TOPIC,
    defaultCategoryId: "",
    defaultTopicId: "",
    titleTemplate: "Clip: {{title}}"
  };
}

async function until(predicate, timeoutMs = 2000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("popup category loading across profile switches", () => {
  let dom;
  let window;
  let fetchMock;
  let pendingFetches;

  beforeEach(async () => {
    vi.resetModules();

    const html = readFileSync(join(__dirname, "../popup.html"), "utf-8");
    dom = new JSDOM(html, { url: "chrome-extension://test/popup/popup.html" });
    window = dom.window;
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Event = window.Event;

    setupChromeMock({
      storage: {
        profiles: [
          makeProfile("profile-1", "Site One", "https://forum1.example.com"),
          makeProfile("profile-2", "Site Two", "https://forum2.example.com")
        ],
        activeProfileId: "profile-1",
        useFaviconForIcon: false
      }
    });

    // JSDOM has no canvas support, so keep icon updates out of the picture.
    vi.doMock("../../shared/favicon.js", () => ({
      updateActionIconForProfile: vi.fn(async () => {})
    }));

    pendingFetches = [];
    fetchMock = vi.fn((url) => new Promise((resolve) => {
      pendingFetches.push({ url, resolve });
    }));
    vi.stubGlobal("fetch", fetchMock);

    await import("../popup.js");
    await until(() => {
      const statusEl = window.document.getElementById("status");
      const profileSelect = window.document.getElementById("profileSelect");
      return statusEl.textContent === "" && profileSelect.options.length === 2;
    });
  });

  afterEach(() => {
    cleanupChromeMock();
    vi.unstubAllGlobals();
    vi.doUnmock("../../shared/favicon.js");
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.Event;
    vi.restoreAllMocks();
  });

  it("discards category results that arrive after a profile switch", async () => {
    const categoryInput = window.document.getElementById("categoryId");
    const profileSelect = window.document.getElementById("profileSelect");
    const statusEl = window.document.getElementById("status");

    // Start the category fetch for profile-1; it stays pending.
    categoryInput.dispatchEvent(new window.Event("focus"));
    await until(() => fetchMock.mock.calls.length === 1);
    expect(pendingFetches[0].url).toContain("forum1.example.com");

    // Switch to profile-2 while the fetch is in flight.
    profileSelect.value = "profile-2";
    profileSelect.dispatchEvent(new window.Event("change"));
    await until(() => statusEl.textContent === "" && profileSelect.value === "profile-2");

    // The old site's response arrives late and must be discarded.
    pendingFetches[0].resolve({
      ok: true,
      json: async () => ({ categories: [{ id: 77, name: "Old Site Category" }] })
    });
    await new Promise((resolve) => setTimeout(resolve, 25));

    const optionTexts = Array.from(categoryInput.options).map((option) => option.textContent);
    expect(optionTexts).not.toContain("Old Site Category");

    // Categories were not marked loaded for profile-2, so focusing the field
    // fetches them from the new profile's site.
    categoryInput.dispatchEvent(new window.Event("focus"));
    await until(() => fetchMock.mock.calls.length === 2);
    expect(pendingFetches[1].url).toContain("forum2.example.com");
  });
});
