// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_METHODS } from "../constants.js";
import { updateActionIconForProfile } from "../favicon.js";

const profile = {
  id: "profile-1",
  baseUrl: "https://forum.example.com",
  authMethod: AUTH_METHODS.ADMIN_API_KEY,
  apiUsername: "clipbot",
  apiKey: "not-a-real-key"
};

let cache;
let action;
let fetchMock;

class OffscreenCanvasMock {
  constructor() {
    this.context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      getImageData: vi.fn(() => ({
        source: this.context.drawImage.mock.calls.length > 0 ? "favicon" : "fallback"
      }))
    };
  }

  getContext() {
    return this.context;
  }
}

beforeEach(() => {
  cache = {};
  action = {
    setIcon: vi.fn(async () => {}),
    setTitle: vi.fn(async () => {})
  };
  fetchMock = vi.fn(async () => ({
    ok: true,
    headers: { get: () => "image/png" },
    blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" })
  }));

  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async () => ({ faviconCache: cache })),
        set: vi.fn(async (items) => {
          cache = items.faviconCache;
        })
      }
    },
    action
  });
  vi.stubGlobal("OffscreenCanvas", OffscreenCanvasMock);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({})));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("updateActionIconForProfile", () => {
  it("uses and caches the destination favicon when enabled", async () => {
    await updateActionIconForProfile(profile, true);

    expect(fetchMock).toHaveBeenCalledWith("https://forum.example.com/favicon.ico");
    expect(action.setIcon).toHaveBeenCalledWith({
      imageData: {
        16: { source: "favicon" },
        32: { source: "favicon" }
      }
    });
    expect(action.setTitle).toHaveBeenCalledWith({ title: "Clip To Discourse" });
    expect(cache[profile.id]).toBe("data:image/png;base64,AQID");
  });

  // Regression: createImageBitmap cannot decode SVG blobs in Chromium, and
  // an undecodable favicon used to reject with "The source image could not
  // be decoded.", taking the popup's startup path down with it.
  it("falls back when the site serves an SVG favicon", async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.endsWith("/favicon.ico")) {
        return {
          ok: true,
          headers: { get: () => "image/svg+xml" },
          blob: async () => new Blob(["<svg/>"], { type: "image/svg+xml" })
        };
      }
      return { ok: true, headers: { get: () => "text/html" }, text: async () => "<html></html>" };
    });

    await expect(updateActionIconForProfile(profile, true)).resolves.toBeUndefined();

    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(action.setIcon).toHaveBeenCalledWith({
      imageData: { 16: { source: "fallback" }, 32: { source: "fallback" } }
    });
    expect(cache[profile.id]).toBeUndefined();
  });

  it("falls back when the favicon bytes cannot be decoded", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => {
      throw new Error("The source image could not be decoded.");
    }));

    await expect(updateActionIconForProfile(profile, true)).resolves.toBeUndefined();

    expect(action.setIcon).toHaveBeenCalledWith({
      imageData: { 16: { source: "fallback" }, 32: { source: "fallback" } }
    });
    expect(cache[profile.id]).toBeUndefined();
  });

  // An opaque cross-origin response yields a zero-byte blob.
  it("falls back when the favicon response is opaque", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      headers: { get: () => "" },
      blob: async () => new Blob([], { type: "" }),
      text: async () => ""
    }));

    await expect(updateActionIconForProfile(profile, true)).resolves.toBeUndefined();

    expect(action.setIcon).toHaveBeenCalledWith({
      imageData: { 16: { source: "fallback" }, 32: { source: "fallback" } }
    });
  });

  it("uses the fallback icon without fetching when disabled", async () => {
    await updateActionIconForProfile(profile, false);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(action.setIcon).toHaveBeenCalledWith({
      imageData: {
        16: { source: "fallback" },
        32: { source: "fallback" }
      }
    });
  });
});
