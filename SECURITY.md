<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Security Policy

## Reporting A Vulnerability

Please report suspected vulnerabilities through [GitHub private vulnerability reporting](https://github.com/koloki-co/clip-to-discourse-chromium-extension/security/advisories/new). Do not open a public issue with exploit details, API keys, credentials, or private Discourse content.

Include the affected version, reproduction steps, likely impact, and any suggested mitigation. You should receive an acknowledgement within seven days; remediation timing will depend on severity, exploitability, and user impact.

## Security Model

The extension sends clipped content and credentials directly from the browser to the Discourse instance configured by the user. It does not use an intermediary service. Users should use a user-scoped API key with only the permissions needed for clipping and should revoke any key they believe has been exposed.

## Content Security Policy

`manifest.json` declares an explicit `content_security_policy.extension_pages` for the popup and options pages: `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'`. Manifest V3 already forbids remote code and inline scripts by default; this policy makes that explicit and further tightens `object-src` (no plugin/embed content is used), `base-uri` (no `<base>` tag is used, so it cannot be hijacked to rewrite relative URLs), and `form-action` (both forms handle submission in JavaScript via `preventDefault()` and never navigate). `connect-src`, `img-src`, and `style-src` are left at their permissive defaults because the extension fetches from and loads favicons for whichever Discourse host the user configures, which cannot be known in advance.

## Dependency Audit

Reviewed 2026-10-17 (roadmap R53). Runtime dependencies are the only code shipped to users; dev dependencies run on the maintainer's machine and in CI only.

### Runtime (shipped in the bundled extension)

- `@mozilla/readability` (Apache-2.0) - at latest (0.6.0), actively maintained by Mozilla.
- `turndown` (MIT) - at latest, actively maintained, no known advisories.
- `turndown-plugin-gfm` (MIT) - small, stable, single-purpose plugin under the same `mixmark-io` org as `turndown`. No release since 2022, but no open security issues and no API surface that needs one; low risk given its size and scope.

No shipped dependency has an open advisory or install-time script.

### Development (build, lint, and test tooling; never shipped)

`eslint`, `@eslint/js`, `globals`, `@playwright/test`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `esbuild`, and `commit-and-tag-version` are all actively maintained with recent releases; `esbuild`'s postinstall script is blocked by npm's default `allowScripts` policy and is not needed for this project's build. `npm audit` currently reports 0 vulnerabilities; two transitive advisories (a `brace-expansion` denial-of-service chain via eslint, and a critical `handlebars` JavaScript-injection chain via the now-removed `standard-version`) were found and fixed during routine dependency updates in October 2026.

**Resolved finding:** `standard-version` (used for `npm run release`) was explicitly deprecated by its own maintainer - no release since 2023-04-01, with the README recommending `release-please` or the `commit-and-tag-version` fork as replacements. It had no open advisories, so this wasn't urgent, but the lack of upstream maintenance meant future advisories in its dependency tree (such as the `handlebars` one above) wouldn't get a proper upstream fix. Replaced with `commit-and-tag-version`, the maintained fork, per roadmap R74.
