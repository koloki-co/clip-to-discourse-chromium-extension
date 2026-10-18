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
var THEMES = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark"
};
var MAX_PAYLOAD_LENGTH = 5e4;
var MAX_TITLE_LENGTH = 255;

// shared/payload.js
var TRUNCATION_NOTICE = "\n\n_(truncated by Clip to Discourse \u2014 original exceeded Discourse's 50,000 character post limit)_";
function truncateAtCodePointBoundary(value, maximumLength) {
  const truncated = value.slice(0, maximumLength);
  const finalCodeUnit = truncated.charCodeAt(truncated.length - 1);
  return finalCodeUnit >= 55296 && finalCodeUnit <= 56319 ? truncated.slice(0, -1) : truncated;
}
function truncateRaw(raw) {
  if (typeof raw !== "string") {
    return raw;
  }
  if (raw.length <= MAX_PAYLOAD_LENGTH) {
    return raw;
  }
  const noticeLength = TRUNCATION_NOTICE.length;
  return truncateAtCodePointBoundary(raw, MAX_PAYLOAD_LENGTH - noticeLength) + TRUNCATION_NOTICE;
}
function truncateTitle(title) {
  if (typeof title !== "string") {
    return title;
  }
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }
  return truncateAtCodePointBoundary(title, MAX_TITLE_LENGTH);
}
function parseTags(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const tags = [];
  value.split(",").forEach((entry) => {
    const tag = entry.trim();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  });
  return tags;
}
function buildPayload({ destination, title, categoryId, topicId, raw, tags }) {
  const trimmedRaw = truncateRaw(raw);
  const trimmedTitle = truncateTitle(title);
  if (destination === DESTINATIONS.NEW_TOPIC) {
    const payload = {
      title: trimmedTitle,
      raw: trimmedRaw
    };
    if (categoryId) {
      payload.category = Number(categoryId);
    }
    if (Array.isArray(tags) && tags.length > 0) {
      payload.tags = tags;
    }
    return payload;
  }
  if (destination === DESTINATIONS.APPEND_TOPIC) {
    return {
      topic_id: Number(topicId),
      raw: trimmedRaw
    };
  }
  throw new Error("Unsupported destination mode.");
}

// shared/markdown.js
var DEFAULT_CLIP_TEMPLATES = {
  titleUrl: "### {{title}}\n{{url}}\n",
  excerpt: "### {{title}}\n{{url}}\n\n{{excerpt}}\n\n{{url}}",
  fullText: "### {{title}}\n{{url}}\n\n---\n\n{{full-text}}\n\n---\n\n{{url}}",
  textSelection: "### {{title}}\n{{url}}\n\n{{text-selection-markdown}}\n\n{{url}}"
};
function formatCodeBlock(text) {
  const trimmed = text ? text.trim() : "";
  if (!trimmed) {
    return "";
  }
  return `\`\`\`
${trimmed}
\`\`\``;
}
function normalizeToken(value) {
  return value.toLowerCase().replace(/_/g, "-");
}
function applyTemplate(template, data) {
  if (!template) {
    return "";
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, token) => {
    const key = normalizeToken(token);
    if (!(key in data)) {
      return "";
    }
    return data[key] ?? "";
  });
}
function normalizeTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}
function fallbackTitle() {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  return `${timestamp} Clipped with Clip To Discourse`;
}
function buildTemplateData({
  title,
  url,
  excerpt,
  excerptPlain,
  fullText,
  fullTextPlain,
  selectionText,
  selectionMarkdown
}) {
  const now = /* @__PURE__ */ new Date();
  const date = now.toISOString().slice(0, 10);
  const datetime = now.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const safeUrl = url || "";
  const safeTitle = normalizeTitle(title) || fallbackTitle();
  const safeExcerpt = excerpt ? excerpt.trim() : "";
  const safeExcerptPlain = excerptPlain ? excerptPlain.trim() : "";
  const safeFullText = fullText ? fullText.trim() : "";
  const safeFullTextPlain = fullTextPlain ? fullTextPlain.trim() : "";
  const safeSelectionPlain = selectionText ? selectionText.trim() : "";
  const safeSelectionMarkdown = selectionMarkdown ? selectionMarkdown.trim() : "";
  return {
    title: safeTitle,
    url: safeUrl,
    date,
    datetime,
    excerpt: safeExcerpt,
    "excerpt-plain": safeExcerptPlain,
    "full-text": safeFullText,
    "full-text-markdown": formatCodeBlock(safeFullText),
    "full-text-plain": safeFullTextPlain,
    "text-selection": safeSelectionPlain,
    "text-selection-markdown": safeSelectionMarkdown || safeSelectionPlain
  };
}
function buildTitleTemplateData(title) {
  const now = /* @__PURE__ */ new Date();
  const date = now.toISOString().slice(0, 10);
  const datetime = now.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  return {
    title: normalizeTitle(title) || fallbackTitle(),
    date,
    datetime
  };
}
function applyTitleTemplate(template, title) {
  const safeTemplate = template && template.includes("{{title}}") ? template : "Clip: {{title}}";
  const result = applyTemplate(safeTemplate, buildTitleTemplateData(title));
  return truncateTitle(result);
}
function buildMarkdown({
  title,
  url,
  clipStyle,
  excerpt,
  excerptPlain,
  fullText,
  fullTextPlain,
  selectionText,
  selectionMarkdown,
  templates = {}
}) {
  const data = buildTemplateData({
    title,
    url,
    excerpt,
    excerptPlain,
    fullText,
    fullTextPlain,
    selectionText,
    selectionMarkdown
  });
  if (clipStyle === CLIP_STYLES.TITLE_URL) {
    const template = templates.titleUrl || DEFAULT_CLIP_TEMPLATES.titleUrl;
    return applyTemplate(template, data);
  }
  if (clipStyle === CLIP_STYLES.EXCERPT) {
    const template = templates.excerpt || DEFAULT_CLIP_TEMPLATES.excerpt;
    return applyTemplate(template, data);
  }
  if (clipStyle === CLIP_STYLES.FULL_TEXT) {
    const template = templates.fullText || DEFAULT_CLIP_TEMPLATES.fullText;
    return applyTemplate(template, data);
  }
  if (clipStyle === CLIP_STYLES.TEXT_SELECTION) {
    const template = templates.textSelection || DEFAULT_CLIP_TEMPLATES.textSelection;
    return applyTemplate(template, data);
  }
  throw new Error("Unsupported clip style.");
}

