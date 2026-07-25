<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip To Discourse Roadmap

This roadmap lists outstanding features and improvements for the extension. Completed work is recorded in [CHANGELOG.md](../CHANGELOG.md) and Git history.

Legend: [ ] not started. Every item has a stable `Rxx` code; do not renumber or reuse codes.

---

## Active Development

### Bug Fixes From The July 2026 Code Review

#### High Severity
- [x] **R54 - Handle non-JSON success responses when posting** so a 2xx response without a JSON body is reported as success instead of throwing on `response.topic_id` and inviting duplicate posts (`shared/discourse.js`, `popup/popup.js`).
- [x] **R55 - Make profile storage writes race-safe** so concurrent writers (popup, options page, background device-authorization poll, remote sync) cannot erase each other's changes, including freshly issued User API keys; also stop `loadState()` writing back the whole profiles array during ordinary reads (`shared/settings.js`).
- [x] **R56 - Lock profile switching during long-running options flows** by capturing the target profile ID when an operation starts and verifying it before saving, and disabling the profile selector while device authorization or permission prompts are pending, so credentials cannot be saved into the wrong profile (`options/options.js`).
- [x] **R57 - Guard the popup against stale category loads** so a category fetch that completes after a profile switch cannot populate the other site's categories or mark them as loaded for the new profile (`popup/popup.js`).
- [x] **R58 - Fix markdown escaping for code spans, fences, and link destinations** using backtick-count-based delimiters instead of backslash escapes and escaping parentheses, quotes, and newlines in URLs and titles, so page content cannot break out of code blocks or fabricate misleading links in the generated post (`shared/extract.js`).
- [x] **R59 - Build the popup success message with DOM APIs instead of `innerHTML`** so server-returned data such as `topic_slug` cannot inject markup into the extension page (`popup/popup.js`).
- [x] **R60 - Run only the extraction pipeline needed for the chosen clip style** and degrade gracefully when a pipeline throws, so one pathological page cannot freeze or fail unrelated clip styles (`popup/popup.js`).

#### Medium Severity
- [ ] **R61 - Rework profile storage to avoid the `chrome.storage.sync` per-item quota** (8,192 bytes for the single `profiles` item, easily exceeded by a few profiles or long custom templates), coordinated with R55.

  The current design stores the entire `profiles` array as a single `chrome.storage.sync` item. Each profile carries five template strings plus credentials, so a handful of profiles or one profile with long custom templates exceeds the 8,192-byte `QUOTA_BYTES_PER_ITEM` cap and every `set` rejects with a cryptic error. There is no fallback to `storage.local`. The race-safety fix in R55 (Web Locks) is independent of which storage area is used, so this can be addressed without disturbing the locking.

  **Option A: per-profile sync keys.** Store each profile under its own key (`profile:<id>`) alongside a small index item (`profileIds: [id, ...]`, `activeProfileId: id`). Each key is well under the per-item quota.

  - Pros: profiles still sync across signed-in browsers; individual profile writes don't touch unrelated profiles (smaller write surface); the `profileIds` index is tiny.
  - Cons: cross-profile consistency (e.g. deleting one and updating the active id) needs a multi-key write or a small transaction wrapper; `loadState` must fetch the index plus all profile keys (one `get(null)` call still works but returns a larger object); sync merge conflicts are per-profile rather than all-or-nothing, which is better but harder to reason about; R55's Web Lock still needed but the locked section touches more keys.

  **Option B: move profiles to `chrome.storage.local` only.** Keep `activeProfileId` and `useFaviconForIcon` in sync (small, safe); move the `profiles` array (with all credentials and templates) to local.

  - Pros: `storage.local` has a 10 MB quota (vs 8 KB per sync item), so the quota ceiling disappears for practical purposes; credentials no longer sync through the user's Google account (privacy improvement, see R63); simpler than per-key sharding; R55's locking works unchanged.
  - Cons: profiles are per-machine - a user on two browsers must configure each separately (acceptable for a single-user extension, but a regression for anyone who relied on sync); the options page and popup must read from `storage.local` for profiles and `storage.sync` for globals, adding a small amount of code complexity.

  **Option C: hybrid - sync non-sensitive profile metadata, local for credentials.** Store profile display names, base URLs, and template settings in sync (small per item); store `apiKey`, `userApiKey`, and `userApiClientId` in `storage.local` keyed by profile id.

  - Pros: profile names and settings sync; credentials stay local (privacy); per-item quota is unlikely to bite because credentials are the bulk that was pushing profiles over the limit.
  - Cons: most complex option - two reads on every profile load, one from sync and one from local, merged by id; deleting a profile requires cleaning up both areas; a synced profile with no local credentials shows as "not connected" on the new machine, which is actually the desired behaviour but needs clear UX.

  **Recommendation:** Option B (local-only profiles) is the simplest and most robust. The loss of cross-machine profile sync is acceptable for a single-user extension, and it improves credential privacy (partially addressing R63). If cross-machine sync is later deemed important, Option C can be adopted as a refinement. Either way, the migration from the current single sync key to the new layout must be handled in `loadState` so existing users do not lose their profiles on upgrade.
