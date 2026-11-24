// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../../shared/constants.js";
import { buildTagInputSuggestions } from "../../shared/tag-autocomplete.js";
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

describe("tag completion", () => {
  it.each(["Research,rea", "Research, rea", "Research,  rea"])("preserves the field prefix in %s", (value) => {
    expect(buildTagInputSuggestions(value, ["research", "reading-list", "chore"]))
      .toEqual([value + "ding-list"]);
  });

  it("bounds the number of matches after filtering", () => {
    const tags = Array.from({ length: 100 }, (_, index) => `tag-${index}`);
    expect(buildTagInputSuggestions("", tags)).toEqual(tags.slice(0, 30));
    expect(buildTagInputSuggestions("tag-99", tags)).toEqual(["tag-99"]);
  });
});

describe("popup tag autocomplete", () => {
  let mounted;

  beforeEach(async () => {
    mounted = await mountPopup({
      storage: {
        profiles: [makeProfile("profile-1", "Site One", "https://forum1.example.com")],
        activeProfileId: "profile-1",
        useFaviconForIcon: false
      }
    });
  });

  afterEach(() => {
    unmountPopup(mounted);
  });

  it("populates the tags datalist from the Discourse tags API on focus", async () => {
    const { window, fetchMock, pendingFetches } = mounted;
    const tagsInput = window.document.getElementById("tags");
    const tagsStatus = window.document.getElementById("tags-status");
    const tagsList = window.document.getElementById("tags-list");

    tagsInput.dispatchEvent(new window.Event("focus"));
    tagsInput.dispatchEvent(new window.Event("pointerdown"));
    await until(() => fetchMock.mock.calls.length === 1);
    expect(pendingFetches[0].url).toBe("https://forum1.example.com/tags.json");

    pendingFetches[0].resolve({
      ok: true,
      json: async () => ({
        tags: [
          { text: "research", count: 3 },
          { text: "reading-list", count: 1 }
        ]
      })
    });
    await until(() => tagsStatus.textContent.includes("2 available tags"));

    const optionValues = Array.from(tagsList.options).map((option) => option.value);
    expect(optionValues).toEqual(["research", "reading-list"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error message without throwing when tags fail to load", async () => {
    const { window, fetchMock, pendingFetches } = mounted;
    const tagsInput = window.document.getElementById("tags");
    const tagsStatus = window.document.getElementById("tags-status");

    tagsInput.dispatchEvent(new window.Event("focus"));
    await until(() => fetchMock.mock.calls.length === 1);

    pendingFetches[0].resolve({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
      text: async () => "Internal Server Error"
    });
    await until(() => tagsStatus.textContent !== "Loading tags...");

    expect(tagsStatus.textContent).toContain("server error");
  });

  it("does not refetch tags for the same profile on a second focus", async () => {
    const { window, fetchMock, pendingFetches } = mounted;
    const tagsInput = window.document.getElementById("tags");
    const tagsStatus = window.document.getElementById("tags-status");

    tagsInput.dispatchEvent(new window.Event("focus"));
    await until(() => fetchMock.mock.calls.length === 1);
    pendingFetches[0].resolve({
      ok: true,
      json: async () => ({ tags: [{ text: "research", count: 1 }] })
    });
    await until(() => tagsStatus.textContent.includes("available tags"));

    tagsInput.dispatchEvent(new window.Event("focus"));
    expect(fetchMock.mock.calls.length).toBe(1);
  });
});

describe("popup tag loading across profile switches", () => {
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

  it("discards tag results that arrive after a profile switch", async () => {
    const { window, fetchMock, pendingFetches } = mounted;
    const tagsInput = window.document.getElementById("tags");
    const tagsList = window.document.getElementById("tags-list");
    const profileSelect = window.document.getElementById("profileSelect");
    const statusEl = window.document.getElementById("status");

    tagsInput.dispatchEvent(new window.Event("focus"));
    await until(() => fetchMock.mock.calls.length === 1);
    expect(pendingFetches[0].url).toContain("forum1.example.com");

    profileSelect.value = "profile-2";
    profileSelect.dispatchEvent(new window.Event("change"));
    await until(() => statusEl.textContent === "" && profileSelect.value === "profile-2");

    pendingFetches[0].resolve({
      ok: true,
      json: async () => ({ tags: [{ text: "old-site-tag", count: 1 }] })
    });
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);

    const optionValues = Array.from(tagsList.options).map((option) => option.value);
    expect(optionValues).not.toContain("old-site-tag");

    tagsInput.dispatchEvent(new window.Event("focus"));
    await until(() => fetchMock.mock.calls.length === 2);
    expect(pendingFetches[1].url).toContain("forum2.example.com");
  });
});
