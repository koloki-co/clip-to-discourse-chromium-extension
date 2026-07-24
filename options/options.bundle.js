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
  useFaviconForIcon: false
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
async function loadState() {
  const data = await chrome.storage.sync.get(null);
  const useFaviconForIcon2 = typeof data.useFaviconForIcon === "boolean" ? data.useFaviconForIcon : DEFAULT_GLOBAL_SETTINGS.useFaviconForIcon;
  if (Array.isArray(data.profiles) && data.profiles.length > 0) {
    const profiles3 = data.profiles.map(normalizeProfile);
    const authMethodsChanged = profiles3.some((profile, index) => profile.authMethod !== data.profiles[index].authMethod);
    const activeProfileId3 = profiles3.some((profile) => profile.id === data.activeProfileId) ? data.activeProfileId : profiles3[0].id;
    if (activeProfileId3 !== data.activeProfileId || data.useFaviconForIcon === void 0 || authMethodsChanged) {
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
  } catch {
    try {
      rawText = await response.text();
    } catch {
      rawText = "";
    }
  }
  if (data && (data.errors || data.error)) {
    return (data.errors || data.error).toString();
  }
  return rawText || response.statusText;
}
function actionableDiscourseError(response, detail, context) {
  const normalized = detail.toLowerCase();
  let guidance;
  if (normalized.includes("scope") || normalized.includes("not permitted")) {
    guidance = "The available User API scopes are insufficient. Ask the site administrator to enable both read and write in 'allow user API key scopes', then authorize again.";
  } else if (normalized.includes("unable to issue user api keys") || normalized.includes("trust level") || normalized.includes("allowed group")) {
    guidance = "This account is not allowed to create User API keys. Ask the site administrator to enable User API keys and include your group in 'user API key allowed groups'.";
  } else if (normalized.includes("redirect")) {
    guidance = "The site rejected the authorization callback. Current sites should use device authorization; on older sites an administrator must allow the redirect URL shown in Authorization details.";
  } else if (normalized.includes("expired") || response.status === 410) {
    guidance = "The authorization or credential has expired. Start authorization again.";
  } else if (response.status === 401) {
    guidance = "Discourse rejected the stored credential. It may have been revoked or expired; authorize this profile again.";
  } else if (response.status === 403) {
    guidance = context === "posting" ? "Discourse accepted the credential but refused this action. Check that the account can post to the selected category or topic and that write scope is enabled." : "Discourse refused this authorization request. Check User API scopes, allowed groups, and the account's site permissions.";
  } else if (response.status === 404) {
    guidance = "The expected Discourse API endpoint was not found. Check the Base URL and confirm the site is a supported, current Discourse installation.";
  } else if (response.status === 429) {
    guidance = "Discourse is rate-limiting requests. Wait a few minutes before trying again.";
  } else if (response.status >= 500) {
    guidance = "The Discourse site encountered a server error. Retry later or ask the site administrator to inspect the server logs.";
  } else {
    guidance = "Discourse rejected the request. Check the Base URL, authentication method, account permissions, and selected destination.";
  }
  return `${guidance} Server response: ${detail || `HTTP ${response.status}`}`;
}
async function testConnection({
  baseUrl,
  authMethod,
  apiUsername,
  apiKey,
  userApiKey,
  userApiClientId
}) {
  const response = await fetch(`${baseUrl}/session/current.json`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId })
    }
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "connection test"));
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  const username = data?.current_user?.username || data?.user?.username || "";
  return { data, username };
}
async function listCategories({
  baseUrl,
  authMethod,
  apiUsername,
  apiKey,
  userApiKey,
  userApiClientId
}) {
  const response = await fetch(`${baseUrl}/site.json`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      ...buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId })
    }
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "category loading"));
  }
  const data = await response.json();
  const categories = Array.isArray(data.categories) ? data.categories : data.category_list?.categories;
  if (!Array.isArray(categories)) {
    throw new Error("Discourse returned an unexpected category response. The site may need to be updated.");
  }
  const namesById = new Map(categories.map((category) => [category.id, category.name]));
  return categories.filter((category) => Number.isInteger(category.id) && category.name).map((category) => ({
    id: category.id,
    name: category.parent_category_id && namesById.has(category.parent_category_id) ? `${namesById.get(category.parent_category_id)} / ${category.name}` : category.name
  })).sort((left, right) => left.name.localeCompare(right.name));
}
async function checkUserApiVersion({ baseUrl }) {
  let response;
  try {
    response = await fetch(`${baseUrl}/user-api-key/new`, { method: "HEAD" });
  } catch (error) {
    throw new Error(`Could not reach ${baseUrl}: ${error.message}`);
  }
  if (response.status === 404) {
    throw new Error(
      "This Discourse instance does not support the User API key flow. Use an Admin API key instead."
    );
  }
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "support check"));
  }
  return {
    version: response.headers.get("Auth-Api-Version") || response.headers.get("auth-api-version") || "",
    supportsDeviceCode: response.headers.get("Auth-Api-Device-Code")?.toLowerCase() === "true"
  };
}
async function createUserApiDeviceRequest({
  baseUrl,
  applicationName,
  clientId,
  scopes,
  nonce,
  publicKey,
  expiresInSeconds
}) {
  const response = await fetch(`${baseUrl}/user-api-key/device.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      application_name: applicationName,
      client_id: clientId,
      scopes,
      nonce,
      public_key: publicKey,
      padding: "oaep",
      ...expiresInSeconds ? { expires_in_seconds: expiresInSeconds } : {}
    })
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "authorization"));
  }
  const data = await response.json();
  if (!data.device_code || !data.user_code || !data.verification_uri) {
    throw new Error("Discourse returned an incomplete device authorization response.");
  }
  return data;
}
async function pollUserApiDeviceRequest({ baseUrl, deviceCode }) {
  const response = await fetch(`${baseUrl}/user-api-key/device/poll.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode })
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "authorization polling"));
  }
  const data = await response.json();
  if (!data.status) {
    throw new Error("Discourse returned an incomplete authorization status.");
  }
  return data;
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
    throw new Error(actionableDiscourseError(response, errorMessage, "revocation"));
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
  } catch {
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

// shared/user-api-crypto.js
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
  return {
    publicKeyPem: toPem(arrayBufferToBase64(spki), "PUBLIC KEY"),
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}
async function decryptUserApiPayload(payload, privateKey) {
  const encrypted = base64ToArrayBuffer(payload);
  const decrypted = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encrypted);
  return new TextDecoder().decode(decrypted);
}

