import { CLIP_STYLES, DESTINATIONS } from "../shared/constants.js";
import { getSettings } from "../shared/settings.js";
import { buildMarkdown, applyTitleTemplate, normalizeTitle, fallbackTitle } from "../shared/markdown.js";
import { buildPayload } from "../shared/payload.js";
import { createPost } from "../shared/discourse.js";

const form = document.getElementById("clip-form");
const statusEl = document.getElementById("status");
const categoryField = document.getElementById("category-field");
const topicField = document.getElementById("topic-field");
const categoryInput = document.getElementById("categoryId");
const topicInput = document.getElementById("topicId");
const submitButton = form.querySelector("button[type=submit]");

let currentSettings = null;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "";
}

function setFormEnabled(enabled) {
  form.querySelectorAll("input, button").forEach((element) => {
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

async function getActiveTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error("No active tab found.");
  }
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title,
      url: window.location.href
    })
  });
  return result;
}

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

function buildTopicTitle({ title }) {
  const safeTitle = normalizeTitle(title) || fallbackTitle();
  return applyTitleTemplate(currentSettings.titleTemplate, safeTitle);
}

async function handleSubmit(event) {
  event.preventDefault();
  submitButton.disabled = true;
  setStatus("Clipping...");

  try {
    validateSettings(currentSettings);

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
    if (clipStyle !== CLIP_STYLES.TITLE_URL) {
      throw new Error("Selected clip style is not available yet.");
    }

    const pageInfo = await getActiveTabInfo();
    const title = normalizeTitle(pageInfo.title) || fallbackTitle();
    const url = pageInfo.url;

    const raw = buildMarkdown({
      title,
      url,
      clipStyle
    });

    const payload = buildPayload({
      destination,
      title: destination === DESTINATIONS.NEW_TOPIC ? buildTopicTitle({ title }) : undefined,
      categoryId,
      topicId,
      raw
    });

    const response = await createPost({
      baseUrl: currentSettings.baseUrl,
      apiUsername: currentSettings.apiUsername,
      apiKey: currentSettings.apiKey,
      payload
    });

    const topicIdResult = response.topic_id || response.id;
    const slug = response.topic_slug;
    if (topicIdResult && slug) {
      const link = `${currentSettings.baseUrl}/t/${slug}/${topicIdResult}`;
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

async function init() {
  setFormEnabled(false);
  setStatus("Loading settings...");
  currentSettings = await getSettings();

  const defaultClipStyle = currentSettings.defaultClipStyle || CLIP_STYLES.TITLE_URL;
  const defaultDestination = currentSettings.defaultDestination || DESTINATIONS.NEW_TOPIC;

  const clipInput = form.querySelector(`input[name='clipStyle'][value='${defaultClipStyle}']`);
  if (clipInput && !clipInput.disabled) {
    clipInput.checked = true;
  }

  const destinationInput = form.querySelector(`input[name='destination'][value='${defaultDestination}']`);
  if (destinationInput) {
    destinationInput.checked = true;
  }

  if (currentSettings.defaultCategoryId) {
    categoryInput.value = currentSettings.defaultCategoryId;
  }
  if (currentSettings.defaultTopicId) {
    topicInput.value = currentSettings.defaultTopicId;
  }

  toggleDestinationFields(defaultDestination);

  form.addEventListener("change", (event) => {
    if (event.target.name === "destination") {
      toggleDestinationFields(event.target.value);
    }
  });

  form.addEventListener("submit", handleSubmit);
  setFormEnabled(true);
  setStatus("");
}

init().catch((error) => {
  setStatus(error.message || "Failed to load settings.", true);
});
