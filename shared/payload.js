// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { DESTINATIONS } from "./constants.js";

// Shape payloads for new topics vs append flows.
export function buildPayload({ destination, title, categoryId, topicId, raw }) {
  if (destination === DESTINATIONS.NEW_TOPIC) {
    const payload = {
      title,
      raw
    };
    if (categoryId) {
      payload.category = Number(categoryId);
    }
    return payload;
  }

  if (destination === DESTINATIONS.APPEND_TOPIC) {
    return {
      topic_id: Number(topicId),
      raw
    };
  }

  throw new Error("Unsupported destination mode.");
}
