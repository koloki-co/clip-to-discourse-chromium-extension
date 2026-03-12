// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

// Background service worker for basic extension functionality.
// The main clipping functionality is handled by the popup UI.

// Context menu IDs
const MENU_CLIP_PAGE = "clip-page";
const MENU_CLIP_SELECTION = "clip-selection";

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
});

// Recreate context menus when extension starts
createContextMenus();
