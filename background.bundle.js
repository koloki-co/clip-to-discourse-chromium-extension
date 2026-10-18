import {
  CLIP_STYLES,
  DESTINATIONS,
  applyTitleTemplate,
  buildMarkdown,
  buildPayload,
  createPost,
  fallbackTitle,
  getSettingsState,
  isProfileConnected,
  normalizeTitle,
  updateActionIconForProfile
} from "./chunks/chunk-I3GXIVOH.js";
import "./chunks/chunk-YLVDSGH3.js";

// shared/clip.js
function parsePositiveId(value, label) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return numeric;
}
async function fetchTabPageInfo(tabId) {
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
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
async function clipTabWithProfileDefaults(tab, profile) {
  if (!isProfileConnected(profile)) {
    throw new Error("Clip To Discourse is not set up. Open the popup and connect a profile first.");
  }
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  const clipStyle = profile.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  if (clipStyle !== CLIP_STYLES.TITLE_URL) {
    throw new Error(`This shortcut only supports the "Title & URL" clip style. Open the popup for other styles, or change the profile's default clip style in Settings.`);
  }
  const destination = profile.defaultDestination || DESTINATIONS.NEW_TOPIC;
  let categoryId;
  let topicId;
  if (destination === DESTINATIONS.NEW_TOPIC) {
    if (!profile.defaultCategoryId) {
      throw new Error("No default category is set for this profile. Open the popup and set a default category first.");
    }
    categoryId = parsePositiveId(profile.defaultCategoryId, "Default category ID");
  } else if (destination === DESTINATIONS.APPEND_TOPIC) {
    if (!profile.defaultTopicId) {
      throw new Error("No default topic is set for this profile. Open the popup and set a default topic first.");
    }
    topicId = parsePositiveId(profile.defaultTopicId, "Default topic ID");
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
  const topicTitle = destination === DESTINATIONS.NEW_TOPIC ? applyTitleTemplate(profile.titleTemplate, title) : void 0;
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

// background.js
var MENU_CLIP_PAGE = "clip-page";
var MENU_CLIP_SELECTION = "clip-selection";
var COMMAND_CLIP_DEFAULT = "clip-default";
var BADGE_SUCCESS = { text: "\u2713", color: "#2e7d32" };
var BADGE_ERROR = { text: "!", color: "#c62828" };
var BADGE_CLEAR_DELAY_MS = 4e3;
async function showClipResultBadge(tabId, { text, color }) {
  await chrome.action.setBadgeText({ tabId, text });
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {
    });
  }, BADGE_CLEAR_DELAY_MS);
}
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== COMMAND_CLIP_DEFAULT || !tab?.id) {
    return;
  }
  try {
    const { activeProfile } = await getSettingsState();
    await clipTabWithProfileDefaults(tab, activeProfile);
    await showClipResultBadge(tab.id, BADGE_SUCCESS);
  } catch (error) {
    console.error("Failed to clip with default settings:", error);
    await showClipResultBadge(tab.id, BADGE_ERROR);
  }
});
async function createContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_CLIP_PAGE,
    title: "Clip to Discourse",
    contexts: ["page", "link"]
  });
  chrome.contextMenus.create({
    id: MENU_CLIP_SELECTION,
    title: "Clip selection to Discourse",
    contexts: ["selection"]
  });
}
async function refreshActionIcon() {
  const state = await getSettingsState();
  await updateActionIconForProfile(state.activeProfile, state.useFaviconForIcon);
}
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) {
    return;
  }
  try {
    await chrome.action.openPopup();
  } catch (error) {
    console.error("Failed to open popup:", error);
  }
});
chrome.runtime.onInstalled.addListener(async () => {
  await createContextMenus();
  await refreshActionIcon();
});
chrome.runtime.onStartup.addListener(refreshActionIcon);
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.profiles || changes.activeProfileId)) {
    refreshActionIcon().catch((error) => console.error("Failed to update action icon:", error));
  }
  if (areaName === "sync" && changes.useFaviconForIcon) {
    refreshActionIcon().catch((error) => console.error("Failed to update action icon:", error));
  }
});
createContextMenus();
refreshActionIcon().catch((error) => console.error("Failed to update action icon:", error));