// shared/theme.js
function normalizeTheme(value) {
  return Object.values(THEMES).includes(value) ? value : THEMES.SYSTEM;
}
function applyTheme(value) {
  document.documentElement.dataset.theme = normalizeTheme(value);
}

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
  defaultTags: "",
  titleTemplate: "Clip: {{title}}",
  titleUrlTemplate: DEFAULT_CLIP_TEMPLATES.titleUrl,
  excerptTemplate: DEFAULT_CLIP_TEMPLATES.excerpt,
  fullTextTemplate: DEFAULT_CLIP_TEMPLATES.fullText,
  textSelectionTemplate: DEFAULT_CLIP_TEMPLATES.textSelection
};
var DEFAULT_GLOBAL_SETTINGS = {
  useFaviconForIcon: false,
  allowHttp: false,
  theme: THEMES.SYSTEM
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
    defaultTags: normalizeString(profile.defaultTags),
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
  const theme = normalizeTheme(syncData.theme);
  if (Array.isArray(localData.profiles) && localData.profiles.length > 0) {
    const profiles = localData.profiles.map(normalizeProfile);
    const authMethodsChanged = profiles.some((profile, index) => profile.authMethod !== localData.profiles[index].authMethod);
    const activeProfileId = profiles.some((profile) => profile.id === localData.activeProfileId) ? localData.activeProfileId : profiles[0].id;
    const needsRepair = activeProfileId !== localData.activeProfileId || syncData.useFaviconForIcon === void 0 || syncData.theme !== theme || authMethodsChanged;
    return { source: "local", syncData, profiles, activeProfileId, useFaviconForIcon, allowHttp, theme, needsRepair };
  }
  if (Array.isArray(syncData.profiles) && syncData.profiles.length > 0) {
    const profiles = syncData.profiles.map(normalizeProfile);
    const activeProfileId = profiles.some((profile) => profile.id === syncData.activeProfileId) ? syncData.activeProfileId : profiles[0].id;
    return { source: "sync-migrate", syncData, profiles, activeProfileId, useFaviconForIcon, allowHttp, theme, needsRepair: true };
  }
  return { source: "legacy-migrate", syncData, profiles: null, activeProfileId: "", useFaviconForIcon, allowHttp, theme, needsRepair: true };
}
function getGlobalSettingsRepairs(syncData, useFaviconForIcon, theme) {
  const updates = {};
  if (syncData.useFaviconForIcon === void 0) {
    updates.useFaviconForIcon = useFaviconForIcon;
  }
  if (syncData.theme !== theme) {
    updates.theme = theme;
  }
  return updates;
}
async function loadStateLocked() {
  const state = await readState();
  const { useFaviconForIcon, allowHttp, theme } = state;
  if (state.source === "local") {
    if (state.needsRepair) {
      await chrome.storage.local.set({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId
      });
      const globalRepairs2 = getGlobalSettingsRepairs(state.syncData, useFaviconForIcon, theme);
      if (Object.keys(globalRepairs2).length > 0) {
        await chrome.storage.sync.set(globalRepairs2);
      }
    }
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon, allowHttp, theme };
  }
  if (state.source === "sync-migrate") {
    await chrome.storage.local.set({
      profiles: state.profiles,
      activeProfileId: state.activeProfileId
    });
    await chrome.storage.sync.remove(["profiles", "activeProfileId"]);
    const globalRepairs2 = getGlobalSettingsRepairs(state.syncData, useFaviconForIcon, theme);
    if (Object.keys(globalRepairs2).length > 0) {
      await chrome.storage.sync.set(globalRepairs2);
    }
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon, allowHttp, theme };
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
  const globalRepairs = getGlobalSettingsRepairs(state.syncData, useFaviconForIcon, theme);
  if (Object.keys(globalRepairs).length > 0) {
    await chrome.storage.sync.set(globalRepairs);
  }
  return { profiles, activeProfileId, useFaviconForIcon, allowHttp, theme };
}
async function loadState() {
  const state = await readState();
  if (state.profiles && !state.needsRepair) {
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon: state.useFaviconForIcon, allowHttp: state.allowHttp, theme: state.theme };
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
async function saveGlobalSettings(partial) {
  const updates = {};
  if (typeof partial.useFaviconForIcon === "boolean") {
    updates.useFaviconForIcon = partial.useFaviconForIcon;
  }
  if (typeof partial.allowHttp === "boolean") {
    updates.allowHttp = partial.allowHttp;
  }
  if (typeof partial.theme === "string") {
    updates.theme = normalizeTheme(partial.theme);
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
  }
}
async function setActiveProfile(profileId) {
  await withProfilesLock(async () => {
    const state = await loadStateLocked();
    const exists = state.profiles.some((profile) => profile.id === profileId);
    if (!exists) {
      throw new Error("Selected profile does not exist.");
    }
    await chrome.storage.local.set({ activeProfileId: profileId });
  });
}
async function writeProfileUpdate(state, profileId, partial) {
  const updatedProfiles = state.profiles.map((profile) => {
    if (profile.id !== profileId) {
      return profile;
    }
    return normalizeProfile({
      ...profile,
      ...partial,
      id: profile.id
    });
  });
  await chrome.storage.local.set({ profiles: updatedProfiles });
}
async function saveProfile(profileId, partial) {
  await withProfilesLock(async () => {
    const state = await loadStateLocked();
    if (!state.profiles.some((profile) => profile.id === profileId)) {
      throw new Error("Profile no longer exists.");
    }
    await writeProfileUpdate(state, profileId, partial);
  });
}
async function addProfile(partial = {}) {
  return withProfilesLock(async () => {
    const state = await loadStateLocked();
    const profile = createProfile(partial);
    const profiles = [...state.profiles, profile];
    await chrome.storage.local.set({ profiles, activeProfileId: profile.id });
    return profile;
  });
}
async function duplicateProfile(profileId) {
  return withProfilesLock(async () => {
    const state = await loadStateLocked();
    const source = state.profiles.find((profile2) => profile2.id === profileId);
    if (!source) {
      throw new Error("Profile no longer exists.");
    }
    const profile = createProfile({
      ...source,
      id: "",
      name: `${source.name} copy`
    });
    const profiles = [...state.profiles, profile];
    await chrome.storage.local.set({ profiles, activeProfileId: profile.id });
    return profile;
  });
}
async function deleteProfile(profileId) {
  await withProfilesLock(async () => {
    const state = await loadStateLocked();
    if (state.profiles.length <= 1) {
      throw new Error("At least one profile is required.");
    }
    const profiles = state.profiles.filter((profile) => profile.id !== profileId);
    const activeProfileId = profiles.some((profile) => profile.id === state.activeProfileId) ? state.activeProfileId : profiles[0].id;
    await chrome.storage.local.set({ profiles, activeProfileId });
  });
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
async function createPost({
  baseUrl,
  authMethod,
  apiUsername,
  apiKey,
  userApiKey,
  userApiClientId,
  payload
}) {
  const response = await fetch(`${baseUrl}/posts.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId })
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "posting"));
  }
  try {
    return await response.json() ?? {};
  } catch {
    return {};
  }
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
  let data;
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
    throw new Error(`Could not reach ${baseUrl}: ${error.message}`, { cause: error });
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
function isDecodableImageType(contentType) {
  if (!contentType) {
    return false;
  }
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) {
    return false;
  }
  return type !== "image/svg+xml";
}
function isUsableImageBlob(blob) {
  return Boolean(blob) && blob.size > 0 && isDecodableImageType(blob.type);
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
    if (response.ok && isDecodableImageType(response.headers.get("content-type"))) {
      const blob = await response.blob();
      if (isUsableImageBlob(blob)) {
        return blob;
      }
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
    if (!isDecodableImageType(iconResponse.headers.get("content-type"))) return null;
    const iconBlob = await iconResponse.blob();
    return isUsableImageBlob(iconBlob) ? iconBlob : null;
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
  let imageData;
  try {
    imageData = await blobToImageDataMap(blob);
  } catch {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }
  await chrome.action.setIcon({ imageData });
  const dataUrl = await blobToDataUrl(blob);
  await setCachedDataUrl(profile.id, dataUrl);
}

export {
  CLIP_STYLES,
  DESTINATIONS,
  AUTH_METHODS,
  parseTags,
  buildPayload,
  normalizeTitle,
  fallbackTitle,
  applyTitleTemplate,
  buildMarkdown,
  applyTheme,
  isProfileConnected,
  getSettingsState,
  saveGlobalSettings,
  setActiveProfile,
  saveProfile,
  addProfile,
  duplicateProfile,
  deleteProfile,
  createPost,
  testConnection,
  listCategories,
  checkUserApiVersion,
  createUserApiDeviceRequest,
  pollUserApiDeviceRequest,
  revokeUserApiKey,
  updateActionIconForProfile
};
