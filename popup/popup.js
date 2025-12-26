import { CLIP_STYLES, DESTINATIONS } from "../shared/constants.js";
import { getSettingsState, setActiveProfile } from "../shared/settings.js";
import { buildMarkdown, applyTitleTemplate, normalizeTitle, fallbackTitle } from "../shared/markdown.js";
import { buildPayload } from "../shared/payload.js";
import { createPost } from "../shared/discourse.js";
import { updateActionIconForProfile } from "../shared/favicon.js";
import { buildExcerpt, normalizeText } from "../shared/extract.js";

// Popup UI entry point: collect page data, build post payload, and send to Discourse.
const form = document.getElementById("clip-form");
const statusEl = document.getElementById("status");
const categoryField = document.getElementById("category-field");
const topicField = document.getElementById("topic-field");
const categoryInput = document.getElementById("categoryId");
const topicInput = document.getElementById("topicId");
const submitButton = form.querySelector("button[type=submit]");
const profileSelect = document.getElementById("profileSelect");

// Local UI state mirrors settings/profile selection.
let currentProfile = null;
let profiles = [];
let activeProfileId = "";
let useFaviconForIcon = false;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "";
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

// Swap destination-specific fields based on destination radio.
function toggleDestinationFields(destination) {
  if (destination === DESTINATIONS.NEW_TOPIC) {
    categoryField.classList.remove("hidden");
    topicField.classList.add("hidden");
  } else {
    categoryField.classList.add("hidden");
    topicField.classList.remove("hidden");
  }
}

function getSelectedValue(name) {
  const input = form.querySelector(`input[name='${name}']:checked`);
  return input ? input.value : "";
}

// Grab title/text from the active tab via an injected script.
async function getActiveTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error("No active tab found.");
  }
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const title = document.title;
      const url = window.location.href;
      const article = document.querySelector("article") || document.querySelector("main") || document.body;
      const fullText = article ? article.innerText : "";
      const pageText = document.body ? document.body.innerText : fullText;
      return { title, url, fullText, pageText };
    }
  });
  return result;
}

// Guardrails for required Discourse credentials.
function validateSettings(settings) {
  if (!settings.baseUrl) {
    throw new Error("Missing Discourse Base URL. Update settings first.");
  }
  if (!settings.apiUsername) {
    throw new Error("Missing API Username. Update settings first.");
  }
  if (!settings.apiKey) {
    throw new Error("Missing API Key. Update settings first.");
  }
}

// Apply profile title template after normalizing the page title.
function buildTopicTitle({ title }) {
  const safeTitle = normalizeTitle(title) || fallbackTitle();
  return applyTitleTemplate(currentProfile.titleTemplate, safeTitle);
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

// Apply profile defaults into the form without overriding disabled inputs.
function applyProfileDefaults(profile) {
  const defaultClipStyle = profile.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  const defaultDestination = profile.defaultDestination || DESTINATIONS.NEW_TOPIC;

  const clipInput = form.querySelector(`input[name='clipStyle'][value='${defaultClipStyle}']`);
  if (clipInput && !clipInput.disabled) {
    clipInput.checked = true;
  }

  const destinationInput = form.querySelector(`input[name='destination'][value='${defaultDestination}']`);
  if (destinationInput) {
    destinationInput.checked = true;
  }

  categoryInput.value = profile.defaultCategoryId || "";
  topicInput.value = profile.defaultTopicId || "";

  toggleDestinationFields(defaultDestination);
}

// Build the clip payload and send it to Discourse.
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
    const excerpt = buildExcerpt(pageInfo.pageText);
    const fullText = normalizeText(pageInfo.fullText);

    const raw = buildMarkdown({
      title,
      url,
      clipStyle,
      excerpt,
      fullText
    });

    const payload = buildPayload({
      destination,
      title: destination === DESTINATIONS.NEW_TOPIC ? buildTopicTitle({ title }) : undefined,
      categoryId,
      topicId,
      raw
    });

    const response = await createPost({
      baseUrl: currentProfile.baseUrl,
      apiUsername: currentProfile.apiUsername,
      apiKey: currentProfile.apiKey,
      payload
    });

    const topicIdResult = response.topic_id || response.id;
    const slug = response.topic_slug;
    if (topicIdResult && slug) {
      const link = `${currentProfile.baseUrl}/t/${slug}/${topicIdResult}`;
      setStatus("Clipped successfully. Open the topic from your Discourse instance.");
      statusEl.style.color = "";
      statusEl.innerHTML = `Clipped successfully. <a href='${link}' target='_blank' rel='noreferrer'>Open topic</a>.`;
    } else {
      setStatus("Clipped successfully.");
    }
  } catch (error) {
    setStatus(error.message || "Failed to clip.", true);
  } finally {
    submitButton.disabled = false;
  }
}

// Switch active profile and refresh the UI + icon.
async function handleProfileChange() {
  const selectedId = profileSelect.value;
  if (!selectedId || selectedId === activeProfileId) {
    return;
  }
  setStatus("Switching profile...");
  await setActiveProfile(selectedId);
  await loadSettings();
  await updateActionIconForProfile(currentProfile, useFaviconForIcon);
  setStatus("");
}

// Load settings and normalize profile defaults for the UI.
async function loadSettings() {
  const state = await getSettingsState();
  profiles = state.profiles || [];
  activeProfileId = state.activeProfileId;
  currentProfile = state.activeProfile;
  useFaviconForIcon = state.useFaviconForIcon;
  renderProfiles();
  applyProfileDefaults(currentProfile);
}

// Wire up the popup once settings are available.
async function init() {
  setFormEnabled(false);
  setStatus("Loading settings...");
  await loadSettings();
  await updateActionIconForProfile(currentProfile, useFaviconForIcon);

  form.addEventListener("change", (event) => {
    if (event.target.name === "destination") {
      toggleDestinationFields(event.target.value);
    }
  });

  form.addEventListener("submit", handleSubmit);
  profileSelect.addEventListener("change", handleProfileChange);
  setFormEnabled(true);
  setStatus("");
}

init().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
