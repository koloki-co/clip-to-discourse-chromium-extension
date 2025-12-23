import { getSettings, saveSettings } from "../shared/settings.js";
import { CLIP_STYLES, DESTINATIONS } from "../shared/constants.js";
import { testConnection } from "../shared/discourse.js";

const form = document.getElementById("settings-form");
const statusEl = document.getElementById("status");
const submitButton = form.querySelector("button[type=submit]");
const testButton = document.getElementById("testConnection");

const fields = {
  baseUrl: document.getElementById("baseUrl"),
  apiUsername: document.getElementById("apiUsername"),
  apiKey: document.getElementById("apiKey"),
  defaultClipStyle: document.getElementById("defaultClipStyle"),
  defaultDestination: document.getElementById("defaultDestination"),
  defaultCategoryId: document.getElementById("defaultCategoryId"),
  defaultTopicId: document.getElementById("defaultTopicId"),
  titleTemplate: document.getElementById("titleTemplate")
};

const errors = {
  baseUrl: document.getElementById("baseUrlError"),
  apiUsername: document.getElementById("apiUsernameError"),
  apiKey: document.getElementById("apiKeyError")
};

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

async function loadSettings() {
  const settings = await getSettings();
  fields.baseUrl.value = settings.baseUrl || "";
  fields.apiUsername.value = settings.apiUsername || "";
  fields.apiKey.value = settings.apiKey || "";
  fields.defaultClipStyle.value = settings.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  fields.defaultDestination.value = settings.defaultDestination || DESTINATIONS.NEW_TOPIC;
  fields.defaultCategoryId.value = settings.defaultCategoryId || "";
  fields.defaultTopicId.value = settings.defaultTopicId || "";
  fields.titleTemplate.value = settings.titleTemplate || "Clip: {{title}}";
}

async function handleSubmit(event) {
  event.preventDefault();
  clearErrors();

  if (!validateFields()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }

  submitButton.disabled = true;
  testButton.disabled = true;
  setStatus("Saving...");

  try {
    await ensureHostPermission(fields.baseUrl.value);

    await saveSettings({
      baseUrl: fields.baseUrl.value,
      apiUsername: fields.apiUsername.value,
      apiKey: fields.apiKey.value,
      defaultClipStyle: fields.defaultClipStyle.value,
      defaultDestination: fields.defaultDestination.value,
      defaultCategoryId: fields.defaultCategoryId.value,
      defaultTopicId: fields.defaultTopicId.value,
      titleTemplate: fields.titleTemplate.value
    });

    setStatus("Settings saved.");
  } catch (error) {
    setStatus(error.message || "Failed to save settings.", true);
  } finally {
    submitButton.disabled = false;
    testButton.disabled = false;
  }
}

async function handleTestConnection() {
  clearErrors();
  if (!validateFields()) {
    setStatus("Fix the highlighted fields and try again.", true);
    return;
  }

  submitButton.disabled = true;
  testButton.disabled = true;
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
    submitButton.disabled = false;
    testButton.disabled = false;
  }
}

form.addEventListener("submit", handleSubmit);
testButton.addEventListener("click", handleTestConnection);

loadSettings().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
