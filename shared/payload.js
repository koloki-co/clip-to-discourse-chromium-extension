// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { DESTINATIONS, MAX_PAYLOAD_LENGTH } from "./constants.js";

export function truncateRaw(raw) {
  if (typeof raw !== "string") {
    return raw;
  }
  if (raw.length <= MAX_PAYLOAD_LENGTH) {
    return raw;
  }
  return raw.slice(0, MAX_PAYLOAD_LENGTH);
}

// Shape payloads for new topics vs append flows.
export function buildPayload({ destination, title, categoryId, topicId, raw }) {
  const trimmedRaw = truncateRaw(raw);

  if (destination === DESTINATIONS.NEW_TOPIC) {
    const payload = {
      title,
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
