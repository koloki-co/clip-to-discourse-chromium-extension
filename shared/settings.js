// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS, THEMES } from "./constants.js";
import { DEFAULT_CLIP_TEMPLATES } from "./markdown.js";
import { normalizeTheme } from "./theme.js";

/**
 * Default per-profile settings, used both as the normalization baseline for
 * every stored profile (see `normalizeProfile`) and as the canonical shape
 * of stored profile objects throughout the codebase.
 * @type {{id: string, name: string, baseUrl: string, authMethod: string, apiUsername: string, apiKey: string, userApiKey: string, userApiClientId: string, defaultClipStyle: string, defaultDestination: string, defaultCategoryId: string, defaultTopicId: string, titleTemplate: string, titleUrlTemplate: string, excerptTemplate: string, fullTextTemplate: string, textSelectionTemplate: string}}
 */
export const DEFAULT_PROFILE = {
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

export const DEFAULT_GLOBAL_SETTINGS = {
  useFaviconForIcon: false,
  allowHttp: false,
  theme: THEMES.SYSTEM
};

/**
 * Check whether a profile has enough stored credentials to attempt a
 * Discourse API call. Does not verify the credentials actually work - see
 * `testConnection` in `shared/discourse.js` for that.
 * @param {object} profile - A profile as returned by {@link getSettingsState}, or `null`/`undefined`.
 * @returns {boolean} `true` if `baseUrl` is set and, depending on `authMethod`, either `userApiKey` or both `apiUsername` and `apiKey` are set.
 */
export function isProfileConnected(profile) {
  if (!profile?.baseUrl) {
    return false;
  }
  if (profile.authMethod === AUTH_METHODS.USER_API) {
    return Boolean(profile.userApiKey);
  }
  return Boolean(profile.apiUsername && profile.apiKey);
}

// Keys from older single-profile storage schema.
const LEGACY_KEYS = [
  "baseUrl",
  "apiUsername",
  "apiKey",
  "defaultClipStyle",
  "defaultDestination",
  "defaultCategoryId",
  "defaultTopicId",
  "titleTemplate"
];

// Prefer crypto UUIDs when available to avoid collisions.
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `profile_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Trim and strip trailing slashes from a Discourse base URL for consistent
 * API calls (endpoints are built by string-concatenating a path onto this).
 * @param {string} value
 * @returns {string} `""` if `value` is falsy.
 */
export function normalizeBaseUrl(value) {
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

// Coerce a raw profile into a complete, valid profile object.
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

// Create a new profile with a fresh id.
function createProfile(overrides = {}) {
  return normalizeProfile({
    ...overrides,
    id: overrides.id || generateId()
  });
}

// Chrome storage has no transactions, so every read-modify-write on the
// profiles array must be serialized across the popup, options page, and
// service worker. All extension contexts share one origin, so a Web Lock
// gives cross-context mutual exclusion; the promise queue fallback covers
// environments without navigator.locks and still serializes within a context.
const PROFILES_LOCK = "clip-to-discourse-profiles";
let fallbackQueue = Promise.resolve();

function withProfilesLock(task) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(PROFILES_LOCK, task);
  }
  const run = fallbackQueue.then(task, task);
  fallbackQueue = run.then(() => undefined, () => undefined);
  return run;
}

// Read and normalize stored state without writing. Reports whether a
// migration or repair write is needed so callers can take the lock first.
//
// Profiles and activeProfileId live in chrome.storage.local (keeps
// credentials on this device only, avoids the 8 KB sync per-item quota).
// Global preferences stay in chrome.storage.sync (small, non-sensitive).
async function readState() {
  const localData = await chrome.storage.local.get(null);
  const syncData = await chrome.storage.sync.get(null);
  const useFaviconForIcon = typeof syncData.useFaviconForIcon === "boolean"
    ? syncData.useFaviconForIcon
    : DEFAULT_GLOBAL_SETTINGS.useFaviconForIcon;
  const allowHttp = typeof syncData.allowHttp === "boolean"
    ? syncData.allowHttp
    : DEFAULT_GLOBAL_SETTINGS.allowHttp;
  const theme = normalizeTheme(syncData.theme);

  // Profiles already in local storage (normal post-migration state).
  if (Array.isArray(localData.profiles) && localData.profiles.length > 0) {
    const profiles = localData.profiles.map(normalizeProfile);
    const authMethodsChanged = profiles.some((profile, index) => profile.authMethod !== localData.profiles[index].authMethod);
    const activeProfileId = profiles.some((profile) => profile.id === localData.activeProfileId)
      ? localData.activeProfileId
      : profiles[0].id;
    const needsRepair = activeProfileId !== localData.activeProfileId
      || syncData.useFaviconForIcon === undefined
      || syncData.theme !== theme
      || authMethodsChanged;

    return { source: "local", syncData, profiles, activeProfileId, useFaviconForIcon, allowHttp, theme, needsRepair };
  }

  // Migration needed: profiles still in sync (pre-R61 layout).
  if (Array.isArray(syncData.profiles) && syncData.profiles.length > 0) {
    const profiles = syncData.profiles.map(normalizeProfile);
    const activeProfileId = profiles.some((profile) => profile.id === syncData.activeProfileId)
      ? syncData.activeProfileId
      : profiles[0].id;
    return { source: "sync-migrate", syncData, profiles, activeProfileId, useFaviconForIcon, allowHttp, theme, needsRepair: true };
  }

  // Legacy single-profile keys in sync (pre-multi-profile layout).
  return { source: "legacy-migrate", syncData, profiles: null, activeProfileId: "", useFaviconForIcon, allowHttp, theme, needsRepair: true };
}

function getGlobalSettingsRepairs(syncData, useFaviconForIcon, theme) {
  const updates = {};
  if (syncData.useFaviconForIcon === undefined) {
    updates.useFaviconForIcon = useFaviconForIcon;
  }
  if (syncData.theme !== theme) {
    updates.theme = theme;
  }
  return updates;
}

// Re-read and persist migrations or repairs. Must be called under the lock so
// the write cannot clobber a concurrent update from another context.
async function loadStateLocked() {
  const state = await readState();
  const { useFaviconForIcon, allowHttp, theme } = state;

  if (state.source === "local") {
    if (state.needsRepair) {
      await chrome.storage.local.set({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId
      });
      const globalRepairs = getGlobalSettingsRepairs(state.syncData, useFaviconForIcon, theme);
      if (Object.keys(globalRepairs).length > 0) {
        await chrome.storage.sync.set(globalRepairs);
      }
    }
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon, allowHttp, theme };
  }

  if (state.source === "sync-migrate") {
    // Move profiles and activeProfileId from sync to local.
    await chrome.storage.local.set({
      profiles: state.profiles,
      activeProfileId: state.activeProfileId
    });
    await chrome.storage.sync.remove(["profiles", "activeProfileId"]);
    const globalRepairs = getGlobalSettingsRepairs(state.syncData, useFaviconForIcon, theme);
    if (Object.keys(globalRepairs).length > 0) {
      await chrome.storage.sync.set(globalRepairs);
    }
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon, allowHttp, theme };
  }

  // Legacy single-profile migration: build from old sync keys into local.
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

// Load settings; ordinary reads never write, and migration or repair happens
// under the lock only when needed.
async function loadState() {
  const state = await readState();
  if (state.profiles && !state.needsRepair) {
    return { profiles: state.profiles, activeProfileId: state.activeProfileId, useFaviconForIcon: state.useFaviconForIcon, allowHttp: state.allowHttp, theme: state.theme };
  }
  return withProfilesLock(loadStateLocked);
}

/**
 * Read all stored profiles and global settings. Pure read on the fast path;
 * transparently migrates legacy storage layouts or repairs inconsistent
 * state under a cross-context lock the first time it's needed, so callers
 * never need to handle migration themselves.
 * @returns {Promise<{profiles: object[], activeProfileId: string, activeProfile: object|undefined, useFaviconForIcon: boolean, allowHttp: boolean, theme: string}>}
 */
export async function getSettingsState() {
  const state = await loadState();
  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId);
  return {
    ...state,
    activeProfile
  };
}

/**
 * Persist a partial update to the global (non-profile) settings:
 * `useFaviconForIcon`, `allowHttp`, `theme`. Fields absent or of the wrong
 * type in `partial` are left unchanged; unrecognized keys are ignored.
 * @param {{useFaviconForIcon?: boolean, allowHttp?: boolean, theme?: string}} partial
 * @returns {Promise<void>}
 */
export async function saveGlobalSettings(partial) {
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

/**
 * Switch the active profile.
 * @param {string} profileId - Must match an existing profile's `id`.
 * @returns {Promise<void>}
 * @throws {Error} If no profile with `profileId` exists.
 */
export async function setActiveProfile(profileId) {
  await withProfilesLock(async () => {
    const state = await loadStateLocked();
    const exists = state.profiles.some((profile) => profile.id === profileId);
    if (!exists) {
      throw new Error("Selected profile does not exist.");
    }
    await chrome.storage.local.set({ activeProfileId: profileId });
  });
}

// Write a merged profile update. Must be called under the lock.
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

/**
 * Merge a partial update into the currently active profile. Prefer
 * {@link saveProfile} for long-running flows (e.g. device authorization)
 * that must keep writing to the profile they started on even if the user
 * switches the active profile meanwhile.
 * @param {object} partial - Fields to merge; passed through {@link DEFAULT_PROFILE}-shaped normalization.
 * @returns {Promise<void>}
 */
export async function saveActiveProfile(partial) {
  await withProfilesLock(async () => {
    const state = await loadStateLocked();
    await writeProfileUpdate(state, state.activeProfileId, partial);
  });
}

/**
 * Merge a partial update into a specific profile by id, so long-running
 * flows can save to the profile they started on even if the active profile
 * changed meanwhile.
 * @param {string} profileId - Must match an existing profile's `id`.
 * @param {object} partial - Fields to merge; passed through {@link DEFAULT_PROFILE}-shaped normalization.
 * @returns {Promise<void>}
 * @throws {Error} If no profile with `profileId` exists (e.g. it was deleted concurrently).
 */
export async function saveProfile(profileId, partial) {
  await withProfilesLock(async () => {
    const state = await loadStateLocked();
    if (!state.profiles.some((profile) => profile.id === profileId)) {
      throw new Error("Profile no longer exists.");
    }
    await writeProfileUpdate(state, profileId, partial);
  });
}

/**
 * Create a new profile (assigned a fresh id, normalized against
 * {@link DEFAULT_PROFILE}), append it to storage, and make it the active
 * profile.
 * @param {object} [partial={}] - Initial field overrides.
 * @returns {Promise<object>} The newly created, normalized profile.
 */
export async function addProfile(partial = {}) {
  return withProfilesLock(async () => {
    const state = await loadStateLocked();
    const profile = createProfile(partial);
    const profiles = [...state.profiles, profile];
    await chrome.storage.local.set({ profiles, activeProfileId: profile.id });
    return profile;
  });
}

/**
 * Duplicate an existing profile, including its connection credentials and
 * defaults, under a fresh id and a `"<name> copy"` name, append it to
 * storage, and make it the active profile.
 * @param {string} profileId - Must match an existing profile's `id`.
 * @returns {Promise<object>} The newly created, normalized profile copy.
 * @throws {Error} If no profile with `profileId` exists.
 */
export async function duplicateProfile(profileId) {
  return withProfilesLock(async () => {
    const state = await loadStateLocked();
    const source = state.profiles.find((profile) => profile.id === profileId);
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

/**
 * Delete a profile. If it was the active profile, another remaining
 * profile becomes active. Does not revoke any credentials the profile
 * held - callers should revoke first (see `revokeUserApiKey` in
 * `shared/discourse.js`) if that's needed.
 * @param {string} profileId - Profile id to remove. Unknown ids are ignored.
 * @returns {Promise<void>}
 * @throws {Error} If this is the last remaining profile (at least one profile is always required).
 */
export async function deleteProfile(profileId) {
  await withProfilesLock(async () => {
    const state = await loadStateLocked();
    if (state.profiles.length <= 1) {
      throw new Error("At least one profile is required.");
    }
    const profiles = state.profiles.filter((profile) => profile.id !== profileId);
    const activeProfileId = profiles.some((profile) => profile.id === state.activeProfileId)
      ? state.activeProfileId
      : profiles[0].id;

    await chrome.storage.local.set({ profiles, activeProfileId });
  });
}
