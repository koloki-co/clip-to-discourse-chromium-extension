// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { CLIP_STYLES } from "./constants.js";
import { truncateTitle } from "./payload.js";

export const DEFAULT_CLIP_TEMPLATES = {
  titleUrl: "### {{title}}\n{{url}}\n",
  excerpt: "### {{title}}\n{{url}}\n\n{{excerpt}}\n\n{{url}}",
  fullText: "### {{title}}\n{{url}}\n\n---\n\n{{full-text}}\n\n---\n\n{{url}}",
  textSelection: "### {{title}}\n{{url}}\n\n{{text-selection-markdown}}\n\n{{url}}"
};

function formatCodeBlock(text) {
  const trimmed = text ? text.trim() : "";
  if (!trimmed) {
    return "";
  }
  return `\`\`\`\n${trimmed}\n\`\`\``;
}

function normalizeToken(value) {
  return value.toLowerCase().replace(/_/g, "-");
}

/**
 * Replace `{{token}}` placeholders in a template with values from `data`.
 * Token matching is case-insensitive and treats `_` and `-` as equivalent
 * (e.g. `{{FULL_TEXT}}` and `{{full-text}}` both resolve to `data["full-text"]`).
 * Unknown tokens resolve to an empty string.
 * @param {string} template - Template string containing `{{token}}` placeholders.
 * @param {Record<string, string>} data - Replacement values keyed by normalized (lowercase, hyphenated) token name.
 * @returns {string} `""` if `template` is falsy, otherwise the template with placeholders substituted.
 */
export function applyTemplate(template, data) {
  if (!template) {
    return "";
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, token) => {
    const key = normalizeToken(token);
    if (!(key in data)) {
      return "";
    }
    return data[key] ?? "";
  });
}

/**
 * Normalize a page-derived title: trims whitespace and coerces non-string
 * input to `""`. Does not apply {@link fallbackTitle} — callers combine the
 * two when an empty title needs a stand-in.
 * @param {unknown} value - Raw title value, typically from the page's `document.title`.
 * @returns {string}
 */
export function normalizeTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Generate a timestamped fallback title (e.g. `"2026-08-25 12:00:00 UTC
 * Clipped with Clip To Discourse"`), used whenever a page has no usable
 * title, to keep posts unique and identifiable.
 * @returns {string}
 */
export function fallbackTitle() {
  const timestamp = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  return `${timestamp} Clipped with Clip To Discourse`;
}

function buildTemplateData({
  title,
  url,
  excerpt,
  excerptPlain,
  fullText,
  fullTextPlain,
  selectionText,
  selectionMarkdown
}) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const datetime = now.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const safeUrl = url || "";
  const safeTitle = normalizeTitle(title) || fallbackTitle();
  const safeExcerpt = excerpt ? excerpt.trim() : "";
  const safeExcerptPlain = excerptPlain ? excerptPlain.trim() : "";
  const safeFullText = fullText ? fullText.trim() : "";
  const safeFullTextPlain = fullTextPlain ? fullTextPlain.trim() : "";
  const safeSelectionPlain = selectionText ? selectionText.trim() : "";
  const safeSelectionMarkdown = selectionMarkdown ? selectionMarkdown.trim() : "";

  return {
    title: safeTitle,
    url: safeUrl,
    date,
    datetime,
    excerpt: safeExcerpt,
    "excerpt-plain": safeExcerptPlain,
    "full-text": safeFullText,
    "full-text-markdown": formatCodeBlock(safeFullText),
    "full-text-plain": safeFullTextPlain,
    "text-selection": safeSelectionPlain,
    "text-selection-markdown": safeSelectionMarkdown || safeSelectionPlain
  };
}

function buildTitleTemplateData(title) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const datetime = now.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  return {
    title: normalizeTitle(title) || fallbackTitle(),
    date,
    datetime
  };
}

/**
 * Render a profile's title template with `{{title}}`, `{{date}}`, and
 * `{{datetime}}` tokens, then truncate to Discourse's title limit via
 * {@link truncateTitle}. Falls back to `"Clip: {{title}}"` if `template`
 * omits the required `{{title}}` token (e.g. an empty or misconfigured
 * profile setting).
 * @param {string} template - Profile's `titleTemplate` (see `DEFAULT_PROFILE` in `shared/settings.js`).
 * @param {unknown} title - Raw page title; normalized via {@link normalizeTitle}, falling back to {@link fallbackTitle} when empty.
 * @returns {string}
 */
export function applyTitleTemplate(template, title) {
  const safeTemplate = template && template.includes("{{title}}") ? template : "Clip: {{title}}";
  const result = applyTemplate(safeTemplate, buildTitleTemplateData(title));
  return truncateTitle(result);
}

/**
 * Build the Discourse post body markdown for the selected clip style,
 * using the matching per-style template (from `templates`, falling back to
 * {@link DEFAULT_CLIP_TEMPLATES} for any template left unset).
 * @param {object} options
 * @param {unknown} options.title - Raw page title; normalized via {@link normalizeTitle}, falling back to {@link fallbackTitle} when empty.
 * @param {string} [options.url] - Page URL.
 * @param {string} options.clipStyle - One of {@link CLIP_STYLES}.
 * @param {string} [options.excerpt] - Markdown excerpt, used for `EXCERPT` style.
 * @param {string} [options.excerptPlain] - Plain-text excerpt, exposed to templates as `{{excerpt-plain}}`.
 * @param {string} [options.fullText] - Full-page markdown, used for `FULL_TEXT` style.
 * @param {string} [options.fullTextPlain] - Plain-text full page, exposed to templates as `{{full-text-plain}}`.
 * @param {string} [options.selectionText] - Plain-text selection, exposed to templates as `{{text-selection}}`.
 * @param {string} [options.selectionMarkdown] - Markdown selection, used for `TEXT_SELECTION` style; falls back to `selectionText` when empty.
 * @param {{titleUrl?: string, excerpt?: string, fullText?: string, textSelection?: string}} [options.templates] - Profile templates keyed by clip style, matching {@link DEFAULT_CLIP_TEMPLATES}'s shape.
 * @returns {string} The rendered post body markdown for `clipStyle`.
 * @throws {Error} If `clipStyle` is not a recognized {@link CLIP_STYLES} value.
 */
export function buildMarkdown({
  title,
  url,
  clipStyle,
  excerpt,
  excerptPlain,
  fullText,
  fullTextPlain,
  selectionText,
  selectionMarkdown,
  templates = {}
}) {
  const data = buildTemplateData({
    title,
    url,
    excerpt,
    excerptPlain,
    fullText,
    fullTextPlain,
    selectionText,
    selectionMarkdown
  });

  if (clipStyle === CLIP_STYLES.TITLE_URL) {
    const template = templates.titleUrl || DEFAULT_CLIP_TEMPLATES.titleUrl;
    return applyTemplate(template, data);
  }

  if (clipStyle === CLIP_STYLES.EXCERPT) {
    const template = templates.excerpt || DEFAULT_CLIP_TEMPLATES.excerpt;
    return applyTemplate(template, data);
  }

  if (clipStyle === CLIP_STYLES.FULL_TEXT) {
    const template = templates.fullText || DEFAULT_CLIP_TEMPLATES.fullText;
    return applyTemplate(template, data);
  }

  if (clipStyle === CLIP_STYLES.TEXT_SELECTION) {
    const template = templates.textSelection || DEFAULT_CLIP_TEMPLATES.textSelection;
    return applyTemplate(template, data);
  }

  throw new Error("Unsupported clip style.");
}
