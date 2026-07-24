<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Security Policy

## Reporting A Vulnerability

Please report suspected vulnerabilities through [GitHub private vulnerability reporting](https://github.com/koloki-co/clip-to-discourse-chromium-extension/security/advisories/new). Do not open a public issue with exploit details, API keys, credentials, or private Discourse content.

Include the affected version, reproduction steps, likely impact, and any suggested mitigation. You should receive an acknowledgement within seven days; remediation timing will depend on severity, exploitability, and user impact.

## Security Model

The extension sends clipped content and credentials directly from the browser to the Discourse instance configured by the user. It does not use an intermediary service. Users should use a user-scoped API key with only the permissions needed for clipping and should revoke any key they believe has been exposed.
