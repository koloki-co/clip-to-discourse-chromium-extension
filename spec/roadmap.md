<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip To Discourse Roadmap

This roadmap lists outstanding features and improvements for the extension. Completed work is recorded in [CHANGELOG.md](../CHANGELOG.md) and Git history.

Legend: [ ] not started. Every item has a stable `Rxx` code; do not renumber or reuse codes.

---

## Active Development

### Security And Privacy

- [ ] **R67 - Offer opt-in passphrase protection for locally stored credentials** using a user-chosen passphrase, key derivation, authenticated encryption, a clear forgotten-passphrase warning, and a migration path for existing local credentials. This is for security-conscious users and must remain optional rather than blocking the default local-only credential flow.

### Testing And Quality Assurance

#### Coverage And Regression
- [ ] **R02 - Set up coverage thresholds for core logic** covering extraction, payload building, and posting.
- [ ] **R03 - Add regression tests for edge cases** including empty titles, very long content, and special characters.

### Chrome Web Store

#### Release Assets
- [ ] **R04 - Create or update promotional assets** including screenshots at least 1280x800, optional 440x280 and 920x680 promo tiles, and an optional YouTube video.
- [ ] **R05 - Verify and update the store listing descriptions**
- [ ] **R06 - Complete the data disclosure form with current permissions**

#### Pre-Publish QA
- [ ] **R07 - Use Playwright to load the unpacked extension in a fresh temporary Chromium profile before each release**
- [ ] **R08 - Use Playwright to verify all clip styles against a mock Discourse endpoint before each release**
- [ ] **R09 - Use Playwright to test the connection test feature against success and failure responses before each release**
- [ ] **R10 - Use Playwright to verify the favicon icon setting where extension APIs expose observable state, with a documented manual check for native toolbar rendering**
- [ ] **R11 - Use Playwright to test profile switching and settings persistence before each release**

### Documentation

#### Developer Documentation
- [ ] **R12 - Add an architecture overview** covering content extraction, payload building, Discourse API integration, and profile management.
- [ ] **R13 - Document how to add new clip styles or extend functionality**
- [ ] **R14 - Add a troubleshooting guide for common development issues**

---

## Future Enhancements

### User Experience

#### Dark Mode And Theming
- [ ] **R15 - Add System, Light, and Dark theme choices** defaulting to System and applying to the popup and options pages.
- [ ] **R16 - Persist the chosen theme in `chrome.storage.sync`**
- [ ] **R17 - React to OS theme changes while the extension UI is open**

#### Keyboard Shortcuts
- [ ] **R18 - Add a configurable keyboard shortcut to open the popup**
- [ ] **R19 - Add a shortcut to clip with default settings without opening the popup**

#### Enhanced Selection Clipping
- [ ] **R20 - Clarify the automatic style used when a selection is detected** and align the specification, implementation, and tests.
- [ ] **R21 - Add a preset "Clip Selection" style with a selection-focused template**
- [ ] **R22 - Support multiple selections or ranges**

#### Daily Log Mode
- [ ] **R23 - Add a "Daily Log" destination mode that appends to a daily topic**
- [ ] **R24 - Auto-create daily topics with date-based naming**
- [ ] **R25 - Support custom date format templates**

#### Tagging Support
- [ ] **R26 - Add a tag input field to the popup**
- [ ] **R27 - Store default tags per profile**
- [ ] **R28 - Support tag autocomplete from the Discourse API**

### Clip Styles

#### Screenshot Clipping
- [ ] **R29 - Capture the visible viewport as a screenshot**
- [ ] **R30 - Upload captured images to Discourse**
- [ ] **R31 - Include uploaded images in the clip body with an optional caption**
- [ ] **R32 - Support full-page screenshots using scroll capture**

#### Archive.org Integration
- [ ] **R33 - Add an option to trigger an Archive.org capture when clipping**
- [ ] **R34 - Include the Archive.org link in the clip body**
- [ ] **R35 - Show pending and completed archive status in the popup**
- [ ] **R36 - Check for existing archives before requesting a capture**

### Platform Expansion

#### Firefox Support
- [ ] **R37 - Verify Firefox Manifest V3 API compatibility** for `scripting.executeScript`, `action`, `storage.sync`, and `permissions.request`.
- [ ] **R38 - Add Firefox-specific manifest settings** including `browser_specific_settings.gecko.id` and `strict_min_version`.
- [ ] **R39 - Decide whether to retain `chrome.*` or adopt `browser.*` with a polyfill**
- [ ] **R40 - Verify the optional host permissions flow on Firefox**
- [ ] **R41 - Add a Firefox build target using `web-ext build`**
- [ ] **R42 - Document AMO signing and upload**
- [ ] **R43 - Run full functional QA on Firefox**

### Authentication

#### User API Key Flow
- [ ] **R44 - Run end-to-end QA of User API authorization on live Discourse instances** covering device authorization on a current release and redirect fallback on an older compatible release, including payload decryption, connection verification, persistence, reauthorization, expiry, denial, and revocation.

---

## Technical Debt And Maintenance

### Code Quality
- [ ] **R45 - Review and refactor payload building for better testability**
- [ ] **R46 - Consolidate error handling patterns across modules**
- [ ] **R47 - Add JSDoc comments to public APIs where they clarify contracts**
- [ ] **R48 - Evaluate a TypeScript migration and record the decision**

### Performance
- [ ] **R49 - Measure and optimize popup bundle size**
- [ ] **R50 - Evaluate lazy-loading Turndown and Readability**
- [ ] **R51 - Cache compiled templates if profiling shows a useful benefit**

### Security
- [ ] **R52 - Review the content security policy for extension pages**
- [ ] **R53 - Audit third-party dependencies and document material findings**
