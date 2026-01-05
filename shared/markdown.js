// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { CLIP_STYLES } from "./constants.js";

export const DEFAULT_CLIP_TEMPLATES = {
  titleUrl: "### {{title}}\n{{url}}\n",
  excerpt: "### {{title}}\n{{url}}\n\n{{excerpt}}\n\n{{url}}",
  fullText: "### {{title}}\n{{url}}\n\n---\n\n{{full-text}}\n\n---\n\n{{url}}"
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

// Normalize title input from the page.
export function normalizeTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Generate a fallback title to keep posts unique and identifiable.
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

// Apply title template tokens ({{title}}, {{date}}, {{datetime}}).
export function applyTitleTemplate(template, title) {
  const safeTemplate = template && template.includes("{{title}}") ? template : "Clip: {{title}}";
  return applyTemplate(safeTemplate, buildTitleTemplateData(title));
}

// Build the Discourse post body based on the selected clip style.
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

  throw new Error("Unsupported clip style.");
}
