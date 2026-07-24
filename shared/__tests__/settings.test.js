// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from "vitest";
import { normalizeBaseUrl, DEFAULT_PROFILE, isProfileConnected } from "../settings.js";
import { AUTH_METHODS } from "../constants.js";

describe("settings", () => {
  it("normalizes base url by trimming trailing slashes", () => {
    expect(normalizeBaseUrl("https://forum.example.com/"))
      .toBe("https://forum.example.com");
  });

  it("provides sane profile defaults", () => {
    expect(DEFAULT_PROFILE.defaultClipStyle).toBeDefined();
    expect(DEFAULT_PROFILE.defaultDestination).toBeDefined();
    expect(DEFAULT_PROFILE.authMethod).toBe(AUTH_METHODS.USER_API);
  });

  it("requires a User API credential for a connected User API profile", () => {
    expect(isProfileConnected({
      baseUrl: "https://forum.example.com",
      authMethod: AUTH_METHODS.USER_API,
      userApiKey: "user-key"
    })).toBe(true);
    expect(isProfileConnected({
      baseUrl: "https://forum.example.com",
      authMethod: AUTH_METHODS.USER_API,
      userApiKey: ""
    })).toBe(false);
  });

  it("requires a username and key for a connected Admin API profile", () => {
    expect(isProfileConnected({
      baseUrl: "https://forum.example.com",
      authMethod: AUTH_METHODS.ADMIN_API_KEY,
      apiUsername: "clipbot",
      apiKey: "admin-key"
    })).toBe(true);
    expect(isProfileConnected({
      baseUrl: "https://forum.example.com",
      authMethod: AUTH_METHODS.ADMIN_API_KEY,
      apiUsername: "clipbot",
      apiKey: ""
    })).toBe(false);
  });
});
