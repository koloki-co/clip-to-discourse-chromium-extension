// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMarkdown } from "../markdown.js";
import { buildPayload } from "../payload.js";
import { createPost } from "../discourse.js";
import { CLIP_STYLES, DESTINATIONS } from "../constants.js";

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
});