- [x] **R62 - Fix favicon toolbar icon rendering in the MV3 service worker** where `new Image()` and `DOMParser` do not exist, using `createImageBitmap` so background icon refreshes work (`shared/favicon.js`, `background.js`).
- [ ] **R63 - Decide and document credential storage and transport policy** covering plaintext API keys in synced storage and whether to warn on or reject `http://` base URLs.

  Two distinct concerns need an explicit product decision and documentation in the spec and the store privacy disclosure:

  **Concern 1: plaintext credentials in `chrome.storage.sync`.** Admin API keys (full admin power on the Discourse instance) and User API keys are stored as plaintext strings in `chrome.storage.sync`, which replicates them through the user's Google account to every signed-in Chrome profile. If any of those profiles is compromised or shared, the keys are exposed.

  - Option A: keep sync, document it. The extension is single-user; syncing credentials is a convenience. Add a privacy note in the store listing and SECURITY.md. - Pros: no code change, no UX regression. - Cons: an Admin API key is a high-value credential; syncing it is a real exposure.
  - Option B: move credentials to `storage.local` (aligns with R61 Option B/C). - Pros: credentials never leave the machine; no Google-account replication. - Cons: no cross-machine credential sync (acceptable for a single-user extension).
  - Option C: encrypt credentials at rest with a key derived from a user-chosen passphrase (or the extension's identity key). - Pros: strongest protection. - Cons: significant complexity (key management, passphrase UI, recovery flow), disproportionate for a clipping tool; the key itself would need to live somewhere accessible to the extension, limiting the threat-model benefit.

  **Recommendation:** Option B (local storage for credentials) is the right tradeoff and aligns with R61. If R61 adopts Option B, this concern is resolved as a side effect and only documentation is needed.

  **Concern 2: `http://` base URLs.** The manifest allows `http://*/*` in `optional_host_permissions`, and nothing in the options page rejects an `http://` base URL. If a user configures an `http://` Discourse instance, API keys travel as cleartext headers over the wire.

  - Option A: warn but allow. Show a warning in the options page when the base URL is `http://` (not `https://`), explaining that credentials will be sent unencrypted. - Pros: no hard block; user retains agency for local dev instances or LAN-only Discourse. - Cons: users may dismiss the warning.
  - Option B: reject `http://` entirely. Refuse to save or connect to non-HTTPS base URLs except `localhost` / `127.0.0.1`. - Pros: strongest posture; no credential exposure in transit. - Cons: breaks legitimate use cases (local dev Discourse, intranet instances without TLS, `http://localhost` testing).
  - Option C: allow `http://` only for `localhost` / `127.0.0.1` / `*.local`, warn for all others. - Pros: covers dev without exposing credentials on the open internet. - Cons: slightly more complex; intranet users behind a VPN with `http://` still lose out.

  **Recommendation:** Option A (warn but allow) for now, with a clear message in the options page. This respects the user's context (many Discourse instances run on LANs or localhost) while making the risk visible. Option C can be revisited if the store review or a security audit requires it.
- [x] **R64 - Make device-authorization polling resilient** to transient HTTP failures and the RFC 8628 `slow_down` status instead of aborting the whole authorization (`options/options.js`, `shared/discourse.js`).
- [x] **R65 - Handle undefined script-injection results in the popup** with a clear error message instead of a `TypeError` when the injected extractor throws in the page (`popup/popup.js`).
- [x] **R66 - Fix category loading permission prompts in the options page** so `chrome.permissions.request` is only called from real user gestures (not Tab focus) and concurrent focus/pointerdown triggers cannot start duplicate fetches or permission prompts (`options/options.js`).

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
