<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Contributing

Thanks for helping improve Clip to Discourse! This guide covers local setup, testing, and release flow.

## Prerequisites

- Node.js 20+ and npm.
- Playwright Chromium, installed once with `npx playwright install chromium`.

## Local setup

- Install dependencies: `npm ci`
- Run lint: `s/lint`
- Run unit and Playwright extension tests: `s/test`
- Run core-logic coverage thresholds: `npm run test:coverage`
- Run the complete build: `s/build`
- Package for the Chrome Web Store: `npm run package`

## Extension development

1. Open `chrome://extensions` and enable Developer mode.
2. Click "Load unpacked" and select this repository folder.
3. Make changes, then click "Reload" for the extension.

## Browser Extension Tests

`npm run test:e2e` bundles and loads the unpacked extension into a temporary persistent Chromium profile. Tests use loopback fixture servers and dummy credentials; non-loopback HTTP traffic is blocked. Because headless Chromium cannot accept extension host-access prompts, a temporary manifest copy pregrants only the mock API host while preserving and checking the production manifest's optional-access contract.

### Native Toolbar Favicon Check

Playwright verifies favicon fetching, caching, and the action title, but Chromium does not expose native toolbar pixels to automation. Before a release, load the unpacked extension in Chromium, enable “Use destination site favicon for the toolbar icon” in Settings, save, and confirm the toolbar uses the destination favicon. Disable the setting and confirm the fallback Clip To Discourse icon returns.

## Versioning and releases

- Ensure `manifest.json` and `package.json` stay in sync (CI enforces this).
- Preview release output: `npm run release:dry`
- Create a release commit and tag: `npm run release`
- Push the tag to trigger the release workflow.
