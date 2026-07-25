// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../../shared/constants.js";
import { mountPopup, unmountPopup, until } from "./test-helpers.js";

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

describe("popup category loading across profile switches", () => {
  let mounted;

  beforeEach(async () => {
    mounted = await mountPopup({
      storage: {
        profiles: [
          makeProfile("profile-1", "Site One", "https://forum1.example.com"),
          makeProfile("profile-2", "Site Two", "https://forum2.example.com")
        ],
        activeProfileId: "profile-1",
        useFaviconForIcon: false
      }
    });
  });

  afterEach(() => {
    unmountPopup(mounted);
  });

  it("discards category results that arrive after a profile switch", async () => {
    const { window, fetchMock, pendingFetches } = mounted;
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
