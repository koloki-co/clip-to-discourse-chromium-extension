import {
  getSettingsState,
  saveActiveProfile,
  addProfile,
  deleteProfile,
  setActiveProfile,
  saveGlobalSettings
} from "../shared/settings.js";
import { CLIP_STYLES, DESTINATIONS } from "../shared/constants.js";
import { testConnection } from "../shared/discourse.js";
import { updateActionIconForProfile } from "../shared/favicon.js";

const form = document.getElementById("settings-form");
const statusEl = document.getElementById("status");
const submitButton = form.querySelector("button[type=submit]");
const testButton = document.getElementById("testConnection");
const profileSelect = document.getElementById("profileSelect");
const addProfileButton = document.getElementById("addProfile");
const deleteProfileButton = document.getElementById("deleteProfile");

const fields = {
  profileName: document.getElementById("profileName"),
  useFaviconForIcon: document.getElementById("useFaviconForIcon"),
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

let profiles = [];
let activeProfileId = "";
let useFaviconForIcon = false;

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
  fields.titleTemplate.value = profile.titleTemplate || "Clip: {{title}}";
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
      titleTemplate: fields.titleTemplate.value
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
