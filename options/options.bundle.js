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
var AUTH_METHODS = {
  ADMIN_API_KEY: "admin_api_key",
  USER_API: "user_api"
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
  authMethod: AUTH_METHODS.ADMIN_API_KEY,
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
function normalizeAuthMethod(value) {
  return value === AUTH_METHODS.USER_API ? AUTH_METHODS.USER_API : AUTH_METHODS.ADMIN_API_KEY;
}
function normalizeProfile(profile) {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    id: profile.id || generateId(),
    name: normalizeString(profile.name) || DEFAULT_PROFILE.name,
    baseUrl: normalizeBaseUrl(profile.baseUrl),
    authMethod: normalizeAuthMethod(profile.authMethod),
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
function buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId }) {
  const effectiveAuthMethod = authMethod || (userApiKey ? AUTH_METHODS.USER_API : AUTH_METHODS.ADMIN_API_KEY);
  if (effectiveAuthMethod === AUTH_METHODS.USER_API) {
    if (!userApiKey) {
      throw new Error("Missing User API key. Update settings first.");
    }
    const headers = {
      "User-Api-Key": userApiKey
    };
    if (userApiClientId) {
      headers["User-Api-Client-Id"] = userApiClientId;
    }
    return headers;
  }
  if (!apiKey) {
    throw new Error("Missing API key. Update settings first.");
  }
  if (!apiUsername) {
    throw new Error("Missing API username. Update settings first.");
  }
  return {
    "Api-Key": apiKey,
    "Api-Username": apiUsername
  };
}
async function extractErrorMessage(response) {
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
  if (data && (data.errors || data.error)) {
    return (data.errors || data.error).toString();
  }
  return rawText || response.statusText;
}
async function testConnection({
  baseUrl,
  authMethod,
  apiUsername,
  apiKey,
  userApiKey,
  userApiClientId
}) {
  const response = await fetch(`${baseUrl}/t/1.json`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId })
    }
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(`Discourse error: ${errorMessage}`);
  }
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  return data;
}
async function checkUserApiVersion({ baseUrl }) {
  const response = await fetch(`${baseUrl}/user-api-key/new`, {
    method: "HEAD"
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(`Discourse error: ${errorMessage}`);
  }
  return response.headers.get("Auth-Api-Version") || response.headers.get("auth-api-version") || "";
}
async function revokeUserApiKey({ baseUrl, userApiKey, userApiClientId }) {
  if (!userApiKey) {
    throw new Error("Missing User API key.");
  }
  const headers = {
    "Content-Type": "application/json",
    "User-Api-Key": userApiKey
  };
  if (userApiClientId) {
    headers["User-Api-Client-Id"] = userApiClientId;
  }
  const response = await fetch(`${baseUrl}/user-api-key/revoke`, {
    method: "POST",
    headers
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(`Discourse error: ${errorMessage}`);
  }
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
var extensionVersion = document.getElementById("extensionVersion");
var authTabButtons = Array.from(document.querySelectorAll(".auth-tab"));
var authPanelAdmin = document.getElementById("authPanelAdmin");
var authPanelUser = document.getElementById("authPanelUser");
var checkUserApiSupportButton = document.getElementById("checkUserApiSupport");
var connectUserApiButton = document.getElementById("connectUserApi");
var revokeUserApiButton = document.getElementById("revokeUserApi");
var userApiStatusEl = document.getElementById("userApiStatus");
var userApiRedirectUrlEl = document.getElementById("userApiRedirectUrl");
var fields = {
  profileName: document.getElementById("profileName"),
  useFaviconForIcon: document.getElementById("useFaviconForIcon"),
  baseUrl: document.getElementById("baseUrl"),
  authMethod: document.getElementById("authMethod"),
  apiUsername: document.getElementById("apiUsername"),
  apiKey: document.getElementById("apiKey"),
  userApiKey: document.getElementById("userApiKey"),
  userApiClientId: document.getElementById("userApiClientId"),
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
  apiKey: document.getElementById("apiKeyError"),
  userApiKey: document.getElementById("userApiKeyError")
};
var profiles = [];
var activeProfileId = "";
var useFaviconForIcon = false;
var USER_API_SCOPES = "read,write";
var USER_API_APPLICATION_NAME = "Clip To Discourse Chromium Extension";
function createUserApiClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `clip-to-discourse-${crypto.randomUUID()}`;
  }
  return `clip-to-discourse-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function randomHex(length) {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, length);
}
function setUserApiStatus(message, isError = false) {
  if (!userApiStatusEl) {
    return;
  }
  userApiStatusEl.textContent = message;
  userApiStatusEl.style.color = isError ? "#b42318" : "";
}
function ensureUserApiClientId() {
  if (fields.userApiClientId.value.trim()) {
    return fields.userApiClientId.value.trim();
  }
  const clientId = createUserApiClientId();
  fields.userApiClientId.value = clientId;
  return clientId;
}
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
function base64ToArrayBuffer(base64) {
  const normalized = base64.replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
function toPem(base64, label) {
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----
${lines.join("\n")}
-----END ${label}-----`;
}
async function generateUserApiKeyPair() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is unavailable in this browser context.");
  }
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-1"
    },
    true,
    ["encrypt", "decrypt"]
  );
  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyPem = toPem(arrayBufferToBase64(spki), "PUBLIC KEY");
  return { publicKeyPem, privateKey: keyPair.privateKey };
}
async function decryptUserApiPayload(payload, privateKey) {
  const encrypted = base64ToArrayBuffer(payload);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    privateKey,
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}
function getActiveAuthMethod() {
  return fields.authMethod.value === AUTH_METHODS.USER_API ? AUTH_METHODS.USER_API : AUTH_METHODS.ADMIN_API_KEY;
}
function setAuthMethod(authMethod) {
  const nextAuthMethod = authMethod === AUTH_METHODS.USER_API ? AUTH_METHODS.USER_API : AUTH_METHODS.ADMIN_API_KEY;
  fields.authMethod.value = nextAuthMethod;
  authTabButtons.forEach((button) => {
    const isActive = button.dataset.authMethod === nextAuthMethod;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  if (nextAuthMethod === AUTH_METHODS.USER_API) {
    authPanelAdmin.classList.add("hidden");
    authPanelUser.classList.remove("hidden");
  } else {
    authPanelAdmin.classList.remove("hidden");
    authPanelUser.classList.add("hidden");
  }
}
function refreshUserApiControls(disabled = false) {
  if (disabled) {
    checkUserApiSupportButton.disabled = true;
    connectUserApiButton.disabled = true;
    revokeUserApiButton.disabled = true;
    return;
  }
  checkUserApiSupportButton.disabled = false;
  connectUserApiButton.disabled = false;
  revokeUserApiButton.disabled = !fields.userApiKey.value.trim();
}
function setExtensionVersion() {
  if (!extensionVersion) {
    return;
  }
  const version = typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : "dev";
  extensionVersion.textContent = version;
}
function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "";
}
function clearErrors() {
  errors.baseUrl.textContent = "";
  errors.apiUsername.textContent = "";
  errors.apiKey.textContent = "";
  errors.userApiKey.textContent = "";
}
function validateBaseUrlField() {
  const baseUrl = fields.baseUrl.value.trim();
  if (!baseUrl) {
    errors.baseUrl.textContent = "Base URL is required.";
    return false;
  }
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch (error) {
    errors.baseUrl.textContent = "Enter a valid URL (http or https).";
    return false;
  }
  return true;
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
  if (!validateBaseUrlField()) {
    isValid = false;
  }
  if (getActiveAuthMethod() === AUTH_METHODS.USER_API) {
    if (!fields.userApiKey.value.trim()) {
      errors.userApiKey.textContent = "User API Key is required.";
      isValid = false;
    }
  } else {
    if (!fields.apiUsername.value.trim()) {
      errors.apiUsername.textContent = "API Username is required.";
      isValid = false;
    }
    if (!fields.apiKey.value.trim()) {
      errors.apiKey.textContent = "API Key is required.";
      isValid = false;
    }
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
  setAuthMethod(profile.authMethod || AUTH_METHODS.ADMIN_API_KEY);
  fields.apiUsername.value = profile.apiUsername || "";
  fields.apiKey.value = profile.apiKey || "";
  fields.userApiKey.value = profile.userApiKey || "";
  fields.userApiClientId.value = profile.userApiClientId || createUserApiClientId();
  fields.defaultClipStyle.value = profile.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  fields.defaultDestination.value = profile.defaultDestination || DESTINATIONS.NEW_TOPIC;
  fields.defaultCategoryId.value = profile.defaultCategoryId || "";
  fields.defaultTopicId.value = profile.defaultTopicId || "";
  fields.titleTemplate.value = profile.titleTemplate || "{{title}}";
  fields.titleUrlTemplate.value = profile.titleUrlTemplate || "";
  fields.excerptTemplate.value = profile.excerptTemplate || "";
  fields.fullTextTemplate.value = profile.fullTextTemplate || "";
  setUserApiStatus("");
  refreshUserApiControls();
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
  refreshUserApiControls(disabled);
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
    const authMethod = getActiveAuthMethod();
    if (authMethod === AUTH_METHODS.USER_API && !fields.userApiClientId.value.trim()) {
      fields.userApiClientId.value = createUserApiClientId();
    }
    await saveActiveProfile({
      name: fields.profileName.value,
      baseUrl: fields.baseUrl.value,
      authMethod,
      apiUsername: fields.apiUsername.value,
      apiKey: fields.apiKey.value,
      userApiKey: fields.userApiKey.value,
      userApiClientId: fields.userApiClientId.value,
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
      authMethod: getActiveAuthMethod(),
      apiUsername: fields.apiUsername.value.trim(),
      apiKey: fields.apiKey.value.trim(),
      userApiKey: fields.userApiKey.value.trim(),
      userApiClientId: fields.userApiClientId.value.trim()
    });
    setStatus("Connection successful.");
  } catch (error) {
    setStatus(error.message || "Connection failed.", true);
  } finally {
    setButtonsDisabled(false);
  }
}
function getUserApiRedirectUrl() {
  if (typeof chrome === "undefined" || !chrome.identity?.getRedirectURL) {
    throw new Error("Chrome identity API is unavailable. Ensure the extension has identity permission.");
  }
  return chrome.identity.getRedirectURL("discourse-user-api");
}
function setUserApiRedirectUrl() {
  if (!userApiRedirectUrlEl) {
    return;
  }
  try {
    userApiRedirectUrlEl.textContent = getUserApiRedirectUrl();
  } catch {
    userApiRedirectUrlEl.textContent = "Unavailable";
  }
}
async function handleCheckUserApiSupport() {
  clearErrors();
  setUserApiStatus("");
  if (!validateBaseUrlField()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }
  setButtonsDisabled(true);
  setUserApiStatus("Checking API version...");
  try {
    const baseUrl = fields.baseUrl.value.trim().replace(/\/+$/, "");
    await ensureHostPermission(baseUrl);
    const version = await checkUserApiVersion({ baseUrl });
    setUserApiStatus(version ? `User API version: ${version}` : "User API endpoint is reachable.");
    setStatus("User API check successful.");
  } catch (error) {
    setUserApiStatus(error.message || "Failed to check User API support.", true);
    setStatus(error.message || "Failed to check User API support.", true);
  } finally {
    setButtonsDisabled(false);
  }
}
async function handleConnectUserApi() {
  clearErrors();
  setUserApiStatus("");
  if (!validateBaseUrlField()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }
  setButtonsDisabled(true);
  setUserApiStatus("Preparing secure login...");
  try {
    const baseUrl = fields.baseUrl.value.trim().replace(/\/+$/, "");
    await ensureHostPermission(baseUrl);
    const authApiVersion = await checkUserApiVersion({ baseUrl });
    const redirectUrl = getUserApiRedirectUrl();
    const clientId = ensureUserApiClientId();
    const nonce = randomHex(32);
    const { publicKeyPem, privateKey } = await generateUserApiKeyPair();
    const params = new URLSearchParams({
      auth_redirect: redirectUrl,
      application_name: USER_API_APPLICATION_NAME,
      client_id: clientId,
      scopes: USER_API_SCOPES,
      nonce,
      public_key: publicKeyPem,
      padding: "oaep"
    });
    const authUrl = `${baseUrl}/user-api-key/new?${params.toString()}`;
    setUserApiStatus("Waiting for authorization in browser...");
    const redirectResult = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });
    if (!redirectResult) {
      throw new Error("Authorization did not return a callback URL.");
    }
    const payload = new URL(redirectResult).searchParams.get("payload");
    if (!payload) {
      throw new Error("Authorization completed but no payload was returned.");
    }
    const decrypted = JSON.parse(await decryptUserApiPayload(payload, privateKey));
    if (decrypted.nonce !== nonce) {
      throw new Error("Received an invalid authorization payload (nonce mismatch).");
    }
    if (!decrypted.key) {
      throw new Error("Authorization payload did not include a User API key.");
    }
    fields.userApiKey.value = decrypted.key;
    fields.userApiClientId.value = clientId;
    setAuthMethod(AUTH_METHODS.USER_API);
    refreshUserApiControls();
    await saveActiveProfile({
      baseUrl,
      authMethod: AUTH_METHODS.USER_API,
      userApiKey: decrypted.key,
      userApiClientId: clientId
    });
    await loadSettings();
    setUserApiStatus(
      authApiVersion ? `Connected. User API version: ${authApiVersion}` : "Connected with User API key."
    );
    setStatus("User API key connected and saved.");
  } catch (error) {
    setUserApiStatus(error.message || "User API connection failed.", true);
    setStatus(error.message || "User API connection failed.", true);
  } finally {
    setButtonsDisabled(false);
  }
}
async function handleRevokeUserApi() {
  clearErrors();
  setUserApiStatus("");
  if (!validateBaseUrlField()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }
  const userApiKey = fields.userApiKey.value.trim();
  if (!userApiKey) {
    errors.userApiKey.textContent = "User API Key is required.";
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }
  const confirmed = window.confirm("Revoke this User API key now?");
  if (!confirmed) {
    return;
  }
  setButtonsDisabled(true);
  setUserApiStatus("Revoking key...");
  try {
    const baseUrl = fields.baseUrl.value.trim().replace(/\/+$/, "");
    await ensureHostPermission(baseUrl);
    await revokeUserApiKey({
      baseUrl,
      userApiKey,
      userApiClientId: fields.userApiClientId.value.trim()
    });
    fields.userApiKey.value = "";
    setAuthMethod(AUTH_METHODS.ADMIN_API_KEY);
    await saveActiveProfile({
      baseUrl,
      authMethod: AUTH_METHODS.ADMIN_API_KEY,
      userApiKey: "",
      userApiClientId: fields.userApiClientId.value.trim()
    });
    await loadSettings();
    setUserApiStatus("User API key revoked.");
    setStatus("User API key revoked.");
  } catch (error) {
    setUserApiStatus(error.message || "Failed to revoke User API key.", true);
    setStatus(error.message || "Failed to revoke User API key.", true);
  } finally {
    setButtonsDisabled(false);
  }
}
function handleAuthMethodClick(event) {
  const authMethod = event.currentTarget.dataset.authMethod;
  setAuthMethod(authMethod);
  clearErrors();
  setUserApiStatus("");
  setStatus("");
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
checkUserApiSupportButton.addEventListener("click", handleCheckUserApiSupport);
connectUserApiButton.addEventListener("click", handleConnectUserApi);
revokeUserApiButton.addEventListener("click", handleRevokeUserApi);
fields.userApiKey.addEventListener("input", () => {
  refreshUserApiControls();
});
authTabButtons.forEach((button) => {
  button.addEventListener("click", handleAuthMethodClick);
});
setExtensionVersion();
setUserApiRedirectUrl();
loadSettings().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
