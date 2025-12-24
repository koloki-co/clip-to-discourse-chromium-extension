# Clip To Discourse Chromium Extension

This Chromium extension allows users to quickly create new topics or replies on Discourse forums by clipping content directly from web pages to the Discourse REST API.

## Privacy
* It does not gather any data at all about you or your content
* All data is sent directly to your Discourse instance from your browser
* No third-party servers are involved

## Features
* Clip page title and URL, with optional excerpt or full text
* Create new topics or append to existing topics
* Configurable clip styles and destination modes

## Design Principles
* Clipping is a conscious act; nothing is archived without an explicit click.
* Output is Discourse-native Markdown with Onebox previews.
* Frequent choices live in the popup; infrequent settings live in the options page.

## Installation & Setup
1. Download the extension from the Chrome Web Store
2. Click the extension icon and go to Settings
3. Enter your Discourse Base URL, API Username, and API Key
	- Create a user-scoped API key from your Discourse admin UI with a **Granular** scope that allows **Topics: read (for connection test only), write, and update**. Avoid admin or global keys.
4. Set your default clip style and destination mode
5. Start clipping content to your Discourse forum!

## Security Notes
* Use a dedicated Discourse user for the API key when possible.
* Avoid admin keys; create a scoped key with only the permissions you need.

## How It Works
* Use the popup to choose a clip style and destination.
* For new topics, provide a Category ID; for replies, provide a Topic ID.
* The extension posts to `POST /posts.json` with Discourse API headers from your settings.

### Development
- Load the extension locally via `chrome://extensions`, enable Developer mode, and choose "Load unpacked" with this repo folder.
- Open the extension popup, use the Settings link to configure your Discourse Base URL, API Username, and API Key.
- After making code changes, return to `chrome://extensions` and click "Reload" for the extension.
- Install dependencies with `npm install`, run `npm run lint`, run `npm test`, and confirm versions with `npm run version:check`.
- Create a Chrome Web Store upload zip with `npm run package`.
- Bump versions and generate release notes with `npm run release` (dry run: `npm run release:dry`).
