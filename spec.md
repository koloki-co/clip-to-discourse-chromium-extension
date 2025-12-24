# Clip to Discourse Chromium Extension

## 1. Overview

Clip to Disourse is a Chromium browser extension that allows a user to manually clip web content into their own Discourse instance, turning Discourse into a personal knowledge base and Evernote-style archive. It works with any Discourse forum where the user has an account and can create an API key.

## 2. Design Principles

- Clipping is a conscious act. Nothing is archived unless the user explicitly clips it.
- One click  [change clip style only if necessary]  clip.

### Discourse-native output

Content is posted in a way that:

- is readable in Discourse
- is searchable in Discourse
- benefits from Onebox previews
- feels native, not machine-generated

### Separation of concerns

- Frequent choices (clip style, destination) live in the popup
- Less frequently changed settings (API key, base URL, username) live in a settings page

## 3. Core User Experience

### 3.1 Primary interaction (MVP)

- User clicks the Clip to Discourse extension icon
- Popup opens
- User selects:
   - clip style
   - destination (new topic vs append)
- User clicks Clip
- Current page is posted to Discourse
- This should work without bookmarking.

## 4. UI Components

### 4.1 Extension Popup (Primary UI)

Displayed when the extension icon is clicked.

#### 4.1.0 Active Profile (frequently changed)

- Profile selector to switch between saved Discourse configurations.
- Selection immediately changes which Discourse instance and defaults are used.

#### 4.1.1 Clip Style (frequently changed)

Radio buttons or checkboxes (mutually exclusive):

- Title + URL only
- Title + URL + short excerpt
   - excerpt = first N lines or characters of visible text
- Full page text
   - extracted readable content (not raw HTML)
- screenshot (future, not MVP)
- Link to Archive.org saved version of the page (possibly with automatic trigger to archive the page) (future, not MVP)

Only one clip style can be active per clip.

Defaults:

- MVP default: Title + URL

#### 4.1.2 Destination Mode (frequently changed)

Dropdown or radio buttons:

- Create new topic - requires Category ID
- Append to existing topic - requires Topic ID

The popup must dynamically show/hide:

- CategoryId field (new topic mode)
- TopicId field (append mode)

#### 4.1.3 Optional per-clip metadata (future, not MVP)

(Not required for first iteration, but popup layout should allow growth.)

Examples:

- tags
- note/comment from user
- override title

### 4.1.4 Visual Style (MVP)

- Use the Lato font across popup and settings UI.
- Popup and settings background color: `rgb(214, 201, 170)` (hex `#D6C9AA`).
- Primary button color: `rgb(87, 113, 136)` (hex `#577188`).

### 4.2 Settings Page (Infrequently changed)

Accessible via:

- Chrome Extensions → Extension Details → Options
or
- Popup → “Settings” link/button

#### 4.2.1 Required settings

- Discourse BaseURL e.g. https://forum.example.com, stored without trailing slash
- API Username - the account that will own the posts in Discourse e.g. 'clipbot' or user’s own account
- Discourse API Key stored in chrome.storage.sync

#### 4.2.2 Optional settings

- Default clip style
- Default destination mode
- Default Category ID / Topic ID
- Title template for new topics, e.g. Clip: {{title}} or Clip {{date}}: {{title}}

#### 4.2.3 Multiple profiles

- Users can save multiple Discourse configurations (profiles).
- Settings UI must allow creating, naming, deleting, and switching profiles.
- Popup must allow quick switching of the active profile.
- A global option allows using the destination site favicon for the extension toolbar icon.

## 5. Clipping Behaviour

### 5.1 Content extraction rules

#### Title + URL

- Title comes from `document.title`
- Trim whitespace sensibly, don't post a solid unformatted block of text
- Title Fallback: “{{datetime}} Clipped with Clip To Discourse” (most discourses will not allow topics to be created with identical titles)
- URL comes from `window.location.href`

Format as per the below block

```
### {{Title}}
{{URL}}

```

The above renders as a H3 header in Discourse, which is visually distinct without being too large. A bare URL on its own line triggers Oneboxing.

#### Short excerpt (not MVP)

- Extract visible text from page
- Truncate to configurable limit (e.g. 500–1000 characters)
- No attempt to summarise (pure truncation, there is no AI)

#### Full page (not MVP)

- Extract readable article content
- Exclude:
   - navigation
   - scripts
   - styles

Plain text only for MVP (no HTML retention)

### 5.2 Discourse payload format

New topic

POST /posts.json

Fields:

- title
- raw
- category (optional integer category ID, only used when creating a new topic)

Reply to topic

POST /posts.json

Fields:

- topic_id
- raw

### 5.3 Markdown structure (guideline)

All clip styles should produce predictable, searchable Markdown.

Example (Title + URL only):

### Example Page
https://example.com

Example (Excerpt):

### Example Page
https://example.com

> First few lines of content…
> truncated…

https://example.com

Example (Full page):

### Example Page
https://example.com

---

<full extracted text>

---

https://example.com

The final bare URL ensures Discourse Oneboxing.

## 6. Storage & State

### 6.1 Chrome storage

Use `chrome.storage.sync` for:

- profiles (array of settings objects, each with its own credentials and defaults)
- activeProfileId (string)
- useFaviconForIcon (boolean)

No server-side state required.

## 7. Permissions (MVP)

```json
"permissions": [
   "storage",
   "activeTab",
   "scripting"
]
```

No bookmarks permission required for MVP.

## 8. Security Model (MVP)

* API key is stored client-side, never sent to any external service other than the user’s Discourse instance.

Documentation must suggest that users:

- use a specific Discourse user for the API key
- avoid admin keys, instead used a scoped key with permissions as appropriate

## 9. Explicit Non-Goals (MVP)

These are deliberately excluded from initial implementation:

- Automatic bookmarking sync
- Background scraping
- AI summarisation
- Tag suggestion
- Cross-device sync beyond Chrome storage
- Multi-account Discourse switching

## 10. Future Enhancements (Post-MVP)

- Bookmark-triggered clipping
- Context-menu “Clip this page”
- Daily log topic mode
- Tagging UI
- Highlight-to-clip
- Server-side relay (n8n)
- Firefox / Safari ports
