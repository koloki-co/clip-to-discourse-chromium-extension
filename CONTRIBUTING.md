# Contributing

Thanks for helping improve Clip to Discourse! This guide covers local setup, testing, and release flow.

## Prerequisites

- Node.js 20+ and npm.

## Local setup

- Install dependencies: `npm install`
- Run lint: `npm run lint`
- Run tests: `npm test`
- Package for the Chrome Web Store: `npm run package`

## Extension development

1. Open `chrome://extensions` and enable Developer mode.
2. Click "Load unpacked" and select this repository folder.
3. Make changes, then click "Reload" for the extension.

## Versioning and releases

- Ensure `manifest.json` and `package.json` stay in sync (CI enforces this).
- Preview release output: `npm run release:dry`
- Create a release commit and tag: `npm run release`
- Push the tag to trigger the release workflow.
