<!-- SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd -->
<!-- SPDX-License-Identifier: GPL-3.0-only -->

# Chrome Web Store Listing Copy

Copy-paste the text below into the Chrome Web Store Developer Dashboard listing fields.

## Short Description (132 characters max)

Clip web pages to your Discourse forum - title, URL, excerpt, full text, or selected text - directly from your browser.

## Detailed Description

Clip To Discourse lets you create topics or replies on your Discourse forum by clipping content directly from any web page.

**Four clip styles:**
- Title + URL - quick bookmark-style clips
- Title + URL + Excerpt - include a short excerpt of the page
- Full Page Text - convert the entire article to Markdown
- Text Selection - clip only the text you have highlighted

**How it works:**
1. Open the extension popup on any page (or right-click and choose "Clip to Discourse")
2. Choose your clip style and destination (new topic or reply to existing topic)
3. Click "Clip" - the content is sent directly to your Discourse instance

**User API authorization (recommended):**
Connect to your Discourse account without needing an administrator to create API keys. The extension uses Discourse's built-in User API key flow - you approve access in your browser and the extension stores the key locally. Works with current Discourse releases using device authorization.

**Admin API Key (fallback):**
If User API authorization is unavailable on your site, an administrator can provide a single-user API key with granular permissions instead.

**Multiple profiles:**
Maintain separate configurations for different Discourse instances or accounts. Switch between profiles from the popup or settings page.

**Customizable templates:**
Personalize how your clips appear using template placeholders for title, URL, date, excerpt, full text, and selected text.

**Privacy:**
- The developer does not collect any data from your use of this extension
- All clipped content and credentials are sent directly from your browser to the Discourse instance you configure
- No intermediary service is involved
- Credentials are stored locally on this device only, not synced through your Google account
- HTTPS is required by default; HTTP connections require an explicit advanced opt-in

**Requires Chrome 127 or later.**

## Category

Productivity

## Privacy Practices

Use the text in [privacy-permission-justification.md](privacy-permission-justification.md) for each permission in the data disclosure form.

## Screenshots

- `assets/images/popup-screenshot.png` - The popup clip form (380x600)
- `assets/images/settings-screenshot.png` - The settings page with profiles and connection options (1280x800)
- `assets/images/popup-selection-screenshot.png` - The popup with text selection detected (380x600)

## Support URL

https://github.com/koloki-co/clip-to-discourse-chromium-extension/issues

## Privacy Policy URL

https://github.com/koloki-co/clip-to-discourse-chromium-extension/blob/main/README.md#privacy