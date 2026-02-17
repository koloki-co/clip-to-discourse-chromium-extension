// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

// Text processing helpers for excerpt and full-text clipping.
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import ReadabilityModule from "@mozilla/readability";
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

const Readability = ReadabilityModule.Readability || ReadabilityModule;

const DEFAULT_FULL_TEXT_OPTIONS = {
  includeImages: true,
  includeLinks: true,
  includeTables: true,
  aggressiveCleanup: true,
  charThreshold: 500
};

function createTurndownService() {
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full"
  });

  turndown.use(gfm);

  turndown.addRule("codeBlocks", {
    filter: (node) => node.nodeName === "PRE" && node.querySelector?.("code"),
    replacement: (_content, node) => {
      const code = node.querySelector("code");
      if (!code) return "";
      const className = code.className || "";
      const langMatch = className.match(/language-(\w+)|lang-(\w+)/);
      const language = langMatch?.[1] || langMatch?.[2] || "";
      const codeContent = code.textContent || "";
      return `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;
    }
  });

  turndown.addRule("images", {
    filter: "img",
    replacement: (_content, node) => {
      const alt = node.getAttribute("alt") || "Image";
      const src = node.getAttribute("src") || node.getAttribute("data-src") || "";
      const title = node.getAttribute("title") || "";
      if (!src) return "";
      if (title) {
        return `![${alt}](${src} "${title}")`;
      }
      return `![${alt}](${src})`;
    }
  });

  turndown.addRule("blockquotes", {
    filter: "blockquote",
    replacement: (_content, node) => {
      const text = node.textContent || "";
      const lines = text.trim().split("\n");
      return `\n${lines.map((line) => `> ${line}`).join("\n")}\n`;
    }
  });

  turndown.addRule("removeEmpty", {
    filter: (node) => {
      return (
        ["P", "DIV", "SPAN"].includes(node.nodeName) &&
        (!node.textContent || node.textContent.trim() === "")
      );
    },
    replacement: () => ""
  });

  return turndown;
}

function postProcessMarkdown(markdown) {
  let output = markdown;

  output = output.replace(/\n{3,}/g, "\n\n");
  output = output.replace(/^(-|\d+\.)\s+(.+?)(\n\n)(-|\d+\.)/gm, "$1 $2\n$4");
  output = output.replace(/([^\n])\n```/g, "$1\n\n```");
  output = output.replace(/```\n([^`\n])/g, "```\n\n$1");
  output = output.replace(/([^\n-])\n(#{1,6}\s)/g, "$1\n\n$2");

  const lines = output.split("\n");
  let frontmatterCount = 0;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      frontmatterCount += 1;
      if (frontmatterCount <= 2) {
        continue;
      }
    }

    if (
      frontmatterCount >= 2 &&
      lines[i].trim() === "---" &&
      i > 0 &&
      i < lines.length - 1
    ) {
      if (lines[i - 1].trim() !== "" && !lines[i - 1].startsWith("#")) {
        lines.splice(i, 0, "");
        i += 1;
      }
      if (lines[i + 1].trim() !== "" && !lines[i + 1].startsWith("#")) {
        lines.splice(i + 1, 0, "");
        i += 1;
      }
    }
  }

  output = lines.join("\n");
  output = output.replace(/[^\S\n]+$/gm, "");
  return `${output.trim()}\n`;
}

function parseHtmlDocument(html, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  if (baseUrl) {
    let base = doc.querySelector("base");
    if (!base) {
      base = doc.createElement("base");
      const head = doc.head || doc.getElementsByTagName("head")[0];
      if (head) {
        head.prepend(base);
      } else {
        doc.documentElement.prepend(base);
      }
    }
    base.setAttribute("href", baseUrl);
  }
  return doc;
}

