import { CLIP_STYLES, DESTINATIONS } from "./constants.js";

export const DEFAULT_SETTINGS = {
  baseUrl: "",
  apiUsername: "",
  apiKey: "",
  defaultClipStyle: CLIP_STYLES.TITLE_URL,
  defaultDestination: DESTINATIONS.NEW_TOPIC,
  defaultCategoryId: "",
  defaultTopicId: "",
  titleTemplate: "Clip: {{title}}"
};

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

export async function getSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    ...settings,
    baseUrl: normalizeBaseUrl(settings.baseUrl),
    apiUsername: normalizeString(settings.apiUsername),
    apiKey: normalizeString(settings.apiKey),
    defaultCategoryId: normalizeString(settings.defaultCategoryId),
    defaultTopicId: normalizeString(settings.defaultTopicId),
    titleTemplate: normalizeString(settings.titleTemplate) || DEFAULT_SETTINGS.titleTemplate
  };
}

export async function saveSettings(partial) {
  const normalized = {
    ...partial
  };

  if ("baseUrl" in normalized) {
    normalized.baseUrl = normalizeBaseUrl(normalized.baseUrl);
  }
  if ("apiUsername" in normalized) {
    normalized.apiUsername = normalizeString(normalized.apiUsername);
  }
  if ("apiKey" in normalized) {
    normalized.apiKey = normalizeString(normalized.apiKey);
  }
  if ("defaultCategoryId" in normalized) {
    normalized.defaultCategoryId = normalizeString(normalized.defaultCategoryId);
  }
  if ("defaultTopicId" in normalized) {
    normalized.defaultTopicId = normalizeString(normalized.defaultTopicId);
  }
  if ("titleTemplate" in normalized) {
    normalized.titleTemplate = normalizeString(normalized.titleTemplate) || DEFAULT_SETTINGS.titleTemplate;
  }

  await chrome.storage.sync.set(normalized);
}
