// shared/constants.js
var CLIP_STYLES = {
  TITLE_URL: "title_url",
  EXCERPT: "excerpt",
  FULL_TEXT: "full_text",
  TEXT_SELECTION: "text_selection"
};
var DESTINATIONS = {
  NEW_TOPIC: "new_topic",
  APPEND_TOPIC: "append_topic"
};
var AUTH_METHODS = {
  ADMIN_API_KEY: "admin_api_key",
  USER_API: "user_api"
};

// shared/markdown.js
var DEFAULT_CLIP_TEMPLATES = {
  titleUrl: "### {{title}}\n{{url}}\n",
  excerpt: "### {{title}}\n{{url}}\n\n{{excerpt}}\n\n{{url}}",
  fullText: "### {{title}}\n{{url}}\n\n---\n\n{{full-text}}\n\n---\n\n{{url}}",
  textSelection: "### {{title}}\n{{url}}\n\n{{text-selection-markdown}}\n\n{{url}}"
};

// shared/settings.js
var DEFAULT_PROFILE = {
  id: "",
  name: "Default",
  baseUrl: "",
  authMethod: AUTH_METHODS.USER_API,
  apiUsername: "",
  apiKey: "",
  userApiKey: "",
  userApiClientId: "",
  defaultClipStyle: CLIP_STYLES.TITLE_URL,
  defaultDestination: DESTINATIONS.NEW_TOPIC,
  defaultCategoryId: "",
  defaultTopicId: "",
  titleTemplate: "Clip: {{title}}",
  titleUrlTemplate: DEFAULT_CLIP_TEMPLATES.titleUrl,
  excerptTemplate: DEFAULT_CLIP_TEMPLATES.excerpt,
  fullTextTemplate: DEFAULT_CLIP_TEMPLATES.fullText,
  textSelectionTemplate: DEFAULT_CLIP_TEMPLATES.textSelection
};
var DEFAULT_GLOBAL_SETTINGS = {
  useFaviconForIcon: false,
  allowHttp: false
};
function isProfileConnected(profile) {
  if (!profile?.baseUrl) {
    return false;
  }
  if (profile.authMethod === AUTH_METHODS.USER_API) {
    return Boolean(profile.userApiKey);
  }
  return Boolean(profile.apiUsername && profile.apiKey);
}
var LEGACY_KEYS = [
  "baseUrl",
  "apiUsername",
  "apiKey",
  "defaultClipStyle",
  "defaultDestination",
  "defaultCategoryId",
  "defaultTopicId",
  "titleTemplate"
];
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `profile_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  return trimmed.replace(/\/+$/, "");
}
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeAuthMethod(profile) {
  if (profile.authMethod === AUTH_METHODS.ADMIN_API_KEY || profile.authMethod === AUTH_METHODS.USER_API) {
    return profile.authMethod;
  }
  if (normalizeString(profile.userApiKey)) {
    return AUTH_METHODS.USER_API;
  }
  if (normalizeString(profile.apiUsername) || normalizeString(profile.apiKey)) {
    return AUTH_METHODS.ADMIN_API_KEY;
  }
  return DEFAULT_PROFILE.authMethod;
}
function normalizeProfile(profile) {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    id: profile.id || generateId(),
    name: normalizeString(profile.name) || DEFAULT_PROFILE.name,
    baseUrl: normalizeBaseUrl(profile.baseUrl),
    authMethod: normalizeAuthMethod(profile),
    apiUsername: normalizeString(profile.apiUsername),
    apiKey: normalizeString(profile.apiKey),
    userApiKey: normalizeString(profile.userApiKey),
    userApiClientId: normalizeString(profile.userApiClientId),
    defaultClipStyle: profile.defaultClipStyle || DEFAULT_PROFILE.defaultClipStyle,
    defaultDestination: profile.defaultDestination || DEFAULT_PROFILE.defaultDestination,
    defaultCategoryId: normalizeString(profile.defaultCategoryId),
    defaultTopicId: normalizeString(profile.defaultTopicId),
    titleTemplate: normalizeString(profile.titleTemplate) || DEFAULT_PROFILE.titleTemplate,
    titleUrlTemplate: normalizeString(profile.titleUrlTemplate) || DEFAULT_PROFILE.titleUrlTemplate,
    excerptTemplate: normalizeString(profile.excerptTemplate) || DEFAULT_PROFILE.excerptTemplate,
    fullTextTemplate: normalizeString(profile.fullTextTemplate) || DEFAULT_PROFILE.fullTextTemplate,
    textSelectionTemplate: normalizeString(profile.textSelectionTemplate) || DEFAULT_PROFILE.textSelectionTemplate
  };
}
function createProfile(overrides = {}) {
  return normalizeProfile({
    ...overrides,
    id: overrides.id || generateId()
  });
}
var PROFILES_LOCK = "clip-to-discourse-profiles";
var fallbackQueue = Promise.resolve();
function withProfilesLock(task) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(PROFILES_LOCK, task);
  }
  const run = fallbackQueue.then(task, task);
  fallbackQueue = run.then(() => void 0, () => void 0);
  return run;
}
async function readState() {
  const localData = await chrome.storage.local.get(null);
  const syncData = await chrome.storage.sync.get(null);
  const useFaviconForIcon = typeof syncData.useFaviconForIcon === "boolean" ? syncData.useFaviconForIcon : DEFAULT_GLOBAL_SETTINGS.useFaviconForIcon;
  const allowHttp = typeof syncData.allowHttp === "boolean" ? syncData.allowHttp : DEFAULT_GLOBAL_SETTINGS.allowHttp;
  if (Array.isArray(localData.profiles) && localData.profiles.length > 0) {
    const profiles = localData.profiles.map(normalizeProfile);
    const authMethodsChanged = profiles.some((profile, index) => profile.authMethod !== localData.profiles[index].authMethod);
    const activeProfileId = profiles.some((profile) => profile.id === localData.activeProfileId) ? localData.activeProfileId : profiles[0].id;
    const needsRepair = activeProfileId !== localData.activeProfileId || syncData.useFaviconForIcon === void 0 || authMethodsChanged;
    return { source: "local", syncData, profiles, activeProfileId, useFaviconForIcon, allowHttp, needsRepair };
  }
  if (Array.isArray(syncData.profiles) && syncData.profiles.length > 0) {
    const profiles = syncData.profiles.map(normalizeProfile);
    const activeProfileId = profiles.some((profile) => profile.id === syncData.activeProfileId) ? syncData.activeProfileId : profiles[0].id;
    return { source: "sync-migrate", syncData, profiles, activeProfileId, useFaviconForIcon, allowHttp, needsRepair: true };
  }
  return { source: "legacy-migrate", syncData, profiles: null, activeProfileId: "", useFaviconForIcon, allowHttp, needsRepair: true };
}
async function loadStateLocked() {
  const state = await readState();
  const { useFaviconForIcon, allowHttp } = state;
  if (state.source === "local") {
    if (state.needsRepair) {
      await chrome.storage.local.set({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId
      });
      if (state.syncData.useFaviconForIcon === void 0) {
        await chrome.storage.sync.set({ useFaviconForIcon });
      }
    }
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon, allowHttp };
  }
  if (state.source === "sync-migrate") {
    await chrome.storage.local.set({
      profiles: state.profiles,
      activeProfileId: state.activeProfileId
    });
    await chrome.storage.sync.remove(["profiles", "activeProfileId"]);
    if (state.syncData.useFaviconForIcon === void 0) {
      await chrome.storage.sync.set({ useFaviconForIcon });
    }
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon, allowHttp };
  }
  const legacyProfile = createProfile({
    name: "Default",
    baseUrl: state.syncData.baseUrl,
    apiUsername: state.syncData.apiUsername,
    apiKey: state.syncData.apiKey,
    defaultClipStyle: state.syncData.defaultClipStyle,
    defaultDestination: state.syncData.defaultDestination,
    defaultCategoryId: state.syncData.defaultCategoryId,
    defaultTopicId: state.syncData.defaultTopicId,
    titleTemplate: state.syncData.titleTemplate
  });
  const profiles = [legacyProfile];
  const activeProfileId = legacyProfile.id;
  await chrome.storage.local.set({ profiles, activeProfileId });
  await chrome.storage.sync.remove(LEGACY_KEYS);
  await chrome.storage.sync.set({ useFaviconForIcon });
  return { profiles, activeProfileId, useFaviconForIcon, allowHttp };
}
async function loadState() {
  const state = await readState();
  if (state.profiles && !state.needsRepair) {
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon: state.useFaviconForIcon, allowHttp: state.allowHttp };
  }
  return withProfilesLock(loadStateLocked);
}
async function getSettingsState() {
  const state = await loadState();
  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId);
  return {
    ...state,
    activeProfile
  };
}

// shared/favicon.js
var CACHE_KEY = "faviconCache";
var ICON_SIZES = [16, 32];
function createCanvas(size) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(size, size);
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}
function getCanvasContext(canvas) {
  return canvas.getContext("2d");
}
async function loadImageFromBlob(blob) {
  return createImageBitmap(blob);
}
async function blobToImageDataMap(blob) {
  const img = await loadImageFromBlob(blob);
  const imageDataMap = {};
  ICON_SIZES.forEach((size) => {
    const canvas = createCanvas(size);
    const ctx = getCanvasContext(canvas);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    imageDataMap[size] = ctx.getImageData(0, 0, size, size);
  });
  return imageDataMap;
}
async function dataUrlToImageDataMap(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return blobToImageDataMap(blob);
}
function createFallbackImageDataMap(isConnected = true) {
  const imageDataMap = {};
  ICON_SIZES.forEach((size) => {
    const canvas = createCanvas(size);
    const ctx = getCanvasContext(canvas);
    ctx.fillStyle = isConnected ? "#577188" : "#8c959f";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.floor(size * 0.7)}px Lato, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("C", size / 2, size / 2 + 1);
    imageDataMap[size] = ctx.getImageData(0, 0, size, size);
  });
  return imageDataMap;
}
async function getCachedDataUrl(profileId) {
  const data = await chrome.storage.local.get(CACHE_KEY);
  const cache = data[CACHE_KEY] || {};
  return cache[profileId];
}
async function setCachedDataUrl(profileId, dataUrl) {
  const data = await chrome.storage.local.get(CACHE_KEY);
  const cache = data[CACHE_KEY] || {};
  cache[profileId] = dataUrl;
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
}
async function fetchFaviconBlob(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  const faviconUrl = `${normalized}/favicon.ico`;
  try {
    const response = await fetch(faviconUrl);
    if (response.ok && response.headers.get("content-type")?.startsWith("image")) {
      return await response.blob();
    }
  } catch {
  }
  try {
    const response = await fetch(normalized);
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<link[^>]*rel=["'][^"']*\bicon\b[^"']*["'][^>]*>/i);
    if (!match) return null;
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return null;
    const href = hrefMatch[1];
    const iconUrl = new URL(href, normalized).toString();
    const iconResponse = await fetch(iconUrl);
    if (!iconResponse.ok) return null;
    return await iconResponse.blob();
  } catch {
    return null;
  }
}
async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  const base64 = btoa(binary);
  const mimeType = blob.type || "image/png";
  return `data:${mimeType};base64,${base64}`;
}
async function updateActionIconForProfile(profile, useFavicon) {
  if (!isProfileConnected(profile)) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap(false) });
    await chrome.action.setTitle({ title: "Clip To Discourse - connection required" });
    return;
  }
  await chrome.action.setTitle({ title: "Clip To Discourse" });
  if (!useFavicon) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }
  if (!profile?.baseUrl) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }
  const cachedDataUrl = await getCachedDataUrl(profile.id);
  if (cachedDataUrl) {
    try {
      const imageData2 = await dataUrlToImageDataMap(cachedDataUrl);
      await chrome.action.setIcon({ imageData: imageData2 });
      return;
    } catch {
    }
  }
  const blob = await fetchFaviconBlob(profile.baseUrl);
  if (!blob) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }
  const imageData = await blobToImageDataMap(blob);
  await chrome.action.setIcon({ imageData });
  const dataUrl = await blobToDataUrl(blob);
  await setCachedDataUrl(profile.id, dataUrl);
}

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
