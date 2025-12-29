// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

// Text processing helpers for excerpt and full-text clipping.
export const DEFAULT_EXCERPT_LENGTH = 800;

// Normalize whitespace for cleaner excerpts and full-text captures.
export function normalizeText(text) {
  if (!text) {
    return "";
  }
  return text
    .replace(/\r/g, "")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Trim to a max length without splitting into multiple paragraphs.
export function buildExcerpt(text, maxLength = DEFAULT_EXCERPT_LENGTH) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength).trim();
}
