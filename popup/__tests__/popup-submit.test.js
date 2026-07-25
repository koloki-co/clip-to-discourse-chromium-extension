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

  it("renders the success link safely when the server returns a hostile slug", async () => {
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

    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await until(() => fetchMock.mock.calls.length === 1);
    expect(pendingFetches[0].url).toContain("/posts.json");

    const hostileSlug = "'><img src=x onerror=alert(1)>";
    pendingFetches[0].resolve({
      ok: true,
      json: async () => ({ id: 1, topic_id: 42, topic_slug: hostileSlug })
    });
    await until(() => statusEl.textContent.includes("Clipped successfully"));

    // The slug must not become markup inside the extension page.
    expect(statusEl.querySelector("img")).toBeNull();
    const anchor = statusEl.querySelector("a");
    expect(anchor).toBeTruthy();
    expect(anchor.textContent).toBe("Open topic");
    expect(anchor.getAttribute("href")).toBe(
      `https://forum1.example.com/t/${encodeURIComponent(hostileSlug)}/42`
    );
  });
});
