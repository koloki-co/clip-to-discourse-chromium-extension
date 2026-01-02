<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip To Discourse Chromium Extension

This Chromium extension allows users to quickly create new topics or replies on Discourse forums by clipping content directly from web pages to the Discourse REST API.

## Privacy

- It does not gather any data at all about you or your content.
- All data is sent directly to your Discourse instance from your browser.
- No third-party servers are involved.

## Features

- Clips page title and URL, with optional excerpts, text selection, or full text (coming soon).
- Create new topics or append clips to existing topics.
- Clips are converted to Markdown with Onebox previews.
- Clipping is user-driven - nothing is clipped without an explicit click.

## Installation & Setup

1. Download the extension from the Chrome Web Store
2. Click the extension icon and go to Settings
3. Create a user-scoped API key from your Discourse admin UI with a **Granular** scope that allows **Topics: read (for connection test only), write, and update**. Avoid admin or global keys.
4. Enter your Discourse Base URL, API Username, and API Key in the settings page
5. Set your Profile's default clip style and destination mode
6. Start clipping content to your Discourse forum!
7. **Tip**: Pin the extension to your toolbar for easy access

## Profiles

- Within each profile you can set these options, to allow you to have multiple sets of preferences including clipping to different Discourse instances, or as different users on the same.

  - **Discourse Base URL**: The root URL of your Discourse instance (e.g. `https://meta.discourse.org`).
  - **Discourse API Username**: The username of the Discourse user associated with the API key.
  - **Discourse API Key**: The API key generated from your Discourse instance.
  - **Default Clip Style**: Choose between "Title + URL", "Title + URL + Selection", or "Full Page Text".
  - **Default Destination Mode**: Choose between creating a new topic or appending to an existing topic.

### Clip Templates

You can customize the clip body templates (Title + URL, Excerpt, Full text) ion a per-Profile basis using placeholders like `{{title}}`, `{{url}}`, `{{date}}`, `{{datetime}}`, `{{excerpt}}`, `{{excerpt-plain}}`, `{{full-text}}`, `{{full-text-markdown}}`, `{{text-selection}}`, and `{{text-selection-markdown}}`.

### Development

- Clone the repository to your local machine.
- Load the extension from file locally via `chrome://extensions`, enable Developer mode, and choose "Load unpacked" with this repo folder.
- Open the extension popup, use the Settings link to configure your Discourse Base URL, API Username, and API Key.
- After making code changes, return to `chrome://extensions` and click "Reload" for the extension.
- Install dependencies with `npm install`, run `npm run lint`, run `npm test`, and confirm versions with `npm run version:check`.
- Create a Chrome Web Store upload zip with `npm run package`.
- Bump versions and generate release notes with `npm run release` (dry run: `npm run release:dry`).

## License

Licensed under the GNU General Public License v3.0 only. See `LICENSE.md`.
