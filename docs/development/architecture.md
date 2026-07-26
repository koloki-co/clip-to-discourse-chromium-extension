<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Architecture

Clip To Discourse is a Manifest V3 Chromium extension. It sends a user-requested clip directly from the browser to the configured Discourse instance. It has no relay service.

## Runtime Entry Points

`manifest.json` declares three extension entry points:

| Surface | Source | Responsibility |
| --- | --- | --- |
| Action popup | `popup/popup.js` | Read the active page, choose a clip style and destination, build a post, and submit it. |
| Options page | `options/options.js` | Manage profiles, credentials, defaults, optional host access, connection checks, and User API authorization. |
| Service worker | `background.js` | Create context menus and refresh the toolbar icon when relevant settings change. |

`scripts/bundle.js` bundles those sources with esbuild into `popup/popup.bundle.js`, `options/options.bundle.js`, and `background.bundle.js`. The bundles are generated artifacts: edit source files, run `npm run bundle`, and reload the extension instead of editing a bundle.

## Clip Flow

```text
Active browser tab
  -> popup/popup.js injects a read-only page snapshot
  -> shared/extract.js transforms only the selected clip style's content
  -> shared/markdown.js applies the profile template
  -> shared/payload.js validates destination fields and applies length limits
  -> shared/discourse.js sends JSON directly to the configured Discourse API
```

The popup takes one snapshot when it opens and reuses it for submission. The injected function reads the page title, URL, article or main content, page content, and any text selection. It never sends this snapshot to the service worker or another server.

### Extraction By Clip Style

| Clip style | Input | Processing |
| --- | --- | --- |
| Title + URL | Page title and URL | No extraction pipeline. |
| Excerpt | Page text and HTML | Plain and Markdown excerpts are capped by `buildExcerpt()`. |
| Full page text | Article, main, or body HTML | Mozilla Readability, cleanup, Turndown with GFM support, relative URL resolution, and Markdown post-processing. |
| Text selection | Selected text and cloned selection HTML | Normalized plain text and Markdown conversion. |

`shared/markdown.js` chooses the profile template and expands tokens such as `{{title}}`, `{{url}}`, `{{excerpt}}`, `{{full-text}}`, and `{{text-selection-markdown}}`. `shared/payload.js` then creates either a new-topic payload (`title`, `raw`, optional `category`) or reply payload (`topic_id`, `raw`). It limits post bodies to 50,000 UTF-16 code units without splitting a Unicode surrogate pair and titles to 255 code units.

## Discourse API Boundary

`shared/discourse.js` is the only module that talks to Discourse. It sends requests to the selected profile's `<baseUrl>/posts.json`, `<baseUrl>/site.json`, and `<baseUrl>/session/current.json` endpoints using one of two authentication schemes:

- Admin API key: `Api-Key` and `Api-Username` headers.
- User API: `User-Api-Key` and optional `User-Api-Client-Id` headers.

Responses are converted to specific, actionable errors before the UI displays them. The service worker does not proxy API requests, and credentials must never be logged.

## Profiles And Storage

Profiles, their active identifier, and credentials are held in `chrome.storage.local`. They stay on the current browser device and are not synchronised through the user's browser account. `shared/settings.js` normalizes profiles, migrates pre-profile and pre-local-storage layouts, and serializes profile read-modify-write operations with the Web Locks API when available.

Small non-sensitive global preferences, including the toolbar favicon setting, the HTTP development opt-in, and theme choice, are stored in `chrome.storage.sync`. Favicon image data is cached locally because it can be large and belongs to a specific device profile.

## Permissions And Trust Boundaries

The extension has `activeTab` and `scripting` permissions so a user opening the popup can clip the current page without permanent access to every site. Access to a Discourse instance is requested as optional host permission from the options page when the user saves, tests, or authorizes that profile.

HTTPS is required by default. A user must explicitly enable the advanced HTTP option before the extension accepts a plaintext base URL. Every network request must remain limited to the selected Discourse instance, except for the page-read injection that remains in the active tab.

## User API Authorization

The options page checks the site's User API capabilities first. Modern Discourse instances use device authorization; older compatible instances use the Chrome identity redirect flow. In both cases the page creates an ephemeral RSA-OAEP key pair, decrypts the returned payload in memory, verifies its nonce, and stores only the resulting User API credential in the selected local profile. The private key is never persisted.

## Testing Boundaries

Unit tests cover pure extraction, Markdown, payload, settings, and API behavior. Playwright E2E tests load a copied unpacked extension in a fresh temporary Chromium profile, use loopback-only fixture servers and dummy credentials, and exercise the real popup, options page, service worker, and extension APIs. See [Troubleshooting](troubleshooting.md#browser-extension-tests) for the headless host-permission accommodation.
