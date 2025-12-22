# Clip to Discourse – Delivery Roadmap

This roadmap turns the specification into a concrete build order. Phases are ordered to minimise risk and make it easy to ship a solid MVP, then iterate.

---

## Phase 0 – Project Foundations

- [x] Establish repo structure
  - [x] Initialise project, package manager, and basic tooling (lint, test, package scripts).
  - [x] Decide on TypeScript vs JavaScript and bundler (e.g. Vite/Rollup/Webpack) for the Chromium extension.
- [ ] Coding standards and QA
  - [x] Add linter (ESLint) with a simple, documented config.
  - [x] Add basic unit test framework (e.g. Vitest/Jest/Mocha) and a single smoke test.
- [x] Continuous Integration
  - [x] Add CI workflow (e.g. GitHub Actions) to run lint and tests on every push/PR.
- [ ] Developer documentation
  - [ ] Create a concise CONTRIBUTING section or doc describing how to build, test, and package the extension.

---

## Phase 1 – Discourse Integration Skeleton (Spec §4.2, §6, §7, §8)

- [x] Settings model and storage
  - [x] Implement a typed settings model for:
    - Discourse BaseURL (stored without trailing slash).
    - API Username (clipbot or user account).
    - Discourse API Key.
    - Optional defaults: clip style, destination mode, default Category ID / Topic ID, title template.
  - [x] Implement persistence using `chrome.storage.sync` (per spec §6.1).
- [x] Discourse HTTP client
  - [x] Implement a minimal client wrapper around `fetch` for Discourse API calls.
  - [x] Inject `Api-Key` and `Api-Username` headers from stored settings.
  - [x] Enforce JSON Content-Type and basic error handling (HTTP status, network errors).
- [x] Security considerations
  - [x] Ensure the API key is never hard-coded; only read from `chrome.storage.sync`.
  - [x] Document recommended practices (dedicated user, avoid admin keys) per spec §8.
- [x] Privacy and transparency
  - [x] Avoid external network requests for UI assets (bundle fonts locally).
- [x] Permissions and manifest
  - [x] Define minimal Chrome permissions (storage, activeTab, scripting) in the extension manifest per spec §7.

---

## Phase 2 – Core Clipping Engine (Spec §5)

- [x] Page context access
  - [x] Implement a small content script or scripting API usage to access `document.title` and `window.location.href`.
- [x] Content extraction utilities
  - [x] Title extraction (spec §5.1):
    - [x] Read from `document.title`.
    - [x] Trim whitespace sensibly.
    - [x] Apply fallback title pattern: `"{{datetime}} Clipped with Clip To Discourse"` when needed.
  - [x] URL extraction:
    - [x] Read from `window.location.href`.
  - [ ] Short excerpt (not MVP but design for later):
    - [ ] Extract visible text from page.
    - [ ] Truncate to configurable character limit (e.g. 500–1000).
    - [ ] Ensure pure truncation (no summarisation / AI).
  - [ ] Full page text (not MVP but design hooks):
    - [ ] Extract readable article content (main text, excluding navigation, scripts, styles).
    - [ ] Keep plain text only (no HTML retention for MVP).
- [x] Markdown formatting
  - [x] Implement helpers to generate Markdown in the three example shapes (Title + URL only, Excerpt, Full page) per spec §5.3.
  - [x] Ensure the final bare URL is always present to allow Discourse Oneboxing.

---

## Phase 3 – Discourse Payload Builder and Posting (Spec §5.2)

- [x] Payload builder
  - [x] Implement a function that builds the `raw` markdown body according to the chosen clip style and spec §5.3.
  - [x] Implement a function that builds a `POST /posts.json` request body for:
    - [x] New topic: `title`, `raw`, `category` (optional integer category ID used only when creating a new topic).
    - [x] Reply to topic: `topic_id`, `raw`.
- [x] API integration
  - [x] Wire payload builder to the Discourse client.
  - [x] Implement success and error responses handling (surface to UI for user feedback).
- [x] Guardrails
  - [x] Handle invalid or missing configuration (no base URL, no API key, missing username) with clear error messages.
  - [x] Handle Discourse-specific errors (e.g. invalid category ID, topic ID) and show readable feedback in the popup.

---

## Phase 4 – Extension Popup UI (Spec §3, §4.1)

- [x] Popup shell
  - [x] Implement the popup entry component rendered when the extension icon is clicked (spec §3.1, §4.1).
  - [x] Display loading state while settings and context are loaded.
- [x] Visual styling
  - [x] Apply Lato font to popup and settings UI.
  - [x] Set popup and settings background to `#D6C9AA`.
  - [x] Update button color to `#577188`.
- [x] Clip style selector (spec §4.1.1)
  - [x] Implement radio-buttons (mutually exclusive) for clip styles:
    - [x] Title + URL only.
    - [x] Title + URL + short excerpt (disabled).
    - [x] Full page text (disabled).
    - [ ] (Placeholders for future: screenshot; Archive.org link.)
  - [x] Ensure only one clip style is active per clip.
  - [x] Honour default clip style from settings.
- [x] Destination mode selector (spec §4.1.2)
  - [x] Implement dropdown or radio-buttons with:
    - [x] Create new topic (requires Category ID).
    - [x] Append to existing topic (requires Topic ID).
  - [x] Dynamically show/hide CategoryId and TopicId fields based on selected mode.
  - [x] Honour default destination mode and default IDs from settings.