// options/options.js
var form = document.getElementById("settings-form");
var statusEl = document.getElementById("status");
var submitButton = form.querySelector("button[type=submit]");
var testButton = document.getElementById("testConnection");
var profileSelect = document.getElementById("profileSelect");
var addProfileButton = document.getElementById("addProfile");
var deleteProfileButton = document.getElementById("deleteProfile");
var profileCreatePanel = document.getElementById("profileCreatePanel");
var newProfileNameInput = document.getElementById("newProfileName");
var newProfileNameError = document.getElementById("newProfileNameError");
var createProfileButton = document.getElementById("createProfile");
var cancelAddProfileButton = document.getElementById("cancelAddProfile");
var profileDeletePanel = document.getElementById("profileDeletePanel");
var profileDeleteName = document.getElementById("profileDeleteName");
var confirmDeleteProfileButton = document.getElementById("confirmDeleteProfile");
var cancelDeleteProfileButton = document.getElementById("cancelDeleteProfile");
var extensionVersion = document.getElementById("extensionVersion");
var authTabButtons = Array.from(document.querySelectorAll(".auth-tab"));
var authPanelAdmin = document.getElementById("authPanelAdmin");
var authPanelUser = document.getElementById("authPanelUser");
var checkUserApiSupportButton = document.getElementById("checkUserApiSupport");
var connectUserApiButton = document.getElementById("connectUserApi");
var revokeUserApiButton = document.getElementById("revokeUserApi");
var userApiStatusEl = document.getElementById("userApiStatus");
var userApiRedirectUrlEl = document.getElementById("userApiRedirectUrl");
var userApiConnectionIndicator = document.getElementById("userApiConnectionIndicator");
var userApiConnectionState = document.getElementById("userApiConnectionState");
var userApiDeviceCodePanel = document.getElementById("userApiDeviceCodePanel");
var userApiDeviceCode = document.getElementById("userApiDeviceCode");
var defaultCategoryStatus = document.getElementById("defaultCategoryStatus");
var fields = {
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
  fullTextTemplate: document.getElementById("fullTextTemplate"),
  textSelectionTemplate: document.getElementById("textSelectionTemplate")
};
var errors = {
  baseUrl: document.getElementById("baseUrlError"),
  apiUsername: document.getElementById("apiUsernameError"),
  apiKey: document.getElementById("apiKeyError")
};
var profiles = [];
var activeProfileId = "";
var useFaviconForIcon = false;
var categoriesLoadedForProfileId = "";
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
function setUserApiDeviceCode(code = "") {
  userApiDeviceCode.textContent = code;
  userApiDeviceCodePanel.classList.toggle("hidden", !code);
}
function activeProfileCredentials() {
  return {
    baseUrl: fields.baseUrl.value.trim().replace(/\/+$/, ""),
    authMethod: getActiveAuthMethod(),
    apiUsername: fields.apiUsername.value.trim(),
    apiKey: fields.apiKey.value.trim(),
    userApiKey: fields.userApiKey.value.trim(),
    userApiClientId: fields.userApiClientId.value.trim()
  };
}
function setDefaultCategoryOptions(categories, selectedId = "") {
  fields.defaultCategoryId.innerHTML = '<option value="">Select a category</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = String(category.id);
    option.textContent = category.name;
    fields.defaultCategoryId.appendChild(option);
  });
  if (selectedId && !categories.some((category) => String(category.id) === String(selectedId))) {
    const option = document.createElement("option");
    option.value = String(selectedId);
    option.textContent = `Category ${selectedId}`;
    fields.defaultCategoryId.appendChild(option);
  }
  fields.defaultCategoryId.value = selectedId;
}
async function loadDefaultCategories() {
  const profile = activeProfileCredentials();
  if (!profile.baseUrl || categoriesLoadedForProfileId === activeProfileId) {
    return;
  }
  if (profile.authMethod === AUTH_METHODS.USER_API && !profile.userApiKey) {
    defaultCategoryStatus.textContent = "Authorize this profile before loading categories.";
    return;
  }
  if (profile.authMethod === AUTH_METHODS.ADMIN_API_KEY && (!profile.apiUsername || !profile.apiKey)) {
    defaultCategoryStatus.textContent = "Enter the API username and key before loading categories.";
    return;
  }
  fields.defaultCategoryId.disabled = true;
  defaultCategoryStatus.textContent = "Loading categories...";
  try {
    await ensureHostPermission(profile.baseUrl);
    const selectedId = fields.defaultCategoryId.value;
    const categories = await listCategories(profile);
    setDefaultCategoryOptions(categories, selectedId);
    categoriesLoadedForProfileId = activeProfileId;
    defaultCategoryStatus.textContent = categories.length ? `${categories.length} available categories loaded.` : "No categories are available to this account.";
  } catch (error) {
    defaultCategoryStatus.textContent = error.message || "Categories could not be loaded.";
  } finally {
    fields.defaultCategoryId.disabled = false;
  }
}
function ensureUserApiClientId() {
  if (fields.userApiClientId.value.trim()) {
    return fields.userApiClientId.value.trim();
  }
  const clientId = createUserApiClientId();
  fields.userApiClientId.value = clientId;
  return clientId;
}
function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
  const isAuthorized = Boolean(fields.userApiKey.value.trim());
  revokeUserApiButton.disabled = !isAuthorized;
  connectUserApiButton.textContent = isAuthorized ? "Authorize again" : "Authorize Clip To Discourse";
  userApiConnectionIndicator.classList.toggle("connected", isAuthorized);
  userApiConnectionState.textContent = isAuthorized ? "Authorized" : "Not authorized";
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
  } catch {
    errors.baseUrl.textContent = "Enter a valid URL (http or https).";
    return false;
  }
  return true;
}
function getOriginPattern(baseUrl) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  const parsed = new URL(normalized);
  return `${parsed.protocol}//${parsed.hostname}/*`;
}
async function ensureHostPermission(baseUrl) {
  const originPattern = getOriginPattern(baseUrl);
  const alreadyGranted = await chrome.permissions.contains({ origins: [originPattern] });
  if (alreadyGranted) return true;
  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) {
    throw new Error(`Browser access to ${new URL(baseUrl).origin} was not granted. Authorize that site when Chrome asks so Clip To Discourse can connect directly to it.`);
  }
  return true;
}
function validateFields() {
  clearErrors();
  let isValid = true;
  if (!validateBaseUrlField()) {
    isValid = false;
  }
  if (getActiveAuthMethod() === AUTH_METHODS.ADMIN_API_KEY) {
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
  fields.baseUrl.value = profile.baseUrl || "";
  setAuthMethod(profile.authMethod || AUTH_METHODS.USER_API);
  fields.apiUsername.value = profile.apiUsername || "";
  fields.apiKey.value = profile.apiKey || "";
  fields.userApiKey.value = profile.userApiKey || "";
  fields.userApiClientId.value = profile.userApiClientId || createUserApiClientId();
  fields.defaultClipStyle.value = profile.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  fields.defaultDestination.value = profile.defaultDestination || DESTINATIONS.NEW_TOPIC;
  categoriesLoadedForProfileId = "";
  setDefaultCategoryOptions([], profile.defaultCategoryId || "");
  defaultCategoryStatus.textContent = "Categories load when this field is opened.";
  fields.defaultTopicId.value = profile.defaultTopicId || "";
  fields.titleTemplate.value = profile.titleTemplate || "{{title}}";
  fields.titleUrlTemplate.value = profile.titleUrlTemplate || "";
  fields.excerptTemplate.value = profile.excerptTemplate || "";
  fields.fullTextTemplate.value = profile.fullTextTemplate || "";
  fields.textSelectionTemplate.value = profile.textSelectionTemplate || "";
  setUserApiStatus("");
  setUserApiDeviceCode();
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
      fullTextTemplate: fields.fullTextTemplate.value,
      textSelectionTemplate: fields.textSelectionTemplate.value
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
  if (getActiveAuthMethod() === AUTH_METHODS.USER_API && !fields.userApiKey.value.trim()) {
    setUserApiStatus("Authorize Clip To Discourse before testing the connection.", true);
    setStatus("User API authorization is required.", true);
    return;
  }
  setButtonsDisabled(true);
  setStatus("Testing connection...");
  try {
    await ensureHostPermission(fields.baseUrl.value.trim());
    const result = await testConnection({
      baseUrl: fields.baseUrl.value.trim().replace(/\/+$/, ""),
      authMethod: getActiveAuthMethod(),
      apiUsername: fields.apiUsername.value.trim(),
      apiKey: fields.apiKey.value.trim(),
      userApiKey: fields.userApiKey.value.trim(),
      userApiClientId: fields.userApiClientId.value.trim()
    });
    setStatus(
      result.username ? `Connection successful \u2014 authenticated as @${result.username}.` : "Connection successful."
    );
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
    const capabilities = await checkUserApiVersion({ baseUrl });
    const versionText = capabilities.version ? `User API version: ${capabilities.version}.` : "User API endpoint is reachable.";
    const flowText = capabilities.supportsDeviceCode ? " Device authorization is supported." : " Redirect authorization will be used.";
    setUserApiStatus(`${versionText}${flowText}`);
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
  setUserApiDeviceCode();
  if (!validateBaseUrlField()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }
  setButtonsDisabled(true);
  setUserApiStatus("Preparing secure login...");
  try {
    const baseUrl = fields.baseUrl.value.trim().replace(/\/+$/, "");
    await ensureHostPermission(baseUrl);
    const capabilities = await checkUserApiVersion({ baseUrl });
    const clientId = ensureUserApiClientId();
    const nonce = randomHex(32);
    const { publicKeyPem, privateKey } = await generateUserApiKeyPair();
    let payload;
    if (capabilities.supportsDeviceCode) {
      const deviceRequest = await createUserApiDeviceRequest({
        baseUrl,
        applicationName: USER_API_APPLICATION_NAME,
        clientId,
        scopes: USER_API_SCOPES,
        nonce,
        publicKey: publicKeyPem
      });
      const authorizationUrl = deviceRequest.verification_uri_with_request || deviceRequest.verification_uri;
      setUserApiDeviceCode(deviceRequest.user_code);
      setUserApiStatus("Complete authorization in the Discourse window. This page will update automatically.");
      window.open(authorizationUrl, "_blank", "noopener");
      const deadline = Date.now() + (deviceRequest.expires_in || 600) * 1e3;
      const interval = Math.max(deviceRequest.interval || 5, 1) * 1e3;
      while (Date.now() < deadline) {
        await wait(interval);
        const result = await pollUserApiDeviceRequest({
          baseUrl,
          deviceCode: deviceRequest.device_code
        });
        if (result.status === "authorized") {
          payload = result.payload;
          break;
        }
        if (result.status === "access_denied") {
          throw new Error("Authorization was denied in Discourse.");
        }
        if (result.status === "expired_token") {
          throw new Error("Authorization expired. Try again.");
        }
        if (result.status !== "authorization_pending") {
          throw new Error(`Discourse returned an unexpected authorization status: ${result.status}.`);
        }
      }
      if (!payload) {
        throw new Error("Authorization timed out. Try again.");
      }
    } else {
      const redirectUrl = getUserApiRedirectUrl();
      const params = new URLSearchParams({
        auth_redirect: redirectUrl,
        application_name: USER_API_APPLICATION_NAME,
        client_id: clientId,
        scopes: USER_API_SCOPES,
        nonce,
        public_key: publicKeyPem,
        padding: "oaep"
      });
      if (capabilities.version) {
        params.set("auth_api_version", capabilities.version);
      }
      setUserApiStatus("Waiting for authorization in browser...");
      const redirectResult = await chrome.identity.launchWebAuthFlow({
        url: `${baseUrl}/user-api-key/new?${params.toString()}`,
        interactive: true
      });
      if (!redirectResult) {
        throw new Error("Authorization did not return a callback URL.");
      }
      payload = new URL(redirectResult).searchParams.get("payload");
      if (!payload) {
        throw new Error("Authorization completed but no payload was returned.");
      }
    }
    setUserApiStatus("Authorization approved. Decrypting the returned credential...");
    let decrypted;
    try {
      decrypted = JSON.parse(await decryptUserApiPayload(payload, privateKey));
    } catch (error) {
      throw new Error(`Discourse approved access, but credential decryption failed: ${error.message}`, {
        cause: error
      });
    }
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
    setUserApiDeviceCode();
    await saveActiveProfile({
      baseUrl,
      authMethod: AUTH_METHODS.USER_API,
      userApiKey: decrypted.key,
      userApiClientId: clientId
    });
    await loadSettings();
    let username = "";
    try {
      const result = await testConnection({
        baseUrl,
        authMethod: AUTH_METHODS.USER_API,
        userApiKey: decrypted.key,
        userApiClientId: clientId
      });
      username = result.username || "";
    } catch (verifyError) {
      setUserApiStatus(
        `User API key saved, but verification call failed: ${verifyError.message}`,
        true
      );
      setStatus("User API key saved, but verification failed.", true);
      return;
    }
    const versionSuffix = capabilities.version ? ` (API v${capabilities.version})` : "";
    setUserApiStatus(
      username ? `Connected as @${username}${versionSuffix}.` : `Connected with User API key${versionSuffix}.`
    );
    setStatus("Clip To Discourse is authorized and the credential is saved.");
  } catch (error) {
    const message = error.message || "User API authorization failed before Discourse returned a credential. Check site support and try again.";
    setUserApiStatus(message, true);
    setStatus(message, true);
  } finally {
    if (!fields.userApiKey.value.trim()) {
      setUserApiDeviceCode();
    }
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
    setUserApiStatus("There is no User API authorization to revoke.", true);
    setStatus("No User API authorization is stored.", true);
    return;
  }
  const confirmed = window.confirm("Revoke Clip To Discourse authorization for this profile?");
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
    setUserApiStatus("Authorization revoked.");
    setStatus("Clip To Discourse authorization revoked.");
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
  closeProfileCreatePanel();
  closeProfileDeletePanel();
  setStatus("Switching profile...");
  await setActiveProfile(selectedId);
  await loadSettings();
  await updateActionIconForProfile(
    profiles.find((profile) => profile.id === activeProfileId),
    fields.useFaviconForIcon.checked
  );
  setStatus("");
}
function closeProfileCreatePanel() {
  profileCreatePanel.classList.add("hidden");
  addProfileButton.setAttribute("aria-expanded", "false");
  newProfileNameInput.value = "";
  newProfileNameError.textContent = "";
}
function closeProfileDeletePanel() {
  profileDeletePanel.classList.add("hidden");
  deleteProfileButton.setAttribute("aria-expanded", "false");
}
function handleAddProfile() {
  closeProfileDeletePanel();
  profileCreatePanel.classList.remove("hidden");
  addProfileButton.setAttribute("aria-expanded", "true");
  newProfileNameInput.focus();
}
async function handleCreateProfile() {
  const name = newProfileNameInput.value.trim();
  if (!name) {
    newProfileNameError.textContent = "Enter a name for the new profile.";
    newProfileNameInput.focus();
    return;
  }
  createProfileButton.disabled = true;
  setStatus("Adding profile...");
  try {
    await addProfile({ name });
    closeProfileCreatePanel();
    await loadSettings();
    await updateActionIconForProfile(
      profiles.find((profile) => profile.id === activeProfileId),
      fields.useFaviconForIcon.checked
    );
    setStatus(`Profile "${name}" created.`);
  } catch (error) {
    newProfileNameError.textContent = error.message || "The profile could not be created.";
    setStatus(error.message || "The profile could not be created.", true);
  } finally {
    createProfileButton.disabled = false;
  }
}
function handleDeleteProfile() {
  if (profiles.length <= 1) {
    return;
  }
  closeProfileCreatePanel();
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  profileDeleteName.textContent = activeProfile?.name || "this profile";
  profileDeletePanel.classList.remove("hidden");
  deleteProfileButton.setAttribute("aria-expanded", "true");
  confirmDeleteProfileButton.focus();
}
async function handleConfirmDeleteProfile() {
  confirmDeleteProfileButton.disabled = true;
  setStatus("Deleting profile...");
  try {
    await deleteProfile(activeProfileId);
    closeProfileDeletePanel();
    await loadSettings();
    await updateActionIconForProfile(
      profiles.find((profile) => profile.id === activeProfileId),
      fields.useFaviconForIcon.checked
    );
    setStatus("Profile deleted.");
  } catch (error) {
    setStatus(error.message || "The profile could not be deleted.", true);
  } finally {
    confirmDeleteProfileButton.disabled = false;
  }
}
form.addEventListener("submit", handleSubmit);
testButton.addEventListener("click", handleTestConnection);
profileSelect.addEventListener("change", handleProfileChange);
addProfileButton.addEventListener("click", handleAddProfile);
deleteProfileButton.addEventListener("click", handleDeleteProfile);
createProfileButton.addEventListener("click", handleCreateProfile);
cancelAddProfileButton.addEventListener("click", closeProfileCreatePanel);
confirmDeleteProfileButton.addEventListener("click", handleConfirmDeleteProfile);
cancelDeleteProfileButton.addEventListener("click", closeProfileDeletePanel);
newProfileNameInput.addEventListener("input", () => {
  newProfileNameError.textContent = "";
});
newProfileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleCreateProfile();
  } else if (event.key === "Escape") {
    closeProfileCreatePanel();
    addProfileButton.focus();
  }
});
checkUserApiSupportButton.addEventListener("click", handleCheckUserApiSupport);
connectUserApiButton.addEventListener("click", handleConnectUserApi);
revokeUserApiButton.addEventListener("click", handleRevokeUserApi);
fields.defaultCategoryId.addEventListener("focus", loadDefaultCategories);
fields.defaultCategoryId.addEventListener("pointerdown", loadDefaultCategories);
authTabButtons.forEach((button) => {
  button.addEventListener("click", handleAuthMethodClick);
});
setExtensionVersion();
setUserApiRedirectUrl();
loadSettings().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
