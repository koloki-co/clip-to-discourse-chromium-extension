// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import {
  getSettingsState,
  saveActiveProfile,
  addProfile,
  deleteProfile,
  setActiveProfile,
  saveGlobalSettings
} from "../shared/settings.js";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../shared/constants.js";
import { checkUserApiVersion, revokeUserApiKey, testConnection } from "../shared/discourse.js";
import { updateActionIconForProfile } from "../shared/favicon.js";

// Options page controller for managing profiles and defaults.
const form = document.getElementById("settings-form");
const statusEl = document.getElementById("status");
const submitButton = form.querySelector("button[type=submit]");
const testButton = document.getElementById("testConnection");
const profileSelect = document.getElementById("profileSelect");
const addProfileButton = document.getElementById("addProfile");
const deleteProfileButton = document.getElementById("deleteProfile");
const extensionVersion = document.getElementById("extensionVersion");
const authTabButtons = Array.from(document.querySelectorAll(".auth-tab"));
const authPanelAdmin = document.getElementById("authPanelAdmin");
const authPanelUser = document.getElementById("authPanelUser");
const checkUserApiSupportButton = document.getElementById("checkUserApiSupport");
const connectUserApiButton = document.getElementById("connectUserApi");
const revokeUserApiButton = document.getElementById("revokeUserApi");
const userApiStatusEl = document.getElementById("userApiStatus");
const userApiRedirectUrlEl = document.getElementById("userApiRedirectUrl");

// Cache field references to simplify validation and save logic.
const fields = {
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
  fullTextTemplate: document.getElementById("fullTextTemplate"),
  textSelectionTemplate: document.getElementById("textSelectionTemplate")
};

// Error spans for validation feedback.
const errors = {
  baseUrl: document.getElementById("baseUrlError"),
  apiUsername: document.getElementById("apiUsernameError"),
  apiKey: document.getElementById("apiKeyError"),
  userApiKey: document.getElementById("userApiKeyError")
};

let profiles = [];
let activeProfileId = "";
let useFaviconForIcon = false;

const USER_API_SCOPES = "read,write";
const USER_API_APPLICATION_NAME = "Clip To Discourse Chromium Extension";

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
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
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
  return fields.authMethod.value === AUTH_METHODS.USER_API
    ? AUTH_METHODS.USER_API
    : AUTH_METHODS.ADMIN_API_KEY;
}

function setAuthMethod(authMethod) {
  const nextAuthMethod = authMethod === AUTH_METHODS.USER_API
    ? AUTH_METHODS.USER_API
    : AUTH_METHODS.ADMIN_API_KEY;

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
  const version =
    typeof chrome !== "undefined" && chrome.runtime?.getManifest
      ? chrome.runtime.getManifest().version
      : "dev";
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

// Convert a base URL into a Chrome host permission pattern.
function getOriginPattern(baseUrl) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  const parsed = new URL(normalized);
  return `${parsed.origin}/*`;
}

// Ensure the extension has permission to call the Discourse instance.
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

// Populate the profile selector list.
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

// Apply the active profile into the form fields.
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
  fields.textSelectionTemplate.value = profile.textSelectionTemplate || "";
  setUserApiStatus("");
  refreshUserApiControls();
}

// Pull settings from storage and refresh the form UI.
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

// Save profile + global settings back to storage.
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

// Validate credentials against the Discourse API without saving.
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
      authApiVersion
        ? `Connected. User API version: ${authApiVersion}`
        : "Connected with User API key."
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

// Switch active profile and keep the toolbar icon in sync.
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

// Add a new profile with a prompt to collect a name.
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

// Delete the active profile and fall back to another one.
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

// Wire up form actions after the DOM is ready.
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
