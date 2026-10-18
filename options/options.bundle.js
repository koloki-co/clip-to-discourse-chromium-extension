import {
  AUTH_METHODS,
  CLIP_STYLES,
  DESTINATIONS,
  addProfile,
  applyTheme,
  checkUserApiVersion,
  createUserApiDeviceRequest,
  deleteProfile,
  duplicateProfile,
  getSettingsState,
  listCategories,
  pollUserApiDeviceRequest,
  revokeUserApiKey,
  saveGlobalSettings,
  saveProfile,
  setActiveProfile,
  testConnection,
  updateActionIconForProfile
} from "../chunks/chunk-I3GXIVOH.js";
import "../chunks/chunk-YLVDSGH3.js";

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
var profileList = document.getElementById("profileList");
var addProfileButton = document.getElementById("addProfile");
var renameProfileButton = document.getElementById("renameProfile");
var duplicateProfileButton = document.getElementById("duplicateProfile");
var deleteProfileButton = document.getElementById("deleteProfile");
var profileRenamePanel = document.getElementById("profileRenamePanel");
var profileNameInput = document.getElementById("profileName");
var profileNameError = document.getElementById("profileNameError");
var saveProfileNameButton = document.getElementById("saveProfileName");
var cancelRenameProfileButton = document.getElementById("cancelRenameProfile");
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
var httpWarning = document.getElementById("httpWarning");
var allowHttpToggle = document.querySelector(".allow-http-toggle");
var fields = {
  useFaviconForIcon: document.getElementById("useFaviconForIcon"),
  theme: document.getElementById("theme"),
  baseUrl: document.getElementById("baseUrl"),
  allowHttp: document.getElementById("allowHttp"),
  authMethod: document.getElementById("authMethod"),
  apiUsername: document.getElementById("apiUsername"),
  apiKey: document.getElementById("apiKey"),
  userApiKey: document.getElementById("userApiKey"),
  userApiClientId: document.getElementById("userApiClientId"),
  defaultClipStyle: document.getElementById("defaultClipStyle"),
  defaultDestination: document.getElementById("defaultDestination"),
  defaultCategoryId: document.getElementById("defaultCategoryId"),
  defaultTopicId: document.getElementById("defaultTopicId"),
  defaultTags: document.getElementById("defaultTags"),
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
  userApiStatusEl.classList.toggle("is-error", isError);
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
var categoriesLoading = false;
async function loadDefaultCategories() {
  const profile = activeProfileCredentials();
  if (!profile.baseUrl || categoriesLoadedForProfileId === activeProfileId) {
    return;
  }
  if (categoriesLoading) {
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
  categoriesLoading = true;
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
    categoriesLoading = false;
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
  statusEl.classList.toggle("is-error", isError);
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
    if (parsed.protocol === "http:" && !fields.allowHttp?.checked) {
      errors.baseUrl.textContent = 'HTTP connections are disabled by default. Enable "Allow HTTP connections (advanced)" below to connect to a non-HTTPS instance.';
      return false;
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
  profileList.innerHTML = "";
  profiles.forEach((profile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-list-item";
    button.dataset.profileId = profile.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(profile.id === activeProfileId));
    button.textContent = profile.name || "Untitled";
    profileList.appendChild(button);
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
  fields.defaultTags.value = profile.defaultTags || "";
  fields.titleTemplate.value = profile.titleTemplate || "{{title}}";
  fields.titleUrlTemplate.value = profile.titleUrlTemplate || "";
  fields.excerptTemplate.value = profile.excerptTemplate || "";
  fields.fullTextTemplate.value = profile.fullTextTemplate || "";
  fields.textSelectionTemplate.value = profile.textSelectionTemplate || "";
  setUserApiStatus("");
  setUserApiDeviceCode();
  refreshUserApiControls();
}
function refreshHttpWarning() {
  if (!allowHttpToggle || !fields.allowHttp) {
    return;
  }
  const baseUrl = fields.baseUrl.value.trim();
  let isHttp = false;
  try {
    isHttp = new URL(baseUrl).protocol === "http:";
  } catch {
  }
  if (isHttp) {
    allowHttpToggle.classList.remove("hidden");
  } else {
    allowHttpToggle.classList.add("hidden");
    if (httpWarning) {
      httpWarning.classList.add("hidden");
    }
  }
}
function updateHttpWarningVisibility() {
  if (!httpWarning || !fields.allowHttp) {
    return;
  }
  httpWarning.classList.toggle("hidden", !fields.allowHttp.checked);
}
async function loadSettings() {
  const state = await getSettingsState();
  profiles = state.profiles || [];
  activeProfileId = state.activeProfileId;
  useFaviconForIcon = state.useFaviconForIcon;
  fields.theme.value = state.theme;
  applyTheme(state.theme);
  if (fields.allowHttp) {
    fields.allowHttp.checked = state.allowHttp || false;
  }
  renderProfiles();
  fillProfileForm(state.activeProfile);
  fields.useFaviconForIcon.checked = useFaviconForIcon;
  refreshHttpWarning();
}
function setButtonsDisabled(disabled) {
  submitButton.disabled = disabled;
  testButton.disabled = disabled;
  addProfileButton.disabled = disabled;
  renameProfileButton.disabled = disabled;
  duplicateProfileButton.disabled = disabled;
  deleteProfileButton.disabled = disabled || profiles.length <= 1;
  fields.theme.disabled = disabled;
  profileList.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
  authTabButtons.forEach((button) => {
    button.disabled = disabled;
  });
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
  const targetProfileId = activeProfileId;
  try {
    await ensureHostPermission(fields.baseUrl.value);
    const authMethod = getActiveAuthMethod();
    if (authMethod === AUTH_METHODS.USER_API && !fields.userApiClientId.value.trim()) {
      fields.userApiClientId.value = createUserApiClientId();
    }
    await saveProfile(targetProfileId, {
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
      defaultTags: fields.defaultTags.value,
      titleTemplate: fields.titleTemplate.value,
      titleUrlTemplate: fields.titleUrlTemplate.value,
      excerptTemplate: fields.excerptTemplate.value,
      fullTextTemplate: fields.fullTextTemplate.value,
      textSelectionTemplate: fields.textSelectionTemplate.value
    });
    await saveGlobalSettings({
      useFaviconForIcon: fields.useFaviconForIcon.checked,
      allowHttp: fields.allowHttp?.checked || false,
      theme: fields.theme.value
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
async function handleThemeChange() {
  const theme = fields.theme.value;
  applyTheme(theme);
  try {
    await saveGlobalSettings({ theme });
  } catch (error) {
    setStatus(error.message || "Failed to save theme preference.", true);
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
  const targetProfileId = activeProfileId;
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
      let interval = Math.max(deviceRequest.interval || 5, 1) * 1e3;
      while (Date.now() < deadline) {
        await wait(interval);
        let result;
        try {
          result = await pollUserApiDeviceRequest({
            baseUrl,
            deviceCode: deviceRequest.device_code
          });
        } catch {
          continue;
        }
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
        if (result.status === "slow_down") {
          interval = Math.min(interval * 2, 3e4);
          continue;
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
    await saveProfile(targetProfileId, {
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
  const targetProfileId = activeProfileId;
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
    await saveProfile(targetProfileId, {
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
async function handleProfileChange(selectedId) {
  if (!selectedId || selectedId === activeProfileId) {
    return;
  }
  closeProfileRenamePanel();
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
function closeProfileRenamePanel() {
  profileRenamePanel.classList.add("hidden");
  renameProfileButton.setAttribute("aria-expanded", "false");
  profileNameInput.value = "";
  profileNameError.textContent = "";
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
  closeProfileRenamePanel();
  closeProfileDeletePanel();
  profileCreatePanel.classList.remove("hidden");
  addProfileButton.setAttribute("aria-expanded", "true");
  newProfileNameInput.focus();
}
function handleRenameProfile() {
  closeProfileCreatePanel();
  closeProfileDeletePanel();
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  profileNameInput.value = activeProfile?.name || "";
  profileRenamePanel.classList.remove("hidden");
  renameProfileButton.setAttribute("aria-expanded", "true");
  profileNameInput.focus();
  profileNameInput.select();
}
async function handleSaveProfileName() {
  const name = profileNameInput.value.trim();
  if (!name) {
    profileNameError.textContent = "Enter a profile name.";
    profileNameInput.focus();
    return;
  }
  saveProfileNameButton.disabled = true;
  try {
    await saveProfile(activeProfileId, { name });
    closeProfileRenamePanel();
    await loadSettings();
    setStatus(`Profile renamed to "${name}".`);
  } catch (error) {
    profileNameError.textContent = error.message || "The profile could not be renamed.";
  } finally {
    saveProfileNameButton.disabled = false;
  }
}
async function handleDuplicateProfile() {
  closeProfileRenamePanel();
  closeProfileCreatePanel();
  closeProfileDeletePanel();
  setButtonsDisabled(true);
  setStatus("Duplicating profile...");
  try {
    const profile = await duplicateProfile(activeProfileId);
    await loadSettings();
    await updateActionIconForProfile(profile, fields.useFaviconForIcon.checked);
    setStatus(`Profile duplicated as "${profile.name}".`);
  } catch (error) {
    setStatus(error.message || "The profile could not be duplicated.", true);
  } finally {
    setButtonsDisabled(false);
  }
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
  closeProfileRenamePanel();
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
profileList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile-id]");
  if (button) {
    handleProfileChange(button.dataset.profileId);
  }
});
addProfileButton.addEventListener("click", handleAddProfile);
renameProfileButton.addEventListener("click", handleRenameProfile);
duplicateProfileButton.addEventListener("click", handleDuplicateProfile);
deleteProfileButton.addEventListener("click", handleDeleteProfile);
saveProfileNameButton.addEventListener("click", handleSaveProfileName);
cancelRenameProfileButton.addEventListener("click", closeProfileRenamePanel);
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
profileNameInput.addEventListener("input", () => {
  profileNameError.textContent = "";
});
profileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleSaveProfileName();
  } else if (event.key === "Escape") {
    closeProfileRenamePanel();
    renameProfileButton.focus();
  }
});
checkUserApiSupportButton.addEventListener("click", handleCheckUserApiSupport);
connectUserApiButton.addEventListener("click", handleConnectUserApi);
revokeUserApiButton.addEventListener("click", handleRevokeUserApi);
fields.defaultCategoryId.addEventListener("pointerdown", loadDefaultCategories);
fields.baseUrl.addEventListener("input", refreshHttpWarning);
if (fields.allowHttp) {
  fields.allowHttp.addEventListener("change", updateHttpWarningVisibility);
}
fields.theme.addEventListener("change", handleThemeChange);
authTabButtons.forEach((button) => {
  button.addEventListener("click", handleAuthMethodClick);
});
setExtensionVersion();
setUserApiRedirectUrl();
loadSettings().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
