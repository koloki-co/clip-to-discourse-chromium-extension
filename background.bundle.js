// background.js
var MENU_CLIP_PAGE = "clip-page";
var MENU_CLIP_SELECTION = "clip-selection";
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
});
createContextMenus();