function removeNoiseElements(doc) {
  const roleSelectors = [
    "[role='navigation']",
    "[role='banner']",
    "[role='complementary']",
    "[role='contentinfo']",
    "[role='search']"
  ];

  const noiseSelectors = [
    "nav",
    "nav[role='navigation']",
    "nav.navbar",
    "nav.nav-menu",
    "div.navbar",
    "div[role='navigation']",
    "#navigation",
    "#nav",
    "#menu",
    "header[role='banner']",
    "footer[role='contentinfo']",
    "#header",
    "#footer",
    "div.site-header",
    "div.site-footer",
    "div.page-header",
    "div.page-footer",
    "aside",
    "div.sidebar",
    "div[role='complementary']",
    "#sidebar",
    ".ad",
    ".ads",
    ".advertisement",
    ".advert",
    "[id*='ad-']",
    "[class*='advertisement']",
    "[class*='-ad-']",
    "[class*='google-ad']",
    ".social",
    ".social-share",
    ".share-buttons",
    ".social-media",
    ".comments",
    "#comments",
    ".comment-section",
    ".related",
    ".recommendations",
    ".suggested",
    ".modal",
    ".popup",
    ".overlay",
    "[role='dialog']",
    ".cookie-notice",
    ".cookie-banner",
    "#cookie-consent",
    ".newsletter",
    ".subscribe",
    ".signup-form"
  ];

  doc.querySelectorAll([...roleSelectors, ...noiseSelectors].join(",")).forEach((node) => {
    node.remove();
  });

  doc.querySelectorAll("*").forEach((node) => {
    const text = (node.textContent || "").toLowerCase().trim();
    if (text.length > 200) {
      return;
    }
    if (
      text.includes("cookie policy") ||
      text.includes("accept cookies") ||
      text.includes("sign up for") ||
      text.includes("newsletter") ||
      text.includes("follow us")
    ) {
      node.remove();
    }
  });
}

function resolveRelativeUrls(doc, baseUrl) {
  if (!baseUrl) {
    return;
  }
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    return;
  }

  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("http") && !src.startsWith("data:")) {
      try {
        img.setAttribute("src", new URL(src, base).href);
      } catch {
        // Ignore invalid URLs.
      }
    }
  });

  doc.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");
    if (
      href &&
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !href.startsWith("mailto:")
    ) {
      try {
        link.setAttribute("href", new URL(href, base).href);
      } catch {
        // Ignore invalid URLs.
      }
    }
  });
}

function cleanAttributes(doc) {
  const keepAttributes = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "align"]);
  doc.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name;
      if (keepAttributes.has(name)) {
        return;
      }
      const tagName = node.tagName.toLowerCase();
      if (
        name.startsWith("data-") &&
        ["pre", "code", "div", "figure"].includes(tagName)
      ) {
        return;
      }
      node.removeAttribute(name);
    });
  });
}

function removeEmptyElements(doc) {
  const importantTags = new Set(["img", "br", "hr", "input", "iframe"]);
  const contentTags = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "table",
    "blockquote",
    "pre",
    "code"
  ]);

  doc.querySelectorAll("*").forEach((node) => {
    const tagName = node.tagName.toLowerCase();
    if (importantTags.has(tagName)) {
      return;
    }

    const text = (node.textContent || "").trim();
    const hasImportantChildren = node.querySelectorAll("img, iframe").length > 0;
    const hasContentTags =
      node.querySelectorAll("p, h1, h2, h3, h4, h5, h6, ul, ol, table, blockquote, pre")
        .length > 0;

    if (contentTags.has(tagName)) {
      if (text.length === 0 && !hasImportantChildren) {
        node.remove();
        return;
      }
      const meaningfulText = text.replace(/[\s|_.:;-]+/g, "");
      if (meaningfulText.length === 0 && !hasImportantChildren) {
        node.remove();
      }
      return;
    }

    if (!text && !hasImportantChildren && !hasContentTags) {
      node.remove();
    }
  });
}

function cleanHtmlDocument(doc, { aggressiveCleanup, baseUrl }) {
  doc.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
  if (aggressiveCleanup) {
    removeNoiseElements(doc);
  }
  const iterator = doc.createNodeIterator(doc, NodeFilter.SHOW_COMMENT);
  let comment;
  while ((comment = iterator.nextNode())) {
    comment.parentNode?.removeChild(comment);
  }
  resolveRelativeUrls(doc, baseUrl);
  cleanAttributes(doc);
  removeEmptyElements(doc);
}

