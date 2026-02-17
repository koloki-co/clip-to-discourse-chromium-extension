// shared/constants.js
var CLIP_STYLES = {
  TITLE_URL: "title_url",
  EXCERPT: "excerpt",
  FULL_TEXT: "full_text"
};
var DESTINATIONS = {
  NEW_TOPIC: "new_topic",
  APPEND_TOPIC: "append_topic"
};

// shared/markdown.js
var DEFAULT_CLIP_TEMPLATES = {
  titleUrl: "### {{title}}\n{{url}}\n",
  excerpt: "### {{title}}\n{{url}}\n\n{{excerpt}}\n\n{{url}}",
  fullText: "### {{title}}\n{{url}}\n\n---\n\n{{full-text}}\n\n---\n\n{{url}}"
};

// shared/settings.js
var DEFAULT_PROFILE = {
  id: "",
  name: "Default",
  baseUrl: "",
  apiUsername: "",
  apiKey: "",
  defaultClipStyle: CLIP_STYLES.TITLE_URL,
  defaultDestination: DESTINATIONS.NEW_TOPIC,
  defaultCategoryId: "",
  defaultTopicId: "",
  titleTemplate: "Clip: {{title}}",
  titleUrlTemplate: DEFAULT_CLIP_TEMPLATES.titleUrl,
  excerptTemplate: DEFAULT_CLIP_TEMPLATES.excerpt,
  fullTextTemplate: DEFAULT_CLIP_TEMPLATES.fullText
};
var DEFAULT_GLOBAL_SETTINGS = {
  useFaviconForIcon: false
};
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
function normalizeProfile(profile) {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    id: profile.id || generateId(),
    name: normalizeString(profile.name) || DEFAULT_PROFILE.name,
    baseUrl: normalizeBaseUrl(profile.baseUrl),
    apiUsername: normalizeString(profile.apiUsername),
    apiKey: normalizeString(profile.apiKey),
    defaultClipStyle: profile.defaultClipStyle || DEFAULT_PROFILE.defaultClipStyle,
    defaultDestination: profile.defaultDestination || DEFAULT_PROFILE.defaultDestination,
    defaultCategoryId: normalizeString(profile.defaultCategoryId),
    defaultTopicId: normalizeString(profile.defaultTopicId),
    titleTemplate: normalizeString(profile.titleTemplate) || DEFAULT_PROFILE.titleTemplate,
    titleUrlTemplate: normalizeString(profile.titleUrlTemplate) || DEFAULT_PROFILE.titleUrlTemplate,
    excerptTemplate: normalizeString(profile.excerptTemplate) || DEFAULT_PROFILE.excerptTemplate,
    fullTextTemplate: normalizeString(profile.fullTextTemplate) || DEFAULT_PROFILE.fullTextTemplate
  };
}
function createProfile(overrides = {}) {
  return normalizeProfile({
    ...DEFAULT_PROFILE,
    ...overrides,
    id: overrides.id || generateId()
  });
}
async function loadState() {
  const data = await chrome.storage.sync.get(null);
  const useFaviconForIcon2 = typeof data.useFaviconForIcon === "boolean" ? data.useFaviconForIcon : DEFAULT_GLOBAL_SETTINGS.useFaviconForIcon;
  if (Array.isArray(data.profiles) && data.profiles.length > 0) {
    const profiles3 = data.profiles.map(normalizeProfile);
    const activeProfileId3 = profiles3.some((profile) => profile.id === data.activeProfileId) ? data.activeProfileId : profiles3[0].id;
    if (activeProfileId3 !== data.activeProfileId || data.useFaviconForIcon === void 0) {
      await chrome.storage.sync.set({ profiles: profiles3, activeProfileId: activeProfileId3, useFaviconForIcon: useFaviconForIcon2 });
    }
    return { profiles: profiles3, activeProfileId: activeProfileId3, useFaviconForIcon: useFaviconForIcon2 };
  }
  const legacyProfile = createProfile({
    name: "Default",
    baseUrl: data.baseUrl,
    apiUsername: data.apiUsername,
    apiKey: data.apiKey,
    defaultClipStyle: data.defaultClipStyle,
    defaultDestination: data.defaultDestination,
    defaultCategoryId: data.defaultCategoryId,
    defaultTopicId: data.defaultTopicId,
    titleTemplate: data.titleTemplate
  });
  const profiles2 = [legacyProfile];
  const activeProfileId2 = legacyProfile.id;
  await chrome.storage.sync.set({ profiles: profiles2, activeProfileId: activeProfileId2, useFaviconForIcon: useFaviconForIcon2 });
  await chrome.storage.sync.remove(LEGACY_KEYS);
  return { profiles: profiles2, activeProfileId: activeProfileId2, useFaviconForIcon: useFaviconForIcon2 };
}
async function getSettingsState() {
  const state = await loadState();
  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId);
  return {
    ...state,
    activeProfile
  };
}
async function saveGlobalSettings(partial) {
  const useFaviconForIcon2 = typeof partial.useFaviconForIcon === "boolean" ? partial.useFaviconForIcon : DEFAULT_GLOBAL_SETTINGS.useFaviconForIcon;
  await chrome.storage.sync.set({ useFaviconForIcon: useFaviconForIcon2 });
}
async function setActiveProfile(profileId) {
  const state = await loadState();
  const exists = state.profiles.some((profile) => profile.id === profileId);
  if (!exists) {
    throw new Error("Selected profile does not exist.");
  }
  await chrome.storage.sync.set({ activeProfileId: profileId });
}
async function saveActiveProfile(partial) {
  const state = await loadState();
  const updatedProfiles = state.profiles.map((profile) => {
    if (profile.id !== state.activeProfileId) {
      return profile;
    }
    return normalizeProfile({
      ...profile,
      ...partial,
      id: profile.id
    });
  });
  await chrome.storage.sync.set({ profiles: updatedProfiles });
}
async function addProfile(partial = {}) {
  const state = await loadState();
  const profile = createProfile(partial);
  const profiles2 = [...state.profiles, profile];
  await chrome.storage.sync.set({ profiles: profiles2, activeProfileId: profile.id });
  return profile;
}
async function deleteProfile(profileId) {
  const state = await loadState();
  if (state.profiles.length <= 1) {
    throw new Error("At least one profile is required.");
  }
  const profiles2 = state.profiles.filter((profile) => profile.id !== profileId);
  const activeProfileId2 = profiles2.some((profile) => profile.id === state.activeProfileId) ? state.activeProfileId : profiles2[0].id;
  await chrome.storage.sync.set({ profiles: profiles2, activeProfileId: activeProfileId2 });
}

