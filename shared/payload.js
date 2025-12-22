import { DESTINATIONS } from "./constants.js";

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
