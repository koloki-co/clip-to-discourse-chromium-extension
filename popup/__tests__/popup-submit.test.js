// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../../shared/constants.js";
import { mountPopup, unmountPopup, until } from "./test-helpers.js";

describe("popup submit status rendering", () => {
  let mounted;

  beforeEach(async () => {
    mounted = await mountPopup({
      storage: {
        profiles: [{
          id: "profile-1",
          name: "Site One",
          baseUrl: "https://forum1.example.com",
          authMethod: AUTH_METHODS.ADMIN_API_KEY,
          apiUsername: "user",
          apiKey: "key",
          defaultClipStyle: CLIP_STYLES.TITLE_URL,
          defaultDestination: DESTINATIONS.NEW_TOPIC,
          defaultCategoryId: "",
          defaultTopicId: "",
          titleTemplate: "Clip: {{title}}"
        }],
        activeProfileId: "profile-1",
        useFaviconForIcon: false
      }
    });
  });

  afterEach(() => {
    unmountPopup(mounted);
  });

  it("clips title_url successfully without running the heavy extraction pipeline", async () => {
    const { window, fetchMock, pendingFetches } = mounted;
    const document = window.document;
    const categoryInput = document.getElementById("categoryId");
    const statusEl = document.getElementById("status");
    const form = document.getElementById("clip-form");

    const option = document.createElement("option");
    option.value = "5";
    option.textContent = "General";
    categoryInput.appendChild(option);
    categoryInput.value = "5";

    // The page has no meaningful content; title_url should still succeed
    // because it only needs the title and URL, not the extraction pipeline.
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await until(() => fetchMock.mock.calls.length === 1);

    pendingFetches[0].resolve({
      ok: true,
      json: async () => ({ id: 1, topic_id: 42, topic_slug: "test-topic" })
    });
    await until(() => statusEl.textContent.includes("Clipped successfully"));

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    // The raw body for title_url is the title template output: title + URL.
    expect(sentBody.raw).toContain("Example Page");
    expect(sentBody.raw).toContain("https://example.com");
  });
});

describe("popup submission edge cases", () => {
  it("preserves special characters in a selected-text clip", async () => {
    const title = "Café \"quotes\" & [brackets] 😀";
    const selectedText = "Café \"quotes\" & [brackets] 😀";
    const url = "https://example.com/search?q=tea&tag=[notes]";
    const mounted = await mountPopup({
      storage: {
        profiles: [{
          id: "profile-1",
          name: "Site One",
          baseUrl: "https://forum1.example.com",
          authMethod: AUTH_METHODS.ADMIN_API_KEY,
          apiUsername: "user",
          apiKey: "key",
          defaultClipStyle: CLIP_STYLES.TEXT_SELECTION,
          defaultDestination: DESTINATIONS.NEW_TOPIC,
          defaultCategoryId: "",
          defaultTopicId: "",
          titleTemplate: "Clip: {{title}}"
        }],
        activeProfileId: "profile-1",
        useFaviconForIcon: false
      },
      scripting: {
        title,
        url,
        selectionText: selectedText,
        selectionHtml: `<p>${selectedText}</p>`
      }
    });

    try {
      const { window, fetchMock, pendingFetches } = mounted;
      const categoryInput = window.document.getElementById("categoryId");
      const form = window.document.getElementById("clip-form");
      const option = window.document.createElement("option");
      option.value = "5";
      categoryInput.appendChild(option);
      categoryInput.value = "5";

      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
      await until(() => fetchMock.mock.calls.length === 1);
      pendingFetches[0].resolve({
        ok: true,
        json: async () => ({ id: 1, topic_id: 42, topic_slug: "test-topic" })
      });

      const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sentBody.title).toBe(`Clip: ${title}`);
      expect(sentBody.raw).toContain(selectedText);
      expect(sentBody.raw).toContain(url);
    } finally {
      unmountPopup(mounted);
    }
  });
});

// Regression: init() disables the whole form while settings load, and
// applyProfileDefaults used to skip disabled inputs, so the profile's
// default clip style and destination were silently never applied.
describe("popup applies profile defaults", () => {
  let mounted;

  afterEach(() => {
    unmountPopup(mounted);
  });

  it("preselects the profile's default clip style and destination", async () => {
    mounted = await mountPopup({
      storage: {
        profiles: [{
          id: "profile-1",
          name: "Site One",
          baseUrl: "https://forum1.example.com",
          authMethod: AUTH_METHODS.ADMIN_API_KEY,
          apiUsername: "user",
          apiKey: "key",
          defaultClipStyle: CLIP_STYLES.FULL_TEXT,
          defaultDestination: DESTINATIONS.APPEND_TOPIC,
          defaultCategoryId: "",
          defaultTopicId: "345",
          titleTemplate: "Clip: {{title}}"
        }],
        activeProfileId: "profile-1",
        useFaviconForIcon: false
      }
    });

    const { document } = mounted.window;

    expect(document.querySelector("input[name='clipStyle']:checked").value)
      .toBe(CLIP_STYLES.FULL_TEXT);
    expect(document.querySelector("input[name='destination']:checked").value)
      .toBe(DESTINATIONS.APPEND_TOPIC);
    expect(document.getElementById("topicId").value).toBe("345");
    // Append-topic hides the category field and shows the topic field.
    expect(document.getElementById("topic-field").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("category-field").classList.contains("hidden")).toBe(true);
    // The form must be usable once init() completes.
    expect(document.querySelector("button[type=submit]").disabled).toBe(false);
  });
});
