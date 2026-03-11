// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMarkdown, applyTitleTemplate } from "../markdown.js";
import { buildPayload } from "../payload.js";
import { checkUserApiVersion, createPost, revokeUserApiKey } from "../discourse.js";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS, MAX_TITLE_LENGTH } from "../constants.js";

describe("integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a new topic payload", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 1 })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const raw = buildMarkdown({
      title: "Example",
      url: "https://example.com",
      clipStyle: CLIP_STYLES.TITLE_URL
    });

    const payload = buildPayload({
      destination: DESTINATIONS.NEW_TOPIC,
      title: "Clip: Example",
      categoryId: "12",
      raw
    });

    await createPost({
      baseUrl: "https://forum.example.com",
      apiUsername: "user",
      apiKey: "key",
      payload
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/posts.json");
    expect(options.method).toBe("POST");
    expect(options.headers["Api-Key"]).toBe("key");
    expect(options.headers["Api-Username"]).toBe("user");
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it("posts a reply payload", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 2 })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const raw = buildMarkdown({
      title: "Example",
      url: "https://example.com",
      clipStyle: CLIP_STYLES.TITLE_URL
    });

    const payload = buildPayload({
      destination: DESTINATIONS.APPEND_TOPIC,
      topicId: "42",
      raw
    });

    await createPost({
      baseUrl: "https://forum.example.com",
      apiUsername: "user",
      apiKey: "key",
      payload
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/posts.json");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it("posts with User API headers when profile uses User API auth", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 3 })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const raw = buildMarkdown({
      title: "Example",
      url: "https://example.com",
      clipStyle: CLIP_STYLES.TITLE_URL
    });

    const payload = buildPayload({
      destination: DESTINATIONS.NEW_TOPIC,
      title: "Clip: Example",
      categoryId: "12",
      raw
    });

    await createPost({
      baseUrl: "https://forum.example.com",
      authMethod: AUTH_METHODS.USER_API,
      userApiKey: "user-key",
      userApiClientId: "client-123",
      payload
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["User-Api-Key"]).toBe("user-key");
    expect(options.headers["User-Api-Client-Id"]).toBe("client-123");
    expect(options.headers["Api-Key"]).toBeUndefined();
  });

  it("checks user api version with HEAD request", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: new Headers({ "Auth-Api-Version": "4" })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const version = await checkUserApiVersion({ baseUrl: "https://forum.example.com" });

    expect(version).toBe("4");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/user-api-key/new");
    expect(options.method).toBe("HEAD");
  });

  it("revokes user api key with user api headers", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: new Headers(),
      json: async () => ({ success: true })
    }));
    vi.stubGlobal("fetch", fetchMock);

    await revokeUserApiKey({
      baseUrl: "https://forum.example.com",
      userApiKey: "user-key",
      userApiClientId: "client-123"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/user-api-key/revoke");
    expect(options.method).toBe("POST");
    expect(options.headers["User-Api-Key"]).toBe("user-key");
    expect(options.headers["User-Api-Client-Id"]).toBe("client-123");
  });

  it("truncates long titles after applying template", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 4 })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const longPageTitle = "A".repeat(255);
    const topicTitle = applyTitleTemplate(null, longPageTitle);
    
    expect(topicTitle.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);

    const raw = buildMarkdown({
      title: longPageTitle,
      url: "https://example.com",
      clipStyle: CLIP_STYLES.TITLE_URL
    });

    const payload = buildPayload({
      destination: DESTINATIONS.NEW_TOPIC,
      title: topicTitle,
      categoryId: "12",
      raw
    });

    expect(payload.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);

    await createPost({
      baseUrl: "https://forum.example.com",
      apiUsername: "user",
      apiKey: "key",
      payload
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const sentPayload = JSON.parse(options.body);
    expect(sentPayload.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
  });
});
