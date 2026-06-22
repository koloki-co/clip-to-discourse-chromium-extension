// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { DESTINATIONS, MAX_PAYLOAD_LENGTH, MAX_TITLE_LENGTH } from "./constants.js";

export const TRUNCATION_NOTICE = "\n\n_(truncated by Clip to Discourse — original exceeded Discourse's 50,000 character post limit)_";

export function truncateRaw(raw) {
  if (typeof raw !== "string") {
    return raw;
  }
  if (raw.length <= MAX_PAYLOAD_LENGTH) {
    return raw;
  }
  const noticeLength = TRUNCATION_NOTICE.length;
  return raw.slice(0, MAX_PAYLOAD_LENGTH - noticeLength) + TRUNCATION_NOTICE;
}

export function truncateTitle(title) {
  if (typeof title !== "string") {
    return title;
  }
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }
  return title.slice(0, MAX_TITLE_LENGTH);
}

// Shape payloads for new topics vs append flows.
export function buildPayload({ destination, title, categoryId, topicId, raw }) {
  const trimmedRaw = truncateRaw(raw);
  const trimmedTitle = truncateTitle(title);

  if (destination === DESTINATIONS.NEW_TOPIC) {
    const payload = {
      title: trimmedTitle,
      raw: trimmedRaw
    };
    if (categoryId) {
      payload.category = Number(categoryId);
    }
    return payload;
  }

  if (destination === DESTINATIONS.APPEND_TOPIC) {
    return {
      topic_id: Number(topicId),
      raw: trimmedRaw
    };
  }

  throw new Error("Unsupported destination mode.");
}
