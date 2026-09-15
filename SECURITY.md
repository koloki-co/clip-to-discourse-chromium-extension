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