- [x] Clip action
  - [x] Implement the primary "Clip" button.
  - [x] On click, gather content (title, URL), build markdown, build payload, and post to Discourse.
  - [ ] Extend clip action for excerpt/full text once those modes are enabled.
  - [x] Show success / error notification and optionally a link to the created/updated topic.

---

## Phase 5 – Settings / Options UI (Spec §4.2)

- [x] Options page
  - [x] Implement a dedicated Options / Settings page accessible via:
    - [x] Chrome Extensions → Extension Details → Options.
    - [x] A "Settings" link/button from the popup.
- [x] Settings editing
  - [x] Allow the user to set and update:
    - [x] Discourse BaseURL (with validation and trimming of trailing slash).
    - [x] API Username.
    - [x] Discourse API Key.
    - [x] Default clip style.
    - [x] Default destination mode.
    - [x] Default Category ID / Topic ID.
    - [x] Title template for new topics (e.g. `Clip: {{title}}`, `Clip {{date}}: {{title}}`).
- [x] UX safeguards
  - [x] Provide basic validation and inline error messages.
  - [x] Offer a test request or "Test connection" button that pings Discourse to confirm credentials.

---

## Phase 6 – Testing Strategy

- [x] Unit tests
  - [ ] Content extraction utilities (title, URL, excerpt, full page text parser where feasible).
  - [x] Markdown builder for each clip style (ensure stable, predictable formats).
  - [x] Discourse payload builder for both new topic and reply.
- [ ] Integration tests
  - [ ] Mocked HTTP tests for posting to `POST /posts.json` with different combinations of clip style and destination.
  - [ ] Tests around configuration loading/saving via `chrome.storage.sync` (using Chrome extension test utilities or mocks).
- [ ] UI tests (optional but recommended)
  - [ ] Add light-weight UI tests for popup behaviour (state changes, validation, happy path clip).
- [ ] Regression safeguards
  - [ ] Set up coverage thresholds for core logic (extraction + payload + posting).

---

## Phase 7 – CI / Automation and Packaging

- [x] CI workflows
  - [x] Run lint and tests on every push and pull request.
  - [x] Cache dependencies for faster builds.
- [x] Build and packaging
  - [x] Provide a production zip script suitable for Chrome Web Store upload.
- [ ] Release management
  - [x] Tag releases and attach built extension packages (automate via CI).
  - [ ] Maintain a simple CHANGELOG that references spec sections when major behaviours are added or changed.

---

## Phase 8 – Chrome Web Store Release & Listing (Deployment)

- [ ] Account & compliance (manual)
  - [ ] Create/confirm Chrome Web Store developer account (one-time $5 fee).
  - [ ] Prepare Privacy Policy URL and complete data disclosure form (permissions: storage, activeTab, scripting).
- [ ] Release readiness
  - [ ] Bump `manifest.json` version for each release (can be validated in CI).
  - [ ] Ensure required assets exist: icons (include 128×128 referenced in manifest), screenshots (≥1280×800), optional promo tiles (440×280, 920×680), optional YouTube promo.
  - [ ] Verify listing descriptions: short and detailed.
- [ ] Build & package (automated in CI)
  - [x] Run packaging script.
  - [x] Zip the built folder contents (manifest at zip root; exclude `node_modules`, tests, configs, and source maps unless desired).
  - [x] Publish build artifact from CI (attach to release).
- [ ] Store upload (human step unless API is wired)
  - [ ] Upload zip to the Web Store item and submit for review; publish when approved.
- [ ] Optional full automation
  - [ ] Add CI job to call the Chrome Web Store API to upload/publish using client ID/secret + refresh token (guarded behind manual approval).
- [ ] Pre-publish QA
  - [ ] Test via Chrome “Load unpacked” pointing to the built folder and re-verify clip flows.

---

## Phase 9 – Documentation and Developer Experience

- [ ] User-facing docs
  - [ ] README with:
    - [x] What the extension does and high-level design principles (manual clipping, Discourse-native output, separation of concerns).
    - [x] Basic setup flow: generating a Discourse API key, configuring BaseURL, username, and defaults.
    - [x] How to use the popup to clip content (new topic vs append).
  - [x] Short security note covering key storage and recommended Discourse account practices.
- [ ] Developer docs
  - [ ] Brief architecture overview linking modules to spec sections (e.g. content extraction ↔ §5.1, payload ↔ §5.2).
  - [ ] Notes on how to add new clip styles or future enhancements (context menu, highlight-to-clip, etc.).

---

## Phase 10 – Post-MVP Enhancements (Backlog from Spec §5, §10)

These items come directly from the spec and should be treated as a prioritised backlog once the MVP is stable.

- [ ] Additional clip styles and behaviours
  - [ ] Implement Short excerpt and Full page modes if not completed during MVP.
  - [ ] Add screenshot-based clip style.
  - [ ] Add Archive.org integration (link to saved version, possibly triggering archive on clip).
- [ ] UX refinements
  - [ ] Context-menu "Clip this page".
  - [ ] Highlight-to-clip.
  - [ ] Daily log topic mode.
  - [ ] Tagging UI in popup.
- [ ] Backend and platform
  - [ ] Server-side relay (e.g. n8n) for more advanced workflows.
  - [ ] Ports to Firefox and Safari.
