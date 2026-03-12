<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip To Discourse Chromium Extension

<p align="center">
  <a href="https://chromewebstore.google.com/detail/clip-to-discourse/copdhiejkkdblhdcdjapcoalldkondhi">
    <img src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" alt="Available in the Chrome Web Store">
  </a>
</p>

This Chromium extension allows users to quickly create new topics or replies on Discourse forums by clipping content directly from web pages to the Discourse REST API.

## Privacy

- It does not gather any data at all about you or your content.
- All data is sent directly to your Discourse instance from your browser.
- No third-party servers are involved.

## Features

**Core Clipping:**
- Clip page title and URL with four clip styles: Title + URL only, Title + URL + Excerpt, Full Page Text, or Text Selection
- Text selection clipping - select text on any page, open the popup, and the "Text Selection" style is automatically selected
- Create new topics or append clips to existing topics
- Automatic conversion to Discourse-compatible Markdown with Onebox previews
- User-driven clipping - nothing is sent without an explicit click

**Customization:**
- Multiple profiles - maintain separate configurations for different Discourse instances or users
- Customizable templates for titles and clip body using placeholders like `{{title}}`, `{{url}}`, `{{date}}`, `{{datetime}}`, `{{excerpt}}`, `{{full-text}}`, `{{text-selection}}`
- Optional favicon-based toolbar icon to match your Discourse instance
- Default clip style and destination mode per profile

**Security & Privacy:**
- No data collection - all clipping happens directly between your browser and your Discourse instance
- No third-party servers involved
- API keys stored securely in Chrome's sync storage
- Support for user-scoped API keys with granular permissions

## Installation & Setup

1. Download the extension from the Chrome Web Store
2. Click the extension icon and go to Settings
3. Create a user-scoped API key from your Discourse admin UI with a **Granular** scope that allows **Topics: read (for connection test only), write, and update**. Avoid admin or global keys.
4. Enter your Discourse Base URL, API Username, and API Key in the settings page
5. Set your Profile's default clip style and destination mode
6. Start clipping content to your Discourse forum!
7. **Tip**: Pin the extension to your toolbar for easy access

## Profiles

Create multiple profiles to manage different Discourse instances or post as different users. Each profile includes:

- **Discourse Base URL**: The root URL of your Discourse instance (e.g. `https://meta.discourse.org`)
- **Discourse API Username**: The username associated with the API key
- **Discourse API Key**: Admin API key or user-scoped API key with granular permissions
- **Default Clip Style**: Choose between "Title + URL", "Excerpt", or "Full Page Text"
- **Default Destination Mode**: Create new topics or append to existing topics
- **Default Category/Topic**: Pre-fill category ID for new topics or topic ID for replies
- **Custom Templates**: Personalize how your clips appear using template placeholders

## Templates

Customize your clip appearance using template placeholders:

**Title Template** (for new topics):
- `{{title}}` - Page title
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{datetime}}` - Full timestamp with UTC

**Body Templates** (for clip content):
- `{{title}}`, `{{url}}` - Page metadata
- `{{excerpt}}`, `{{excerpt-plain}}` - Short excerpt (Markdown or plain text)
- `{{full-text}}`, `{{full-text-plain}}`, `{{full-text-markdown}}` - Full page content
- `{{text-selection}}`, `{{text-selection-markdown}}` - Selected text

Example title template: `Clip {{date}}: {{title}}`
Example body template: `### {{title}}\n{{url}}\n\n{{excerpt}}`

### Development

- Clone the repository to your local machine.
- Install dependencies with `npm install`.
- **Run `npm run dev` to start the bundler in watch mode** - this will automatically rebuild when you make code changes.
- Load the extension from file locally via `chrome://extensions`, enable Developer mode, and choose "Load unpacked" with this repo folder.
- Open the extension popup, use the Settings link to configure your Discourse Base URL, API Username, and API Key.
- After the bundler rebuilds your changes, return to `chrome://extensions` and click "Reload" for the extension to pick up the changes.
- Run `npm run lint` to check code style, `npm test` to run tests, and `npm run version:check` to confirm versions.
- Create a Chrome Web Store upload zip with `npm run package`.
- Bump versions and generate release notes with `npm run release` (dry run: `npm run release:dry`).

**Available npm scripts:**
- `npm run dev` - Start bundler in watch mode (recommended for development)
- `npm run bundle` - Build once without watching
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Full build with lint, test, bundle, and version check
- `npm run package` - Create release zip file

## License

Licensed under the GNU General Public License v3.0 only. See `LICENSE.md`.
