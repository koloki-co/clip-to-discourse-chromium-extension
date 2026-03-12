// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

// Enumerations used by both popup and options UIs.
export const CLIP_STYLES = {
  TITLE_URL: "title_url",
  EXCERPT: "excerpt",
  FULL_TEXT: "full_text",
  TEXT_SELECTION: "text_selection"
};

export const DESTINATIONS = {
  NEW_TOPIC: "new_topic",
  APPEND_TOPIC: "append_topic"
};

export const AUTH_METHODS = {
  ADMIN_API_KEY: "admin_api_key",
  USER_API: "user_api"
};

// Maximum character length for the raw post body sent to Discourse.
// Content exceeding this limit is truncated before posting.
export const MAX_PAYLOAD_LENGTH = 50000;

// Maximum character length for topic titles sent to Discourse.
// Discourse enforces a 255 character limit for topic titles.
export const MAX_TITLE_LENGTH = 255;
