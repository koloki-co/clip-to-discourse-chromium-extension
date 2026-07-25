// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMarkdown, applyTitleTemplate } from "../markdown.js";
import { buildPayload } from "../payload.js";
import {
  checkUserApiVersion,
  createUserApiDeviceRequest,
  createPost,
  listCategories,
  pollUserApiDeviceRequest,
  revokeUserApiKey,
  testConnection
} from "../discourse.js";
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

  it("treats a 2xx response without a JSON body as success", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createPost({
      baseUrl: "https://forum.example.com",
      apiUsername: "user",
      apiKey: "key",
      payload: { title: "Clip: Example", raw: "body" }
    });

    expect(result).toEqual({});
    expect(result.topic_id).toBeUndefined();
  });

  it("checks user api capabilities with HEAD request", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({
        "Auth-Api-Version": "4",
        "Auth-Api-Device-Code": "true"
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const capabilities = await checkUserApiVersion({ baseUrl: "https://forum.example.com" });

    expect(capabilities).toEqual({ version: "4", supportsDeviceCode: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/user-api-key/new");
    expect(options.method).toBe("HEAD");
  });

  it("creates a User API device authorization request", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        device_code: "device-secret",
        user_code: "ABCD-EFGH",
        verification_uri: "https://forum.example.com/user-api-key/activate",
        verification_uri_with_request: "https://forum.example.com/user-api-key/activate?request=token",
        expires_in: 600,
        interval: 5
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createUserApiDeviceRequest({
      baseUrl: "https://forum.example.com",
      applicationName: "Clip To Discourse",
      clientId: "client-123",
      scopes: "read,write",
      nonce: "nonce-123",
      publicKey: "PUBLIC KEY"
    });

    expect(result.user_code).toBe("ABCD-EFGH");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/user-api-key/device.json");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      application_name: "Clip To Discourse",
      client_id: "client-123",
      scopes: "read,write",
      nonce: "nonce-123",
      public_key: "PUBLIC KEY",
      padding: "oaep"
    });
  });

  it("polls a User API device authorization request", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: "authorized", payload: "encrypted" })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await pollUserApiDeviceRequest({
      baseUrl: "https://forum.example.com",
      deviceCode: "device-secret"
    });

    expect(result).toEqual({ status: "authorized", payload: "encrypted" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/user-api-key/device/poll.json");
    expect(JSON.parse(options.body)).toEqual({ device_code: "device-secret" });
  });

  it("throws a clear error when the User API endpoint returns 404", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({}),
      text: async () => ""
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      checkUserApiVersion({ baseUrl: "https://forum.example.com" })
    ).rejects.toThrow(/does not support the User API key flow/);
  });

  it("explains how to resolve insufficient User API scopes", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ errors: ["Requested scopes are not permitted"] })
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createUserApiDeviceRequest({
      baseUrl: "https://forum.example.com",
      applicationName: "Clip To Discourse",
      clientId: "client-123",
      scopes: "read,write",
      nonce: "nonce-123",
      publicKey: "PUBLIC KEY"
    })).rejects.toThrow(/enable both read and write.*Server response: Requested scopes are not permitted/);
  });

  it("hits /session/current.json and returns the resolved username", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ current_user: { username: "marcusbaw" } })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await testConnection({
      baseUrl: "https://forum.example.com",
      apiUsername: "marcusbaw",
      apiKey: "key"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/session/current.json");
    expect(result.username).toBe("marcusbaw");
  });

  it("lists visible categories and labels subcategories with their parent", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        categories: [
          { id: 2, name: "Support", parent_category_id: 1 },
          { id: 1, name: "Community" },
          { id: 3, name: "Announcements" }
        ]
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const categories = await listCategories({
      baseUrl: "https://forum.example.com",
      authMethod: AUTH_METHODS.USER_API,
      userApiKey: "user-key",
      userApiClientId: "client-123"
    });

    expect(categories).toEqual([
      { id: 3, name: "Announcements" },
      { id: 1, name: "Community" },
      { id: 2, name: "Community / Support" }
    ]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forum.example.com/site.json");
    expect(options.headers["User-Api-Key"]).toBe("user-key");
  });

  it("returns an empty username when the response shape is unexpected", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({})
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await testConnection({
      baseUrl: "https://forum.example.com",
      authMethod: AUTH_METHODS.USER_API,
      userApiKey: "user-key",
      userApiClientId: "client-123"
    });

    expect(result.username).toBe("");
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["User-Api-Key"]).toBe("user-key");
    expect(options.headers["User-Api-Client-Id"]).toBe("client-123");
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