// shared/discourse.js
async function testConnection({ baseUrl, apiUsername, apiKey }) {
  const response = await fetch(`${baseUrl}/t/1.json`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
      "Api-Username": apiUsername
    }
  });
  let data = null;
  let rawText = "";
  try {
    data = await response.json();
  } catch (error) {
    try {
      rawText = await response.text();
    } catch (textError) {
      rawText = "";
    }
  }
  if (!response.ok) {
    let errorMessage = response.statusText;
    if (data && (data.errors || data.error)) {
      errorMessage = (data.errors || data.error).toString();
    } else if (rawText) {
      errorMessage = rawText;
    }
    throw new Error(`Discourse error: ${errorMessage}`);
  }
  return data;
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
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
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
function createFallbackImageDataMap() {
  const imageDataMap = {};
  ICON_SIZES.forEach((size) => {
    const canvas = createCanvas(size);
    const ctx = getCanvasContext(canvas);
    ctx.fillStyle = "#577188";
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
  } catch (error) {
  }
  try {
    const response = await fetch(normalized);
    if (!response.ok) return null;
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const iconLink = doc.querySelector("link[rel~='icon']");
    if (!iconLink) return null;
    const href = iconLink.getAttribute("href");
    if (!href) return null;
    const iconUrl = new URL(href, normalized).toString();
    const iconResponse = await fetch(iconUrl);
    if (!iconResponse.ok) return null;
    return await iconResponse.blob();
  } catch (error) {
    return null;
  }
}
async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read favicon data."));
    reader.readAsDataURL(blob);
  });
}
async function updateActionIconForProfile(profile, useFavicon) {
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
    } catch (error) {
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

// options/options.js
var form = document.getElementById("settings-form");
var statusEl = document.getElementById("status");
var submitButton = form.querySelector("button[type=submit]");
var testButton = document.getElementById("testConnection");
var profileSelect = document.getElementById("profileSelect");
var addProfileButton = document.getElementById("addProfile");
var deleteProfileButton = document.getElementById("deleteProfile");
var fields = {
  profileName: document.getElementById("profileName"),
  useFaviconForIcon: document.getElementById("useFaviconForIcon"),
  baseUrl: document.getElementById("baseUrl"),
  apiUsername: document.getElementById("apiUsername"),
  apiKey: document.getElementById("apiKey"),
  defaultClipStyle: document.getElementById("defaultClipStyle"),
  defaultDestination: document.getElementById("defaultDestination"),
  defaultCategoryId: document.getElementById("defaultCategoryId"),
  defaultTopicId: document.getElementById("defaultTopicId"),
  titleTemplate: document.getElementById("titleTemplate"),
  titleUrlTemplate: document.getElementById("titleUrlTemplate"),
  excerptTemplate: document.getElementById("excerptTemplate"),
  fullTextTemplate: document.getElementById("fullTextTemplate")
};
var errors = {
  baseUrl: document.getElementById("baseUrlError"),
  apiUsername: document.getElementById("apiUsernameError"),
  apiKey: document.getElementById("apiKeyError")
};
var profiles = [];
var activeProfileId = "";
var useFaviconForIcon = false;
function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "";
}
function clearErrors() {
  errors.baseUrl.textContent = "";
  errors.apiUsername.textContent = "";
  errors.apiKey.textContent = "";
}
function getOriginPattern(baseUrl) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  const parsed = new URL(normalized);
  return `${parsed.origin}/*`;
}
async function ensureHostPermission(baseUrl) {
  const originPattern = getOriginPattern(baseUrl);
  const alreadyGranted = await chrome.permissions.contains({ origins: [originPattern] });
  if (alreadyGranted) return true;
  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) {
    throw new Error("Host permission was not granted. Please allow access to your Discourse site.");
  }
  return true;
}
function validateFields() {
  clearErrors();
  let isValid = true;
  const baseUrl = fields.baseUrl.value.trim();
  if (!baseUrl) {
    errors.baseUrl.textContent = "Base URL is required.";
    isValid = false;
  } else {
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch (error) {
      errors.baseUrl.textContent = "Enter a valid URL (http or https).";
      isValid = false;
    }
  }
  if (!fields.apiUsername.value.trim()) {
    errors.apiUsername.textContent = "API Username is required.";
    isValid = false;
  }
  if (!fields.apiKey.value.trim()) {
    errors.apiKey.textContent = "API Key is required.";
    isValid = false;
  }
  return isValid;
}
function renderProfiles() {
  profileSelect.innerHTML = "";
  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name || "Untitled";
    if (profile.id === activeProfileId) {
      option.selected = true;
    }
    profileSelect.appendChild(option);
  });
  deleteProfileButton.disabled = profiles.length <= 1;
}
function fillProfileForm(profile) {
  fields.profileName.value = profile.name || "";
  fields.baseUrl.value = profile.baseUrl || "";
  fields.apiUsername.value = profile.apiUsername || "";
  fields.apiKey.value = profile.apiKey || "";
  fields.defaultClipStyle.value = profile.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  fields.defaultDestination.value = profile.defaultDestination || DESTINATIONS.NEW_TOPIC;
  fields.defaultCategoryId.value = profile.defaultCategoryId || "";
  fields.defaultTopicId.value = profile.defaultTopicId || "";
  fields.titleTemplate.value = profile.titleTemplate || "{{title}}";
  fields.titleUrlTemplate.value = profile.titleUrlTemplate || "";
  fields.excerptTemplate.value = profile.excerptTemplate || "";
  fields.fullTextTemplate.value = profile.fullTextTemplate || "";
}
async function loadSettings() {
  const state = await getSettingsState();
  profiles = state.profiles || [];
  activeProfileId = state.activeProfileId;
  useFaviconForIcon = state.useFaviconForIcon;
  renderProfiles();
  fillProfileForm(state.activeProfile);
  fields.useFaviconForIcon.checked = useFaviconForIcon;
}
function setButtonsDisabled(disabled) {
  submitButton.disabled = disabled;
  testButton.disabled = disabled;
  addProfileButton.disabled = disabled;
  deleteProfileButton.disabled = disabled || profiles.length <= 1;
}
async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();
  if (!validateFields()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }
  setButtonsDisabled(true);
  setStatus("Saving...");
  try {
    await ensureHostPermission(fields.baseUrl.value);
    await saveActiveProfile({
      name: fields.profileName.value,
      baseUrl: fields.baseUrl.value,
      apiUsername: fields.apiUsername.value,
      apiKey: fields.apiKey.value,
      defaultClipStyle: fields.defaultClipStyle.value,
      defaultDestination: fields.defaultDestination.value,
      defaultCategoryId: fields.defaultCategoryId.value,
      defaultTopicId: fields.defaultTopicId.value,
      titleTemplate: fields.titleTemplate.value,
      titleUrlTemplate: fields.titleUrlTemplate.value,
      excerptTemplate: fields.excerptTemplate.value,
      fullTextTemplate: fields.fullTextTemplate.value
    });
    await saveGlobalSettings({
      useFaviconForIcon: fields.useFaviconForIcon.checked
    });
    await loadSettings();
    await updateActionIconForProfile(
      profiles.find((profile) => profile.id === activeProfileId),
      fields.useFaviconForIcon.checked
    );
    setStatus("Settings saved.");
  } catch (error) {
    setStatus(error.message || "Failed to save settings.", true);
  } finally {
    setButtonsDisabled(false);
  }
}
async function handleTestConnection() {
  clearErrors();
  if (!validateFields()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }
  setButtonsDisabled(true);
  setStatus("Testing connection...");
  try {
    await ensureHostPermission(fields.baseUrl.value.trim());
    await testConnection({
      baseUrl: fields.baseUrl.value.trim().replace(/\/+$/, ""),
      apiUsername: fields.apiUsername.value.trim(),
      apiKey: fields.apiKey.value.trim()
    });
    setStatus("Connection successful.");
  } catch (error) {
    setStatus(error.message || "Connection failed.", true);
  } finally {
    setButtonsDisabled(false);
  }
}
async function handleProfileChange() {
  const selectedId = profileSelect.value;
  if (!selectedId || selectedId === activeProfileId) {
    return;
  }
  setStatus("Switching profile...");
  await setActiveProfile(selectedId);
  await loadSettings();
  await updateActionIconForProfile(
    profiles.find((profile) => profile.id === activeProfileId),
    fields.useFaviconForIcon.checked
  );
  setStatus("");
}
async function handleAddProfile() {
  const name = window.prompt("Profile name");
  if (!name) {
    return;
  }
  setStatus("Adding profile...");
  await addProfile({ name });
  await loadSettings();
  await updateActionIconForProfile(
    profiles.find((profile) => profile.id === activeProfileId),
    fields.useFaviconForIcon.checked
  );
  setStatus("");
}
async function handleDeleteProfile() {
  if (profiles.length <= 1) {
    return;
  }
  const confirmed = window.confirm("Delete this profile? This cannot be undone.");
  if (!confirmed) {
    return;
  }
  setStatus("Deleting profile...");
  await deleteProfile(activeProfileId);
  await loadSettings();
  await updateActionIconForProfile(
    profiles.find((profile) => profile.id === activeProfileId),
    fields.useFaviconForIcon.checked
  );
  setStatus("");
}
form.addEventListener("submit", handleSubmit);
testButton.addEventListener("click", handleTestConnection);
profileSelect.addEventListener("change", handleProfileChange);
addProfileButton.addEventListener("click", handleAddProfile);
deleteProfileButton.addEventListener("click", handleDeleteProfile);
loadSettings().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
