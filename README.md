<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Clip To Discourse Chromium Extension

<p align="center">
  <a href="https://chromewebstore.google.com/detail/clip-to-discourse/copdhiejkkdblhdcdjapcoalldkondhi">
    <img src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" alt="Available in the Chrome Web Store">
  </a>
</p>

This Chromium extension allows users to quickly create new topics or replies on Discourse forums by clipping content directly from web pages to the Discourse REST API. Requires Chrome 127 or later.

## Privacy

- The developer does not collect any data from your use of this extension.
- Clipped content and credentials are sent directly from your browser to the Discourse instance you configure. No intermediary service is involved.
- Profiles, credentials, and clipping preferences are stored locally in Chrome's extension storage on this device only. They are not synced through your Google account.
- Small non-sensitive preferences (theme, toolbar icon option, HTTP opt-in) are synced via Chrome's extension storage so they follow your browser profile.
- The extension reads the active page's URL, title, and user-selected or extracted content only when you invoke it.
- Favicon icons are fetched directly from your configured Discourse instance to display its icon on the toolbar.

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
- System, Light, and Dark appearance choices shared by the popup and Settings
- Default clip style and destination mode per profile
- Lazy-loaded category selectors showing the categories available to the connected account

**Security & Privacy:**
- No data collection by the developer - all clipping happens directly between your browser and your Discourse instance
- No intermediary service involved
- Credentials stored locally in Chrome's extension storage on this device only (not synced through your Google account)
- Non-sensitive preferences synced via Chrome so they follow your browser profile
- Support for user-scoped API keys with granular permissions
- HTTPS required by default; HTTP connections require an explicit advanced opt-in with a plaintext warning

## Installation & Setup

1. Download the extension from the Chrome Web Store
2. Click the extension icon and go to Settings
3. Enter your Discourse Base URL in Settings, select **User API**, and click **Authorize Clip To Discourse**. Sign in to Discourse, enter the displayed device code if requested, and approve access. Current Discourse sites do not require an administrator to configure a callback URL.
4. If User API authorization is unavailable on your site, an administrator can instead provide a single-user, granular API key for the **Admin API Key** tab. Avoid global keys.
5. Set your Profile's default clip style and destination mode
6. Start clipping content to your Discourse forum!
7. **Tip**: Pin the extension to your toolbar for easy access

## Profiles

Create multiple profiles to manage different Discourse instances or post as different users. Each profile includes:

- **Discourse Base URL**: The root URL of your Discourse instance (e.g. `https://meta.discourse.org`)
- **Authentication**: Prefer browser-based User API authorization; alternatively enter an administrator-generated single-user API key and its username
- **Default Clip Style**: Choose between "Title + URL", "Excerpt", "Full Page Text", or "Text Selection"
- **Default Destination Mode**: Create new topics or append to existing topics
- **Default Category/Topic**: Choose a visible Discourse category for new topics or enter a topic ID for replies
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

## Development

- Clone the repository to your local machine.
- Install dependencies with `npm ci`.
- **Run `npm run dev` to start the bundler in watch mode** - this will automatically rebuild when you make code changes.
- Load the extension from file locally via `chrome://extensions`, enable Developer mode, and choose "Load unpacked" with this repo folder.
- Open the extension popup, use the Settings link to configure your Discourse Base URL, API Username, and API Key.
- After the bundler rebuilds your changes, return to `chrome://extensions` and click "Reload" for the extension to pick up the changes.
- Run `s/lint` to check code style, `s/test` to run tests, and `s/build` for the complete validation and bundle build.
- Create a Chrome Web Store upload zip with `npm run package`.
- Bump versions and generate release notes with `npm run release` (dry run: `npm run release:dry`).

**Available npm scripts:**
- `npm run dev` - Start bundler in watch mode (recommended for development)
- `npm run bundle` - Build once without watching
- `npm run test` - Run unit tests once
- `npm run test:coverage` - Run core-logic coverage thresholds
- `npm run test:e2e` - Run Playwright tests against the unpacked extension in Chromium
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Full build with lint, test, bundle, and version check
- `npm run package` - Create release zip file

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contributor workflow, [spec/README.md](spec/README.md) for product decisions, [spec/roadmap.md](spec/roadmap.md) for planned work, and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

Developer guides for the runtime architecture, extending clip styles, and common diagnostics are in [docs/README.md](docs/README.md).

## License

Licensed under the GNU General Public License v3.0 only. See `LICENSE.md`.
