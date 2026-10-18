import {
  AUTH_METHODS,
  CLIP_STYLES,
  DESTINATIONS,
  applyTheme,
  applyTitleTemplate,
  buildMarkdown,
  buildPayload,
  createPost,
  fallbackTitle,
  getSettingsState,
  isProfileConnected,
  listCategories,
  normalizeTitle,
  parseTags,
  setActiveProfile,
  updateActionIconForProfile
} from "../chunks/chunk-I3GXIVOH.js";
import "../chunks/chunk-YLVDSGH3.js";

// popup/popup.js
var form = document.getElementById("clip-form");
var statusEl = document.getElementById("status");
var categoryField = document.getElementById("category-field");
var topicField = document.getElementById("topic-field");
var categoryInput = document.getElementById("categoryId");
var topicInput = document.getElementById("topicId");
var tagsField = document.getElementById("tags-field");
var tagsInput = document.getElementById("tags");
var submitButton = form.querySelector("button[type=submit]");
var profileSelect = document.getElementById("profileSelect");
var popupExtensionVersion = document.getElementById("popupExtensionVersion");
var connectionRequired = document.getElementById("connection-required");
var categoryStatus = document.getElementById("category-status");
var currentProfile = null;
var profiles = [];
var activeProfileId = "";
var useFaviconForIcon = false;
var cachedPageInfo = null;
var categoriesLoadedForProfileId = "";
function setExtensionVersion() {
  if (!popupExtensionVersion) {
    return;
  }
  const version = typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : "dev";
  popupExtensionVersion.textContent = version;
}
function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}
function setFormEnabled(enabled) {
  form.querySelectorAll("input, button, select").forEach((element) => {
    element.disabled = !enabled;
  });
}
function ensureValidId(value, label) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return numeric;
}
function setCategoryOptions(categories, selectedId = "") {
  categoryInput.innerHTML = '<option value="">Select a category</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = String(category.id);
    option.textContent = category.name;
    categoryInput.appendChild(option);
  });
  if (selectedId && !categories.some((category) => String(category.id) === String(selectedId))) {
    const option = document.createElement("option");
    option.value = String(selectedId);
    option.textContent = `Category ${selectedId}`;
    categoryInput.appendChild(option);
  }
  categoryInput.value = selectedId;
}
async function loadCategories() {
  if (!isProfileConnected(currentProfile) || categoriesLoadedForProfileId === currentProfile.id) {
    return;
  }
  const requestProfile = currentProfile;
  categoryInput.disabled = true;
  categoryStatus.textContent = "Loading categories...";
  try {
    const selectedId = categoryInput.value || requestProfile.defaultCategoryId || "";
    const categories = await listCategories(requestProfile);
    if (currentProfile?.id === requestProfile.id) {
      setCategoryOptions(categories, selectedId);
      categoriesLoadedForProfileId = requestProfile.id;
      categoryStatus.textContent = categories.length ? `${categories.length} available categories loaded.` : "No categories are available to this account.";
    }
  } catch (error) {
    if (currentProfile?.id === requestProfile.id) {
      categoryStatus.textContent = error.message || "Categories could not be loaded.";
    }
  } finally {
    categoryInput.disabled = false;
  }
}
function toggleDestinationFields(destination) {
  if (destination === DESTINATIONS.NEW_TOPIC) {
    categoryField.classList.remove("hidden");
    topicField.classList.add("hidden");
    tagsField.classList.remove("hidden");
  } else {
    categoryField.classList.add("hidden");
    topicField.classList.remove("hidden");
    tagsField.classList.add("hidden");
  }
}
function getSelectedValue(name) {
  const input = form.querySelector(`input[name='${name}']:checked`);
  return input ? input.value : "";
}
async function fetchActiveTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error("No active tab found.");
  }
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
      const docTitle = (document.title || "").trim();
      const title = docTitle || (ogTitle ? ogTitle.trim() : "");
      const url = window.location.href;
      const article = document.querySelector("article") || document.querySelector("main") || document.body;
      const fullText = article ? article.innerText : "";
      const pageText = document.body ? document.body.innerText : fullText;
      const fullHtml = article ? article.innerHTML : "";
      const pageHtml = document.body ? document.body.innerHTML : fullHtml;
      const selection = window.getSelection ? window.getSelection() : null;
      let selectionText = "";
      let selectionHtml = "";
      if (selection && selection.rangeCount > 0) {
        selectionText = selection.toString();
        const container = document.createElement("div");
        container.appendChild(selection.getRangeAt(0).cloneContents());
        selectionHtml = container.innerHTML;
      }
      return { title, url, fullText, pageText, fullHtml, pageHtml, selectionText, selectionHtml };
    }
  });
  if (!injectionResult?.result) {
    throw new Error("Could not read the page content. The tab may be a privileged page (chrome://, about:) or the page may have blocked content access.");
  }
  return injectionResult.result;
}
async function getActiveTabInfo() {
  if (!cachedPageInfo) {
    cachedPageInfo = await fetchActiveTabInfo();
  }
  return cachedPageInfo;
}
function validateSettings(settings) {
  if (!settings.baseUrl) {
    throw new Error("Missing Discourse Base URL. Update settings first.");
  }
  if (settings.authMethod === AUTH_METHODS.USER_API) {
    if (!settings.userApiKey) {
      throw new Error("Clip To Discourse is not authorized for this profile. Authorize it in Settings first.");
    }
    return;
  }
  if (!settings.apiUsername) {
    throw new Error("Missing API Username. Update settings first.");
  }
  if (!settings.apiKey) {
    throw new Error("Missing API Key. Update settings first.");
  }
}
function buildTopicTitle({ title }) {
  const safeTitle = normalizeTitle(title) || fallbackTitle();
  return applyTitleTemplate(currentProfile.titleTemplate, safeTitle);
}
async function refreshActionIcon() {
  try {
    await updateActionIconForProfile(currentProfile, useFaviconForIcon);
  } catch (error) {
    console.error("Failed to update action icon:", error);
  }
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
}
function applyProfileDefaults(profile) {
  const defaultClipStyle = profile.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  const defaultDestination = profile.defaultDestination || DESTINATIONS.NEW_TOPIC;
  const clipInput = form.querySelector(`input[name='clipStyle'][value='${defaultClipStyle}']`);
  if (clipInput) {
    clipInput.checked = true;
  }
  const destinationInput = form.querySelector(`input[name='destination'][value='${defaultDestination}']`);
  if (destinationInput) {
    destinationInput.checked = true;
  }
  setCategoryOptions([], profile.defaultCategoryId || "");
  topicInput.value = profile.defaultTopicId || "";
  tagsInput.value = profile.defaultTags || "";
  toggleDestinationFields(defaultDestination);
}
async function handleSubmit(event) {
  event.preventDefault();
  submitButton.disabled = true;
  setStatus("Clipping...");
  try {
    validateSettings(currentProfile);
    const destination = getSelectedValue("destination");
    const clipStyle = getSelectedValue("clipStyle");
    const categoryId = categoryInput.value.trim();
    const topicId = topicInput.value.trim();
    if (destination === DESTINATIONS.NEW_TOPIC && !categoryId) {
      throw new Error("Category ID is required for new topics.");
    }
    if (destination === DESTINATIONS.APPEND_TOPIC && !topicId) {
      throw new Error("Topic ID is required for appending.");
    }
    if (destination === DESTINATIONS.NEW_TOPIC && categoryId) {
      ensureValidId(categoryId, "Category ID");
    }
    if (destination === DESTINATIONS.APPEND_TOPIC && topicId) {
      ensureValidId(topicId, "Topic ID");
    }
    const pageInfo = await getActiveTabInfo();
    const title = normalizeTitle(pageInfo.title) || fallbackTitle();
    const url = pageInfo.url;
    let excerpt = "";
    let excerptPlain = "";
    let fullText = "";
    let fullTextPlain = "";
    let selectionText = "";
    let selectionMarkdown = "";
    if (clipStyle === CLIP_STYLES.EXCERPT) {
      try {
        const { buildExcerpt, htmlToMarkdown } = await import("../chunks/extract-5ZF2PQK2.js");
        excerptPlain = buildExcerpt(pageInfo.pageText);
        excerpt = buildExcerpt(htmlToMarkdown(pageInfo.pageHtml));
      } catch {
        excerpt = "";
      }
    } else if (clipStyle === CLIP_STYLES.FULL_TEXT) {
      try {
        const { htmlToMarkdownFullPage, normalizeText } = await import("../chunks/extract-5ZF2PQK2.js");
        fullTextPlain = normalizeText(pageInfo.fullText);
        fullText = normalizeText(
          htmlToMarkdownFullPage(pageInfo.fullHtml, { baseUrl: url })
        );
      } catch {
        fullText = "";
      }
    } else if (clipStyle === CLIP_STYLES.TEXT_SELECTION) {
      try {
        const { htmlToMarkdown, normalizeText } = await import("../chunks/extract-5ZF2PQK2.js");
        selectionText = normalizeText(pageInfo.selectionText);
        selectionMarkdown = normalizeText(htmlToMarkdown(pageInfo.selectionHtml)) || selectionText;
      } catch {
        selectionText = (pageInfo.selectionText || "").trim();
        selectionMarkdown = selectionText;
      }
    }
    const raw = buildMarkdown({
      title,
      url,
      clipStyle,
      excerpt,
      excerptPlain,
      fullText,
      fullTextPlain,
      selectionText,
      selectionMarkdown,
      templates: {
        titleUrl: currentProfile.titleUrlTemplate,
        excerpt: currentProfile.excerptTemplate,
        fullText: currentProfile.fullTextTemplate,
        textSelection: currentProfile.textSelectionTemplate
      }
    });
    const topicTitle = destination === DESTINATIONS.NEW_TOPIC ? buildTopicTitle({ title }) : void 0;
    const tags = destination === DESTINATIONS.NEW_TOPIC ? parseTags(tagsInput.value) : [];
    const payload = buildPayload({
      destination,
      title: topicTitle,
      categoryId,
      topicId,
      raw,
      tags
    });
    const response = await createPost({
      baseUrl: currentProfile.baseUrl,
      authMethod: currentProfile.authMethod,
      apiUsername: currentProfile.apiUsername,
      apiKey: currentProfile.apiKey,
      userApiKey: currentProfile.userApiKey,
      userApiClientId: currentProfile.userApiClientId,
      payload
    });
    const topicIdResult = response?.topic_id || response?.id;
    const slug = response?.topic_slug;
    if (topicIdResult && slug) {
      setStatus("Clipped successfully. ");
      const link = document.createElement("a");
      link.href = `${currentProfile.baseUrl}/t/${encodeURIComponent(String(slug))}/${encodeURIComponent(String(topicIdResult))}`;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open topic";
      statusEl.append(link, ".");
    } else {
      setStatus("Clipped successfully.");
    }
  } catch (error) {
    setStatus(error.message || "Failed to clip.", true);
  } finally {
    submitButton.disabled = false;
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
  await refreshActionIcon();
  setStatus("");
}
async function loadSettings() {
  const state = await getSettingsState();
  applyTheme(state.theme);
  profiles = state.profiles || [];
  activeProfileId = state.activeProfileId;
  currentProfile = state.activeProfile;
  useFaviconForIcon = state.useFaviconForIcon;
  categoriesLoadedForProfileId = "";
  categoryStatus.textContent = "";
  setCategoryOptions([], currentProfile.defaultCategoryId || "");
  renderProfiles();
  applyProfileDefaults(currentProfile);
  const connected = isProfileConnected(currentProfile);
  connectionRequired.classList.toggle("hidden", connected);
  form.classList.toggle("hidden", !connected);
  return connected;
}
async function init() {
  setFormEnabled(false);
  setExtensionVersion();
  setStatus("Loading settings...");
  const connected = await loadSettings();
  await refreshActionIcon();
  if (!connected) {
    connectionRequired.querySelector(".connect-button")?.focus();
    setStatus("");
    return;
  }
  try {
    const pageInfo = await getActiveTabInfo();
    if (pageInfo.selectionText && pageInfo.selectionText.trim().length > 0) {
      const selectionIndicator = document.getElementById("selection-indicator");
      const selectionInfo = document.getElementById("selection-info");
      const charCount = pageInfo.selectionText.trim().length;
      const wordCount = pageInfo.selectionText.trim().split(/\s+/).length;
      selectionInfo.textContent = `Selection detected: ${charCount} characters, ${wordCount} words`;
      selectionIndicator.classList.remove("hidden");
      const textSelectionRadio = document.querySelector('input[name="clipStyle"][value="text_selection"]');
      if (textSelectionRadio) {
        textSelectionRadio.checked = true;
      }
    }
  } catch (error) {
    console.error("Failed to check for selection:", error);
  }
  form.addEventListener("change", (event) => {
    if (event.target.name === "destination") {
      toggleDestinationFields(event.target.value);
    }
  });
  form.addEventListener("submit", handleSubmit);
  profileSelect.addEventListener("change", handleProfileChange);
  categoryInput.addEventListener("focus", loadCategories);
  categoryInput.addEventListener("pointerdown", loadCategories);
  setFormEnabled(true);
  setStatus("");
}
init().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
