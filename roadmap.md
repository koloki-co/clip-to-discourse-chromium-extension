<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip to Discourse – Roadmap

This roadmap lists outstanding features and improvements for the extension. All core MVP features (Phases 0-5) have been completed and the extension is live on the Chrome Web Store.

---

## Active Development

### Testing & Quality Assurance

**Configuration Storage Tests**
- [x] Add tests for `chrome.storage.sync` configuration loading/saving using Chrome extension test utilities or mocks
- [x] Add storage migration tests to verify upgrade paths from old to new settings formats

**UI Tests**
- [x] Add lightweight UI tests for popup behavior (state changes, validation, happy path clipping)
- [ ] Test profile switching and settings persistence

**Coverage & Regression**
- [ ] Set up coverage thresholds for core logic (extraction, payload building, posting)
- [ ] Add regression tests for edge cases (empty titles, very long content, special characters)

### Chrome Web Store

**Release Assets**
- [ ] Create/update promotional assets:
  - [ ] Screenshots (≥1280×800) showing key features
  - [ ] Optional promo tiles (440×280, 920×680)
  - [ ] Optional YouTube promo video
- [ ] Verify and update store listing descriptions
- [ ] Complete data disclosure form with current permissions

**Pre-publish QA**
- [ ] Test via "Load unpacked" on a fresh profile before each release
- [ ] Verify all clip styles work correctly
- [ ] Test connection test feature
- [ ] Verify favicon icon feature
- [ ] Test profile switching

### Documentation

**Developer Documentation**
- [ ] Add architecture overview linking modules to functionality:
  - [ ] Content extraction flow
  - [ ] Payload building
  - [ ] Discourse API integration
  - [ ] Settings/profile management
- [ ] Document how to add new clip styles or extend functionality
- [ ] Add troubleshooting guide for common development issues

---

## Future Enhancements

### User Experience

**Keyboard Shortcuts**
- [ ] Add configurable keyboard shortcut to open popup
- [ ] Add shortcut to clip with default settings (no popup)

**Enhanced Selection Clipping**
- [x] Pre-detect selection when popup opens and show visual indicator
- [ ] Auto-switch to excerpt mode when selection is detected
- [ ] Add preset "Clip Selection" style with selection-focused template
- [ ] Support multiple selections or ranges

**Daily Log Mode**
- [ ] Add "Daily Log" destination mode that appends to a daily topic
- [ ] Auto-create new daily topics with date-based naming
- [ ] Support custom date format templates

**Tagging Support**
- [ ] Add tag input field in popup
- [ ] Store default tags per profile
- [ ] Support tag autocomplete from Discourse API

### Clip Styles

**Screenshot Clipping**
- [ ] Capture visible viewport as screenshot
- [ ] Upload image to Discourse
- [ ] Include in clip body with optional caption
- [ ] Support full-page screenshots (scroll capture)

**Archive.org Integration**
- [ ] Add option to trigger archive.org capture when clipping
- [ ] Include archive.org link in clip body
- [ ] Show archive status in popup (pending/completed)
- [ ] Support checking for existing archives

### Platform Expansion

**Firefox Support**
- [ ] Verify MV3 API compatibility (`scripting.executeScript`, `action`, `storage.sync`, `permissions.request`)
- [ ] Add `browser_specific_settings.gecko.id` and `strict_min_version` to manifest
- [ ] Decide on namespace strategy: keep `chrome.*` or use `browser.*` with polyfill
- [ ] Verify optional host permissions flow for Firefox
- [ ] Add Firefox build target using `web-ext build`
- [ ] Document AMO signing and upload process
- [ ] Run full functional QA on Firefox

### Authentication

**User API Key Flow**
- [ ] Implement guided flow for per-user API key generation via `/user-api-key/new`
- [ ] Generate and store public/private keypair locally
- [ ] Construct authorization URL with required parameters
- [ ] Handle OAuth-style redirect callback
- [ ] Decrypt payload and persist user API key
- [ ] Support `User-Api-Key` and `User-Api-Client-Id` headers
- [ ] Add "Check API version" probe via `HEAD /user-api-key/new`
- [ ] Add "Revoke key" action via `POST /user-api-key/revoke`
- [ ] Update UI to support both admin API keys and user API keys

---

## Technical Debt & Maintenance

### Code Quality
- [ ] Review and refactor payload building for better testability
- [ ] Consolidate error handling patterns across modules
- [ ] Add JSDoc comments to public APIs
- [ ] Consider TypeScript migration for better type safety

### Performance
- [ ] Optimize bundle size (currently 148KB for popup)
- [ ] Lazy-load Turndown and Readability libraries
- [ ] Cache compiled templates

### Security
- [ ] Review CSP for extension pages
- [ ] Audit third-party dependencies
- [ ] Add security disclosure policy

---

## Completed Features

All Phase 0-5 features are complete:
- ✅ Project foundations, CI/CD, testing framework
- ✅ Discourse API integration with admin and user API key support
- ✅ Multiple profile management
- ✅ Content extraction (title, URL, excerpt, full text, selection)
- ✅ Three clip styles (Title+URL, Excerpt, Full Text)
- ✅ Markdown conversion with Onebox support
- ✅ Create new topics or append to existing topics
- ✅ Popup UI with profile switcher
- ✅ Settings/Options page
- ✅ Custom templates for titles and clip bodies
- ✅ Connection test functionality
- ✅ Optional favicon-based toolbar icon
- ✅ Chrome Web Store deployment
- ✅ Auto-bundling development workflow
- ✅ Context menu integration (simple right-click to open popup)
- ✅ Selection detection with visual indicator in popup
