// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../constants.js";
import { DEFAULT_PROFILE } from "../settings.js";
import { clipTabWithProfileDefaults, fetchTabPageInfo } from "../clip.js";

const tab = { id: 1 };

const connectedProfile = {
  ...DEFAULT_PROFILE,
  id: "profile-1",
  baseUrl: "https://forum.example.com",
  authMethod: AUTH_METHODS.ADMIN_API_KEY,
  apiUsername: "clipbot",
  apiKey: "not-a-real-key",
  defaultDestination: DESTINATIONS.NEW_TOPIC,
  defaultClipStyle: CLIP_STYLES.TITLE_URL,
  defaultCategoryId: "12"
};

function stubScripting(pageData = {}) {
  const executeScript = vi.fn(() => Promise.resolve([{
    result: {
      title: pageData.title || "Example Page",
      url: pageData.url || "https://example.com"
    }
  }]));
  vi.stubGlobal("chrome", { scripting: { executeScript } });
  return executeScript;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: 1, topic_id: 1, topic_slug: "example-page" })
  })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchTabPageInfo", () => {
  it("returns the injected script's title and url", async () => {
    const executeScript = stubScripting({ title: "Injected Title" });

    const result = await fetchTabPageInfo(42);

    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 42 } }));
    expect(result).toEqual({ title: "Injected Title", url: "https://example.com" });
  });

  it("throws when the tab could not be read", async () => {
    vi.stubGlobal("chrome", { scripting: { executeScript: vi.fn(() => Promise.resolve([{}])) } });

    await expect(fetchTabPageInfo(42)).rejects.toThrow(/Could not read the page content/);
  });
});

describe("clipTabWithProfileDefaults", () => {
  it("posts a new topic using the profile's default category and title template", async () => {
    stubScripting({ title: "Example Page", url: "https://example.com" });

    await clipTabWithProfileDefaults(tab, connectedProfile);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://forum.example.com/posts.json");
    const body = JSON.parse(options.body);
    expect(body.category).toBe(12);
    expect(body.raw).toContain("https://example.com");
  });

  it("appends to the default topic when destination is append_topic", async () => {
    stubScripting();

    await clipTabWithProfileDefaults(tab, {
      ...connectedProfile,
      defaultDestination: DESTINATIONS.APPEND_TOPIC,
      defaultTopicId: "99"
    });

    const [, options] = fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.topic_id).toBe(99);
  });

  it("rejects when the profile has no stored credentials", async () => {
    stubScripting();

    await expect(
      clipTabWithProfileDefaults(tab, { ...DEFAULT_PROFILE, id: "unset" })
    ).rejects.toThrow(/not set up/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects when the default clip style is not title_url", async () => {
    stubScripting();

    await expect(
      clipTabWithProfileDefaults(tab, { ...connectedProfile, defaultClipStyle: CLIP_STYLES.FULL_TEXT })
    ).rejects.toThrow(/Title & URL/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a new-topic default with no default category configured", async () => {
    stubScripting();

    await expect(
      clipTabWithProfileDefaults(tab, { ...connectedProfile, defaultCategoryId: "" })
    ).rejects.toThrow(/default category/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an append-topic default with no default topic configured", async () => {
    stubScripting();

    await expect(
      clipTabWithProfileDefaults(tab, {
        ...connectedProfile,
        defaultDestination: DESTINATIONS.APPEND_TOPIC,
        defaultTopicId: ""
      })
    ).rejects.toThrow(/default topic/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects when there is no active tab", async () => {
    stubScripting();

    await expect(clipTabWithProfileDefaults({}, connectedProfile)).rejects.toThrow(/No active tab/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
