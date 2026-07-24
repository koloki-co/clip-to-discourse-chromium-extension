<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Agent Instructions

Clip to Discourse is a Manifest V3 Chromium extension that sends user-selected web content directly from the browser to a configured Discourse instance. It has no intermediary service and must not introduce one without an explicit product decision.

## Read First

- [README.md](README.md) - product overview, installation, and development setup.
- [spec/README.md](spec/README.md) - specification index and reading order.
- [spec/roadmap.md](spec/roadmap.md) - outstanding work and stable roadmap references.
- [~/code/house-style/AGENTS.md](~/code/house-style/AGENTS.md) - cross-repository standards.

## Core Invariants

- Send clipped content and credentials only to the Discourse instance chosen by the user.
- Keep API keys in extension storage and never log or transmit them elsewhere.
- Bundle runtime dependencies locally; extension pages must not load executable code from a CDN.
- Keep `manifest.json` and `package.json` versions in sync.
- Do not hand-edit generated `*.bundle.js` files; regenerate them with `s/build` or `npm run bundle`.

## Workflow

- `s/build` - lint, test, bundle, and verify versions.
- `s/test` - run the test suite once.
- `s/lint` - run ESLint.

## Before Every Commit

```sh
s/lint
s/test
s/build
```

Review the diff after generated bundles are rebuilt and confirm no credentials or private configuration were added.

Playwright tests require a one-time local `npx playwright install chromium`. They use temporary browser profiles, loopback mock servers, and dummy credentials only.

## Approval Required

Ask before publishing releases, uploading to the Chrome Web Store, changing secrets, deleting branches, force-pushing, or taking other externally visible actions.
