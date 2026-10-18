<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip To Discourse Roadmap

This roadmap lists outstanding features and improvements for the extension. Completed work is recorded in [CHANGELOG.md](../CHANGELOG.md) and Git history, and is removed from this file once shipped rather than left checked off.

Legend: [ ] not started. Every item has a stable `Rxx` code; do not renumber or reuse codes. The next free code is R75.

---

## Active Development

### v1.0 Release Readiness

Gate items that must close before bumping to `1.0.0`.

- [ ] **R06 - Complete the data disclosure form with current permissions** using `privacy-permission-justification.md` now that R68 has removed `notifications`.

### Security And Privacy

- [ ] **R67 - Offer opt-in passphrase protection for locally stored credentials** using a user-chosen passphrase, key derivation, authenticated encryption, a clear forgotten-passphrase warning, and a migration path for existing local credentials. This is for security-conscious users and must remain optional rather than blocking the default local-only credential flow.

---

## Future Enhancements

### User Experience

#### Enhanced Selection Clipping
- [ ] **R21 - Add a preset "Clip Selection" style with a selection-focused template**
- [ ] **R22 - Support multiple selections or ranges**

#### Tagging Support
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

---

## Technical Debt And Maintenance

### Code Quality
- [ ] **R45 - Review and refactor payload building for better testability**
- [ ] **R46 - Consolidate error handling patterns across modules**
- [ ] **R48 - Evaluate a TypeScript migration and record the decision**

### Performance
- [ ] **R51 - Cache compiled templates if profiling shows a useful benefit**

### Security
- [ ] **R74 - Evaluate a replacement for `standard-version`**, which is upstream-deprecated (no release since 2023-04). Candidates: `release-please` or the `commit-and-tag-version` fork, per the maintainer's own recommendation. See [SECURITY.md](../SECURITY.md) ("Dependency Audit").
