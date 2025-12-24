export const DEFAULT_EXCERPT_LENGTH = 800;

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
