import { CLIP_STYLES } from "./constants.js";

export function normalizeTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function fallbackTitle() {
  const timestamp = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  return `${timestamp} Clipped with Clip To Discourse`;
}

export function applyTitleTemplate(template, title) {
  const safeTemplate = template && template.includes("{{title}}") ? template : "Clip: {{title}}";
  const date = new Date().toISOString().slice(0, 10);
  return safeTemplate.replace(/\{\{title\}\}/g, title).replace(/\{\{date\}\}/g, date);
}

export function buildMarkdown({ title, url, clipStyle, excerpt, fullText }) {
  const safeTitle = normalizeTitle(title) || fallbackTitle();
  const safeUrl = url || "";

  if (clipStyle === CLIP_STYLES.TITLE_URL) {
    return `### ${safeTitle}\n` + `${safeUrl}\n`;
  }

  if (clipStyle === CLIP_STYLES.EXCERPT) {
    const text = excerpt ? excerpt.trim() : "";
    return (
      `### ${safeTitle}\n` +
      `${safeUrl}\n\n` +
      (text ? `> ${text.replace(/\n/g, "\n> ")}\n\n` : "") +
      `${safeUrl}`
    );
  }

  if (clipStyle === CLIP_STYLES.FULL_TEXT) {
    const text = fullText ? fullText.trim() : "";
    return (
      `### ${safeTitle}\n` +
      `${safeUrl}\n\n---\n\n` +
      `${text}\n\n---\n\n` +
      `${safeUrl}`
    );
  }

  throw new Error("Unsupported clip style.");
}
