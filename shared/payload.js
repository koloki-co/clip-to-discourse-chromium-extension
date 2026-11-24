// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { DESTINATIONS, MAX_PAYLOAD_LENGTH, MAX_TITLE_LENGTH } from "./constants.js";

export const TRUNCATION_NOTICE = "\n\n_(truncated by Clip to Discourse — original exceeded Discourse's 50,000 character post limit)_";

function truncateAtCodePointBoundary(value, maximumLength) {
  const truncated = value.slice(0, maximumLength);
  const finalCodeUnit = truncated.charCodeAt(truncated.length - 1);
  return finalCodeUnit >= 0xD800 && finalCodeUnit <= 0xDBFF
    ? truncated.slice(0, -1)
    : truncated;
}

/**
 * Truncate a post body to Discourse's post length limit, appending
 * {@link TRUNCATION_NOTICE}. The cut point is adjusted so it never splits a
 * UTF-16 surrogate pair. Non-string input is returned unchanged.
 * @param {string} raw - Raw markdown post body.
 * @returns {string} `raw` unchanged if within {@link MAX_PAYLOAD_LENGTH}, otherwise truncated with the notice appended.
 */
export function truncateRaw(raw) {
  if (typeof raw !== "string") {
    return raw;
  }
  if (raw.length <= MAX_PAYLOAD_LENGTH) {
    return raw;
  }
  const noticeLength = TRUNCATION_NOTICE.length;
  return truncateAtCodePointBoundary(raw, MAX_PAYLOAD_LENGTH - noticeLength) + TRUNCATION_NOTICE;
}

/**
 * Truncate a topic title to Discourse's title length limit. The cut point is
 * adjusted so it never splits a UTF-16 surrogate pair. Non-string input is
 * returned unchanged.
 * @param {string} title - Topic title.
 * @returns {string} `title` unchanged if within {@link MAX_TITLE_LENGTH}, otherwise truncated (no notice appended).
 */
export function truncateTitle(title) {
  if (typeof title !== "string") {
    return title;
  }
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }
  return truncateAtCodePointBoundary(title, MAX_TITLE_LENGTH);
}

/**
 * Parse a comma-separated tags field into a deduplicated list of Discourse
 * tag slugs, trimming whitespace and dropping empty entries. Non-string
 * input returns an empty array.
 * @param {string} value - Raw tags input, e.g. `"research, reading-list, research"`.
 * @returns {string[]} Deduplicated, trimmed tag slugs in their original order.
 */
export function parseTags(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  const seen = new Set();
  const tags = [];
  value.split(",").forEach((entry) => {
    const tag = entry.trim();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  });
  return tags;
}

/**
 * Shape a Discourse `/posts.json` payload for either a new topic or a reply
 * appended to an existing topic. `raw` and `title` are truncated via
 * {@link truncateRaw} and {@link truncateTitle} before shaping.
 * @param {object} options
 * @param {string} options.destination - One of {@link DESTINATIONS} (`NEW_TOPIC` or `APPEND_TOPIC`).
 * @param {string} [options.title] - Topic title, used only for `NEW_TOPIC`.
 * @param {string|number} [options.categoryId] - Target category id, used only for `NEW_TOPIC`; omitted from the payload when falsy.
 * @param {string|number} [options.topicId] - Target topic id, used only for `APPEND_TOPIC`.
 * @param {string} options.raw - Post body markdown.
 * @param {string[]} [options.tags] - Discourse tag slugs, used only for `NEW_TOPIC`; omitted from the payload when empty.
 * @returns {object} A payload shaped for Discourse's `/posts.json` endpoint.
 * @throws {Error} If `destination` is not a recognized {@link DESTINATIONS} value.
 */
export function buildPayload({ destination, title, categoryId, topicId, raw, tags }) {
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
    if (Array.isArray(tags) && tags.length > 0) {
      payload.tags = tags;
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
