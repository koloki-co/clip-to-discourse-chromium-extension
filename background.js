// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { clipTabWithProfileDefaults } from "./shared/clip.js";
import { updateActionIconForProfile } from "./shared/favicon.js";
import { getSettingsState } from "./shared/settings.js";

// Background service worker for basic extension functionality.
// The main clipping functionality is handled by the popup UI, except for
// the clip-default command below, which clips without opening it.

// Context menu IDs
const MENU_CLIP_PAGE = "clip-page";
const MENU_CLIP_SELECTION = "clip-selection";

// Keyboard command that clips using the active profile's defaults.
const COMMAND_CLIP_DEFAULT = "clip-default";
const BADGE_SUCCESS = { text: "✓", color: "#2e7d32" };
const BADGE_ERROR = { text: "!", color: "#c62828" };
const BADGE_CLEAR_DELAY_MS = 4000;

// There is no popup to report into for clip-default, so feedback goes on
// the toolbar badge instead (chrome.notifications was removed in R68).
async function showClipResultBadge(tabId, { text, color }, title) {
  await chrome.action.setBadgeText({ tabId, text });
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  if (title) {
    await chrome.action.setTitle({ tabId, title });
  }
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
    if (title) {
      chrome.action.setTitle({ tabId, title: "Clip to Discourse" }).catch(() => {});
    }
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
    await showClipResultBadge(tab.id, BADGE_ERROR, error.message || "Failed to clip.");
  }
});

// Create simple context menu items
async function createContextMenus() {
  // Remove all existing menus first
  await chrome.contextMenus.removeAll();
  
  // Create menu item for pages
  chrome.contextMenus.create({
    id: MENU_CLIP_PAGE,
    title: "Clip to Discourse",
    contexts: ["page", "link"]
  });
  
  // Create menu item for selections
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

// Handle context menu clicks by opening the popup
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) {
    return;
  }
  
  // Open the extension popup (Chrome will handle this via action.openPopup in MV3)
  // For now, we can open it in a new window or use chrome.action.openPopup()
  // However, chrome.action.openPopup() only works in response to user action
  // The context menu click IS a user action, so we can use it here
  try {
    await chrome.action.openPopup();
  } catch (error) {
    // If openPopup fails (not all browsers support it), fall back to opening options
    console.error("Failed to open popup:", error);
  }
});

// Initialize context menus when extension is installed or updated
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

// Recreate context menus when extension starts
createContextMenus();
refreshActionIcon().catch((error) => console.error("Failed to update action icon:", error));
