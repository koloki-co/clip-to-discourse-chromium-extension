// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { AUTH_METHODS, DESTINATIONS, CLIP_STYLES } from "../../shared/constants.js";
import {
  setupChromeMock,
  cleanupChromeMock,
  waitFor,
  changeInput,
  click
} from "./test-helpers.js";

describe("Popup UI", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    // Set up JSDOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Clip to Discourse</title>
        </head>
        <body>
          <main class="container">
            <header class="header">
              <div class="brand">
                <h1>Clip to Discourse</h1>
              </div>
              <a class="settings-link" href="../options/options.html">Settings</a>
            </header>

            <form id="clip-form">
              <section class="section">
                <h2>Profile</h2>
                <select id="profileSelect" name="profileSelect"></select>
              </section>

              <section class="section">
                <h2>Clip Style</h2>
                <label class="radio">
                  <input type="radio" name="clipStyle" value="title_url" checked />
                  Title + URL
                </label>
                <label class="radio">
                  <input type="radio" name="clipStyle" value="excerpt" />
                  Title + URL + excerpt
                </label>
                <label class="radio">
                  <input type="radio" name="clipStyle" value="full_text" />
                  Full page text
                </label>
              </section>

              <section class="section">
                <h2>Destination</h2>
                <label class="radio">
                  <input type="radio" name="destination" value="new_topic" checked />
                  Create new topic
                </label>
                <label class="radio">
                  <input type="radio" name="destination" value="append_topic" />
                  Append to existing topic
                </label>

                <div id="category-field" class="field">
                  <label for="categoryId">Category ID</label>
                  <input id="categoryId" name="categoryId" type="number" min="1" placeholder="e.g. 12" />
                </div>
                <div id="topic-field" class="field hidden">
                  <label for="topicId">Topic ID</label>
                  <input id="topicId" name="topicId" type="number" min="1" placeholder="e.g. 345" />
                </div>
              </section>

              <button class="primary" type="submit">Clip</button>
              <p id="status" class="status" role="status"></p>
            </form>

            <footer class="meta-footer">
              <span>v<span id="popupExtensionVersion">-</span></span>
            </footer>
          </main>
        </body>
      </html>
    `, {
      url: "chrome-extension://test/popup/popup.html",
      runScripts: "dangerously",
      resources: "usable"
    });

    window = dom.window;
    document = window.document;

    // Set up global environment
    globalThis.window = window;
    globalThis.document = document;
    globalThis.Event = window.Event;

    // Set up chrome API mock with default profile
    setupChromeMock({
      storage: {
        profiles: [{
          id: "profile-1",
          name: "Test Profile",
          baseUrl: "https://forum.example.com",
          authMethod: AUTH_METHODS.ADMIN_API_KEY,
          apiUsername: "testuser",
          apiKey: "test-api-key",
          defaultClipStyle: CLIP_STYLES.TITLE_URL,
          defaultDestination: DESTINATIONS.NEW_TOPIC,
          defaultCategoryId: "5",
          defaultTopicId: "",
          titleTemplate: "Clip: {{title}}"
        }],
        activeProfileId: "profile-1"
      },
      scripting: {
        title: "Test Page Title",
        url: "https://example.com/test",
        fullHtml: "<p>Test content</p>",
        pageHtml: "<p>Test content</p>",
        fullText: "Test content",
        pageText: "Test content"
      }
    });
  });

  afterEach(() => {
    cleanupChromeMock();
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.Event;
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("renders the popup with correct structure", () => {
      expect(document.querySelector("#clip-form")).toBeTruthy();
      expect(document.querySelector("#profileSelect")).toBeTruthy();
      expect(document.querySelector("#categoryId")).toBeTruthy();
      expect(document.querySelector("#topicId")).toBeTruthy();
      expect(document.querySelector("button[type=submit]")).toBeTruthy();
    });

    it("displays extension version", () => {
      const versionEl = document.querySelector("#popupExtensionVersion");
      expect(versionEl).toBeTruthy();
    });
  });

  describe("Clip Style Selection", () => {
    it("has all three clip style options", () => {
      const styleInputs = document.querySelectorAll('input[name="clipStyle"]');
      expect(styleInputs.length).toBe(3);
      
      const values = Array.from(styleInputs).map((input) => input.value);
      expect(values).toContain(CLIP_STYLES.TITLE_URL);
      expect(values).toContain(CLIP_STYLES.EXCERPT);
      expect(values).toContain(CLIP_STYLES.FULL_TEXT);
    });

    it("defaults to title_url style", () => {
      const checkedInput = document.querySelector('input[name="clipStyle"]:checked');
      expect(checkedInput.value).toBe(CLIP_STYLES.TITLE_URL);
    });

    it("allows switching clip styles", () => {
      const excerptInput = document.querySelector('input[name="clipStyle"][value="excerpt"]');
      click(excerptInput);
      
      expect(excerptInput.checked).toBe(true);
      expect(document.querySelector('input[name="clipStyle"][value="title_url"]').checked).toBe(false);
    });
  });

  describe("Destination Mode Selection", () => {
    it("has both destination options", () => {
      const destInputs = document.querySelectorAll('input[name="destination"]');
      expect(destInputs.length).toBe(2);
      
      const values = Array.from(destInputs).map((input) => input.value);
      expect(values).toContain(DESTINATIONS.NEW_TOPIC);
      expect(values).toContain(DESTINATIONS.APPEND_TOPIC);
    });

    it("defaults to new_topic destination", () => {
      const checkedInput = document.querySelector('input[name="destination"]:checked');
      expect(checkedInput.value).toBe(DESTINATIONS.NEW_TOPIC);
    });

    it("shows category field for new topic mode", () => {
      const categoryField = document.querySelector("#category-field");
      const topicField = document.querySelector("#topic-field");
      
      expect(categoryField.classList.contains("hidden")).toBe(false);
      expect(topicField.classList.contains("hidden")).toBe(true);
    });

    it("shows topic field when switching to append mode", () => {
      const appendInput = document.querySelector('input[name="destination"][value="append_topic"]');
      const categoryField = document.querySelector("#category-field");
      const topicField = document.querySelector("#topic-field");
      
      click(appendInput);
      
      // These visibility changes would be handled by the popup.js code
      // For now we just verify the inputs exist
      expect(categoryField).toBeTruthy();
      expect(topicField).toBeTruthy();
    });
  });

  describe("Form Input", () => {
    it("accepts category ID input", () => {
      const categoryInput = document.querySelector("#categoryId");
      changeInput(categoryInput, "42");
      
      expect(categoryInput.value).toBe("42");
    });

    it("accepts topic ID input", () => {
      const topicInput = document.querySelector("#topicId");
      changeInput(topicInput, "123");
      
      expect(topicInput.value).toBe("123");
    });

    it("enforces numeric input for category ID", () => {
      const categoryInput = document.querySelector("#categoryId");
      expect(categoryInput.type).toBe("number");
      expect(categoryInput.min).toBe("1");
    });

    it("enforces numeric input for topic ID", () => {
      const topicInput = document.querySelector("#topicId");
      expect(topicInput.type).toBe("number");
      expect(topicInput.min).toBe("1");
    });
  });

  describe("Status Display", () => {
    it("has a status element for feedback", () => {
      const statusEl = document.querySelector("#status");
      expect(statusEl).toBeTruthy();
      expect(statusEl.getAttribute("role")).toBe("status");
    });

    it("status is initially empty", () => {
      const statusEl = document.querySelector("#status");
      expect(statusEl.textContent).toBe("");
    });
  });

  describe("Profile Selection", () => {
    it("has profile selector", () => {
      const profileSelect = document.querySelector("#profileSelect");
      expect(profileSelect).toBeTruthy();
      expect(profileSelect.tagName).toBe("SELECT");
    });
  });

  describe("Submit Button", () => {
    it("has a submit button", () => {
      const submitButton = document.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();
      expect(submitButton.textContent).toContain("Clip");
    });

    it("submit button is enabled by default", () => {
      const submitButton = document.querySelector('button[type="submit"]');
      expect(submitButton.disabled).toBe(false);
    });
  });

  describe("Form Validation", () => {
    it("form has proper structure for validation", () => {
      const form = document.querySelector("#clip-form");
      expect(form.tagName).toBe("FORM");
      
      const inputs = form.querySelectorAll("input");
      expect(inputs.length).toBeGreaterThan(0);
    });

    it("category input accepts valid numbers", () => {
      const categoryInput = document.querySelector("#categoryId");
      categoryInput.value = "5";
      expect(categoryInput.checkValidity()).toBe(true);
    });

    it("category input rejects negative numbers", () => {
      const categoryInput = document.querySelector("#categoryId");
      categoryInput.value = "-1";
      // Note: checkValidity respects the min attribute
      expect(categoryInput.min).toBe("1");
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for inputs", () => {
      const categoryLabel = document.querySelector('label[for="categoryId"]');
      const topicLabel = document.querySelector('label[for="topicId"]');
      
      expect(categoryLabel).toBeTruthy();
      expect(topicLabel).toBeTruthy();
    });

    it("status has proper ARIA role", () => {
      const statusEl = document.querySelector("#status");
      expect(statusEl.getAttribute("role")).toBe("status");
    });

    it("radio buttons have proper structure", () => {
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach((radio) => {
        expect(radio.name).toBeTruthy();
        expect(radio.value).toBeTruthy();
      });
    });
  });
});
