// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, describe, expect, it } from "vitest";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../../shared/constants.js";
import { mountPopup, unmountPopup, until } from "./test-helpers.js";

function profile(overrides = {}) {
  return {
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
    titleTemplate: "Clip: {{title}}",
    ...overrides
  };
}

describe("popup automatic clip style selection", () => {
  let mounted;

  afterEach(() => {
    unmountPopup(mounted);
    mounted = undefined;
  });

  it("overrides a non-text_selection profile default when a page selection is present", async () => {
    mounted = await mountPopup({
      storage: {
        profiles: [profile({ defaultClipStyle: CLIP_STYLES.TITLE_URL })],
        activeProfileId: "profile-1"
      },
      scripting: {
        selectionText: "some selected text",
        selectionHtml: "<p>some selected text</p>"
      }
    });

    const { window } = mounted;
    const document = window.document;
    const checked = document.querySelector('input[name="clipStyle"]:checked');
    expect(checked.value).toBe(CLIP_STYLES.TEXT_SELECTION);

    const indicator = document.getElementById("selection-indicator");
    expect(indicator.classList.contains("hidden")).toBe(false);
  });

  it("leaves the profile default in place when the page selection is only whitespace", async () => {
    mounted = await mountPopup({
      storage: {
        profiles: [profile({ defaultClipStyle: CLIP_STYLES.TITLE_URL })],
        activeProfileId: "profile-1"
      },
      scripting: {
        selectionText: "  \n",
        selectionHtml: ""
      }
    });

    const { window } = mounted;
    const document = window.document;
    const checked = document.querySelector('input[name="clipStyle"]:checked');
    expect(checked.value).toBe(CLIP_STYLES.TITLE_URL);

    const indicator = document.getElementById("selection-indicator");
    expect(indicator.classList.contains("hidden")).toBe(true);
  });

  it("does not re-apply the override when switching to a different profile afterwards", async () => {
    mounted = await mountPopup({
      storage: {
        profiles: [
          profile({ id: "profile-1", name: "Site One", defaultClipStyle: CLIP_STYLES.TITLE_URL }),
          profile({ id: "profile-2", name: "Site Two", defaultClipStyle: CLIP_STYLES.EXCERPT })
        ],
        activeProfileId: "profile-1"
      },
      scripting: {
        selectionText: "some selected text",
        selectionHtml: "<p>some selected text</p>"
      }
    });

    const { window } = mounted;
    const document = window.document;

    // The initial open still auto-selects text_selection for profile-1.
    expect(document.querySelector('input[name="clipStyle"]:checked').value).toBe(
      CLIP_STYLES.TEXT_SELECTION
    );

    // Switching profiles re-applies that profile's own default; the
    // selection override only fires once, during the initial popup open.
    const statusEl = document.getElementById("status");
    const profileSelect = document.getElementById("profileSelect");
    profileSelect.value = "profile-2";
    profileSelect.dispatchEvent(new window.Event("change"));
    await until(() => statusEl.textContent === "" && profileSelect.value === "profile-2");

    expect(document.querySelector('input[name="clipStyle"]:checked').value).toBe(
      CLIP_STYLES.EXCERPT
    );
  });
});
