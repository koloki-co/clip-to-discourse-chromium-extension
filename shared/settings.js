// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { CLIP_STYLES, DESTINATIONS } from "./constants.js";

// Default per-profile settings used for normalization and migrations.
export const DEFAULT_PROFILE = {
  id: "",
  name: "Default",
  baseUrl: "",
  apiUsername: "",
  apiKey: "",
  defaultClipStyle: CLIP_STYLES.TITLE_URL,
  defaultDestination: DESTINATIONS.NEW_TOPIC,
  defaultCategoryId: "",
  defaultTopicId: "",
  titleTemplate: "Clip: {{title}}"
};

export const DEFAULT_GLOBAL_SETTINGS = {
  useFaviconForIcon: false
};

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

// Normalize and strip trailing slashes for consistent API calls.
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

// Coerce a raw profile into a complete, valid profile object.
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
    titleTemplate: normalizeString(profile.titleTemplate) || DEFAULT_PROFILE.titleTemplate
  };
}

// Create a new profile with a fresh id.
function createProfile(overrides = {}) {
  return normalizeProfile({
    ...DEFAULT_PROFILE,
    ...overrides,
    id: overrides.id || generateId()
  });
}

// Load settings and migrate legacy single-profile data if needed.
async function loadState() {
  const data = await chrome.storage.sync.get(null);
  const useFaviconForIcon = typeof data.useFaviconForIcon === "boolean"
    ? data.useFaviconForIcon
    : DEFAULT_GLOBAL_SETTINGS.useFaviconForIcon;

  if (Array.isArray(data.profiles) && data.profiles.length > 0) {
    const profiles = data.profiles.map(normalizeProfile);
    const activeProfileId = profiles.some((profile) => profile.id === data.activeProfileId)
      ? data.activeProfileId
      : profiles[0].id;

    if (activeProfileId !== data.activeProfileId || data.useFaviconForIcon === undefined) {
      await chrome.storage.sync.set({ profiles, activeProfileId, useFaviconForIcon });
    }

    return { profiles, activeProfileId, useFaviconForIcon };
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

  const profiles = [legacyProfile];
  const activeProfileId = legacyProfile.id;

  await chrome.storage.sync.set({ profiles, activeProfileId, useFaviconForIcon });
  await chrome.storage.sync.remove(LEGACY_KEYS);

  return { profiles, activeProfileId, useFaviconForIcon };
}

// Return full settings state with the active profile expanded.
export async function getSettingsState() {
  const state = await loadState();
  const activeProfile = state.profiles.find((profile) => profile.id === state.activeProfileId);
  return {
    ...state,
    activeProfile
  };
}

// Update the small set of global settings.
export async function saveGlobalSettings(partial) {
  const useFaviconForIcon = typeof partial.useFaviconForIcon === "boolean"
    ? partial.useFaviconForIcon
    : DEFAULT_GLOBAL_SETTINGS.useFaviconForIcon;
  await chrome.storage.sync.set({ useFaviconForIcon });
}

// Persist active profile id only if it exists.
export async function setActiveProfile(profileId) {
  const state = await loadState();
  const exists = state.profiles.some((profile) => profile.id === profileId);
  if (!exists) {
    throw new Error("Selected profile does not exist.");
  }
  await chrome.storage.sync.set({ activeProfileId: profileId });
}

// Merge changes into the active profile in storage.
export async function saveActiveProfile(partial) {
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

// Add a new profile and make it active.
export async function addProfile(partial = {}) {
  const state = await loadState();
  const profile = createProfile(partial);
  const profiles = [...state.profiles, profile];
  await chrome.storage.sync.set({ profiles, activeProfileId: profile.id });
  return profile;
}

// Remove a profile, ensuring at least one remains active.
export async function deleteProfile(profileId) {
  const state = await loadState();
  if (state.profiles.length <= 1) {
    throw new Error("At least one profile is required.");
  }
  const profiles = state.profiles.filter((profile) => profile.id !== profileId);
  const activeProfileId = profiles.some((profile) => profile.id === state.activeProfileId)
    ? state.activeProfileId
    : profiles[0].id;

  await chrome.storage.sync.set({ profiles, activeProfileId });
}
