<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip To Discourse Roadmap

This roadmap lists outstanding features and improvements for the extension. Completed work is recorded in [CHANGELOG.md](../CHANGELOG.md) and Git history.

Legend: [ ] not started. Every item has a stable `Rxx` code; do not renumber or reuse codes.

---

## Active Development

### v1.0 Release Readiness

Gate items that must close before bumping to `1.0.0`. Existing items R04, R05, R06, and R44 are included for grouping; new items start at R68.

- [x] **R68 - Remove the unused `notifications` permission** from `manifest.json`. No code calls `chrome.notifications`; the permission and its privacy-justification entry are inaccurate and must not ship in a public 1.0 release.
- [x] **R69 - Declare and document `minimum_chrome_version`** in `manifest.json`. The context-menu handler depends on `chrome.action.openPopup()`, generally available from Chrome 127. Either set `minimum_chrome_version` to `"127"` or implement and test a documented fallback for earlier versions.
- [x] **R70 - Include project and third-party licence notices in the release archive**. The package allowlist in `scripts/package.js` omits `LICENSE.md` and the required notices for bundled Mozilla Readability (Apache-2.0), Turndown (MIT), and Turndown GFM (MIT). Add them before the next public package.
- [x] **R71 - Bind Chrome Web Store publication to the exact reviewed release tag**. The Web Store workflow rebuilds from whichever ref is dispatched and does not validate the tag or download the GitHub release asset. Require an exact semver tag match so the reviewed v1 artifact is what reaches the store.
- [x] **R72 - Run E2E tests against the packaged ZIP artifact**, not the loose source tree. The release workflow packages after E2E, so a missing allowlist entry could pass tests and produce a broken archive.
- [x] **R73 - Align README privacy claims with actual data handling**. Current wording is too absolute. Accurately disclose local storage, `chrome.storage.sync` for non-sensitive preferences, favicon fetching, and user-directed Discourse transfers.
- [x] **R04 - Create or update promotional assets** including screenshots at least 1280x800, optional 440x280 and 920x680 promo tiles, and an optional YouTube video. Existing screenshots are 0.18-era and predate profiles, User API, themes, and category loading.
- [x] **R05 - Verify and update the store listing descriptions** to reflect current features and the preferred User API onboarding path.
- [ ] **R06 - Complete the data disclosure form with current permissions** using `privacy-permission-justification.md` after R68 removes `notifications`.
- [x] **R44 - Run end-to-end QA of User API authorization on live Discourse instances** covering device authorization on a current release and redirect fallback on an older compatible release, including payload decryption, connection verification, persistence, reauthorization, expiry, denial, and revocation.

### Security And Privacy

- [ ] **R67 - Offer opt-in passphrase protection for locally stored credentials** using a user-chosen passphrase, key derivation, authenticated encryption, a clear forgotten-passphrase warning, and a migration path for existing local credentials. This is for security-conscious users and must remain optional rather than blocking the default local-only credential flow.

---

## Future Enhancements

### User Experience

#### Keyboard Shortcuts
- [ ] **R18 - Add a configurable keyboard shortcut to open the popup**
- [ ] **R19 - Add a shortcut to clip with default settings without opening the popup**

#### Enhanced Selection Clipping
- [ ] **R20 - Clarify the automatic style used when a selection is detected** and align the specification, implementation, and tests.
- [ ] **R21 - Add a preset "Clip Selection" style with a selection-focused template**
- [ ] **R22 - Support multiple selections or ranges**

#### Tagging Support
- [ ] **R26 - Add a tag input field to the popup**
- [ ] **R27 - Store default tags per profile**
- [ ] **R28 - Support tag autocomplete from the Discourse API**

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