function normalizeHeadings(doc) {
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => {
    const level = Number(el.tagName[1]);
    return { level, el };
  });

  let lastLevel = 0;
  headings.forEach(({ level, el }) => {
    if (level > lastLevel + 1) {
      const newLevel = lastLevel + 1;
      const replacement = doc.createElement(`h${newLevel}`);
      replacement.innerHTML = el.innerHTML;
      el.replaceWith(replacement);
      lastLevel = newLevel;
    } else {
      lastLevel = level;
    }
  });
}

function unwrapRedundantElements(doc) {
  doc.querySelectorAll("div > div:only-child, span > span:only-child").forEach((el) => {
    el.replaceWith(...el.childNodes);
  });

  doc.querySelectorAll("p").forEach((el) => {
    if (el.children.length === 1) {
      const tagName = el.children[0].tagName.toLowerCase();
      if (["div", "blockquote", "pre", "ul", "ol", "table"].includes(tagName)) {
        el.replaceWith(...el.childNodes);
      }
    }
  });
}

function convertPseudoHeadings(doc) {
  doc.querySelectorAll("div, span").forEach((el) => {
    if (el.children.length > 0) {
      return;
    }
    const text = (el.textContent || "").trim();
    if (!text || text.length >= 100) {
      return;
    }
    const className = (el.getAttribute("class") || "").toLowerCase();
    const style = el.getAttribute("style") || "";
    if (
      className.includes("title") ||
      className.includes("heading") ||
      style.includes("font-weight: bold") ||
      style.includes("font-weight:bold")
    ) {
      const heading = doc.createElement("h3");
      heading.textContent = text;
      el.replaceWith(heading);
    }
  });
}

function enhanceStructure(doc) {
  normalizeHeadings(doc);
  unwrapRedundantElements(doc);
  convertPseudoHeadings(doc);
}

function normalizeCodeBlocks(doc) {
  const codeDataAttributes = [
    "data-snippet-clipboard-copy-content",
    "data-code-content",
    "data-clipboard-text",
    "data-source"
  ];

  codeDataAttributes.forEach((attr) => {
    doc.querySelectorAll(`div[${attr}], figure[${attr}]`).forEach((container) => {
      const pre = container.querySelector("pre");
      if (!pre) return;
      const cleanCode = container.getAttribute(attr);
      if (!cleanCode) return;
      const code = doc.createElement("code");
      code.textContent = cleanCode;
      pre.innerHTML = "";
      pre.appendChild(code);
    });
  });

  doc.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector("code")) {
      return;
    }
    const codeContent = pre.textContent || "";
    if (!codeContent.trim()) {
      return;
    }
    const code = doc.createElement("code");
    code.textContent = codeContent;
    pre.innerHTML = "";
    pre.appendChild(code);
  });
}

function filterContent(doc, { includeImages, includeLinks, includeTables }) {
  if (!includeImages) {
    doc.querySelectorAll("img, picture, figure").forEach((node) => node.remove());
  }

  if (!includeLinks) {
    doc.querySelectorAll("a").forEach((node) => {
      const text = doc.createTextNode(node.textContent || "");
      node.replaceWith(text);
    });
  }

  if (!includeTables) {
    doc.querySelectorAll("table").forEach((node) => node.remove());
  }
}

function extractWithReadability(html, baseUrl, charThreshold) {
  const doc = parseHtmlDocument(html, baseUrl);
  const reader = new Readability(doc, { charThreshold });
  return reader.parse();
}

export function htmlToMarkdownFullPage(html, options = {}) {
  if (!html) {
    return "";
  }
  if (typeof DOMParser === "undefined") {
    return collapseWhitespace(html.replace(/<[^>]+>/g, " "));
  }

  const config = { ...DEFAULT_FULL_TEXT_OPTIONS, ...options };
  const article = extractWithReadability(html, config.baseUrl, config.charThreshold);
  const contentHtml = article?.content || html;

  const contentDoc = parseHtmlDocument(contentHtml, config.baseUrl);
  cleanHtmlDocument(contentDoc, config);
  enhanceStructure(contentDoc);
  normalizeCodeBlocks(contentDoc);
  filterContent(contentDoc, config);

  const turndown = createTurndownService();
  const markdown = turndown.turndown(contentDoc.body || contentDoc.documentElement);
  return postProcessMarkdown(markdown);
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
