// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

// Background-safe clipping using a profile's stored defaults, for the
// no-popup keyboard shortcut. Deliberately supports only the `title_url`
// clip style: the other styles need shared/extract.js's HTML processing
// (Turndown, Readability), which would otherwise get bundled into the
// background service worker for every install - see roadmap R49/R50.

import { CLIP_STYLES, DESTINATIONS } from "./constants.js";
import { applyTitleTemplate, buildMarkdown, fallbackTitle, normalizeTitle } from "./markdown.js";
import { buildPayload } from "./payload.js";
import { createPost } from "./discourse.js";
import { isProfileConnected } from "./settings.js";

/**
 * Read a tab's title and URL via an injected script, for the `title_url`
 * clip style only - the other styles' content extraction (excerpt, full
 * text, selection) needs the popup.
 * @param {number} tabId
 * @returns {Promise<{title: string, url: string}>}
 * @throws {Error} If the tab's content could not be read (privileged page, blocked access).
 */
export async function fetchTabPageInfo(tabId) {
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const ogTitle = document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content");
      const docTitle = (document.title || "").trim();
      const title = docTitle || (ogTitle ? ogTitle.trim() : "");
      return { title, url: window.location.href };
    }
  });
  if (!injectionResult?.result) {
    throw new Error("Could not read the page content. The tab may be a privileged page (chrome://, about:) or the page may have blocked content access.");
  }
  return injectionResult.result;
}

/**
 * Clip a tab straight to Discourse using a profile's stored default
 * destination, category/topic, and title template - no popup UI involved.
 * Used by the `clip-default` keyboard command. Only supports profiles whose
 * `defaultClipStyle` is `title_url`; see the module doc comment for why.
 * @param {{id: number}} tab - The tab to clip, from `chrome.tabs.query`.
 * @param {object} profile - A profile as returned by `getSettingsState` from `shared/settings.js`.
 * @returns {Promise<object>} The parsed Discourse response, as returned by {@link createPost}.
 * @throws {Error} If the profile is not connected, its default clip style is not `title_url`, it has no default category/topic configured, or the tab's content could not be read.
 */
export async function clipTabWithProfileDefaults(tab, profile) {
  if (!isProfileConnected(profile)) {
    throw new Error("Clip To Discourse is not set up. Open the popup and connect a profile first.");
  }
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  const clipStyle = profile.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  if (clipStyle !== CLIP_STYLES.TITLE_URL) {
    throw new Error("This shortcut only supports the \"Title & URL\" clip style. Open the popup for other styles, or change the profile's default clip style in Settings.");
  }

  const destination = profile.defaultDestination || DESTINATIONS.NEW_TOPIC;
  const categoryId = profile.defaultCategoryId || "";
  const topicId = profile.defaultTopicId || "";

  if (destination === DESTINATIONS.NEW_TOPIC && !categoryId) {
    throw new Error("No default category is set for this profile. Open the popup and set a default category first.");
  }
  if (destination === DESTINATIONS.APPEND_TOPIC && !topicId) {
    throw new Error("No default topic is set for this profile. Open the popup and set a default topic first.");
  }

  const pageInfo = await fetchTabPageInfo(tab.id);
  const title = normalizeTitle(pageInfo.title) || fallbackTitle();
  const url = pageInfo.url;

  const raw = buildMarkdown({
    title,
    url,
    clipStyle,
    templates: { titleUrl: profile.titleUrlTemplate }
  });

  const topicTitle = destination === DESTINATIONS.NEW_TOPIC
    ? applyTitleTemplate(profile.titleTemplate, title)
    : undefined;

  const payload = buildPayload({
    destination,
    title: topicTitle,
    categoryId,
    topicId,
    raw
  });

  return createPost({
    baseUrl: profile.baseUrl,
    authMethod: profile.authMethod,
    apiUsername: profile.apiUsername,
    apiKey: profile.apiKey,
    userApiKey: profile.userApiKey,
    userApiClientId: profile.userApiClientId,
    payload
  });
}
