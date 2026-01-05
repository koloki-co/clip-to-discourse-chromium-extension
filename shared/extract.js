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

function collapseWhitespace(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeLinkText(text) {
  return text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function escapeCode(text) {
  return text.replace(/`/g, "\\`");
}

function isBlockTag(tag) {
  return [
    "p",
    "div",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "aside",
    "nav",
    "blockquote",
    "pre",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th"
  ].includes(tag);
}

function mergeParagraphs(value) {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function nodeToMarkdown(node, listDepth = 0) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue || "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const tag = node.tagName.toLowerCase();

  if (tag === "br") {
    return "  \n";
  }

  if (tag === "strong" || tag === "b") {
    return `**${renderChildren(node, listDepth)}**`;
  }

  if (tag === "em" || tag === "i") {
    return `*${renderChildren(node, listDepth)}*`;
  }

  if (tag === "code") {
    return `\`${escapeCode(node.textContent || "")}\``;
  }

  if (tag === "pre") {
    const text = node.textContent || "";
    return `\n\`\`\`\n${text.trim()}\n\`\`\`\n`;
  }

  if (tag === "a") {
    const href = node.getAttribute("href") || "";
    const text = renderChildren(node, listDepth) || href;
    if (!href) {
      return text;
    }
    return `[${escapeLinkText(text)}](${href})`;
  }

  if (tag === "img") {
    const alt = node.getAttribute("alt") || "";
    const src = node.getAttribute("src") || "";
    if (!src) {
      return "";
    }
    return `![${escapeLinkText(alt)}](${src})`;
  }

  if (tag.startsWith("h") && tag.length === 2) {
    const level = Number(tag[1]);
    if (Number.isInteger(level) && level >= 1 && level <= 6) {
      return `\n${"#".repeat(level)} ${collapseWhitespace(renderChildren(node, listDepth))}\n\n`;
    }
  }

  if (tag === "blockquote") {
    const content = mergeParagraphs(renderChildren(node, listDepth));
    if (!content) return "";
    return `\n${content.split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
  }

  if (tag === "ul" || tag === "ol") {
    const items = Array.from(node.children)
      .filter((child) => child.tagName && child.tagName.toLowerCase() === "li")
      .map((child, index) => {
        const prefix = tag === "ol" ? `${index + 1}.` : "-";
        const content = mergeParagraphs(renderChildren(child, listDepth + 1));
        const indent = "  ".repeat(listDepth);
        return `${indent}${prefix} ${content}`;
      })
      .join("\n");
    return `\n${items}\n\n`;
  }

  if (tag === "li") {
    return renderChildren(node, listDepth);
  }

  if (tag === "hr") {
    return "\n---\n";
  }

  const content = renderChildren(node, listDepth);
  if (isBlockTag(tag)) {
    return `\n${content}\n`;
  }
  return content;
}

function renderChildren(node, listDepth) {
  let output = "";
  node.childNodes.forEach((child) => {
    output += nodeToMarkdown(child, listDepth);
  });
  return output;
}

export function htmlToMarkdown(html) {
  if (!html) {
    return "";
  }
  if (typeof DOMParser === "undefined") {
    return collapseWhitespace(html.replace(/<[^>]+>/g, " "));
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
  const body = doc.body;
  if (!body) {
    return "";
  }
  const markdown = renderChildren(body, 0);
  return collapseWhitespace(markdown);
}

// Trim to a max length without splitting into multiple paragraphs.
export function buildExcerpt(text, maxLength = DEFAULT_EXCERPT_LENGTH) {
  const normalized = collapseWhitespace(text || "");
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength).trim();
}
