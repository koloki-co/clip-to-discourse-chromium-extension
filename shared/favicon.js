// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { isProfileConnected } from "./settings.js";

const CACHE_KEY = "faviconCache";
const ICON_SIZES = [16, 32];

// Prefer OffscreenCanvas when available (service worker friendly).
function createCanvas(size) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(size, size);
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function getCanvasContext(canvas) {
  return canvas.getContext("2d");
}

// createImageBitmap decodes raster formats only. SVG blobs and non-image
// payloads (HTML error pages, login redirects) both reject with
// "The source image could not be decoded.", so screen them out up front.
function isDecodableImageType(contentType) {
  if (!contentType) {
    return false;
  }
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) {
    return false;
  }
  return type !== "image/svg+xml";
}

// A cross-origin response without CORS yields an opaque, zero-byte blob.
function isUsableImageBlob(blob) {
  return Boolean(blob) && blob.size > 0 && isDecodableImageType(blob.type);
}

// Decode an image blob into a bitmap for canvas drawing.
// Uses createImageBitmap (available in service workers and documents)
// instead of new Image() which is document-only.
async function loadImageFromBlob(blob) {
  return createImageBitmap(blob);
}

// Render the image blob into icon-sized ImageData objects.
async function blobToImageDataMap(blob) {
  const img = await loadImageFromBlob(blob);
  const imageDataMap = {};

  ICON_SIZES.forEach((size) => {
    const canvas = createCanvas(size);
    const ctx = getCanvasContext(canvas);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    imageDataMap[size] = ctx.getImageData(0, 0, size, size);
  });

  return imageDataMap;
}

// Fetch a data URL and convert it to ImageData for action icons.
async function dataUrlToImageDataMap(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return blobToImageDataMap(blob);
}

// Build a simple fallback icon when no favicon is available.
function createFallbackImageDataMap(isConnected = true) {
  const imageDataMap = {};
  ICON_SIZES.forEach((size) => {
    const canvas = createCanvas(size);
    const ctx = getCanvasContext(canvas);
    ctx.fillStyle = isConnected ? "#577188" : "#8c959f";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.floor(size * 0.7)}px Lato, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("C", size / 2, size / 2 + 1);
    imageDataMap[size] = ctx.getImageData(0, 0, size, size);
  });
  return imageDataMap;
}

// Cache favicon data URLs locally to avoid re-fetching.
async function getCachedDataUrl(profileId) {
  const data = await chrome.storage.local.get(CACHE_KEY);
  const cache = data[CACHE_KEY] || {};
  return cache[profileId];
}

async function setCachedDataUrl(profileId, dataUrl) {
  const data = await chrome.storage.local.get(CACHE_KEY);
  const cache = data[CACHE_KEY] || {};
  cache[profileId] = dataUrl;
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
}

// Attempt /favicon.ico first, then fall back to parsing the homepage.
// Uses a regex to find the icon link instead of DOMParser, which is not
// available in service workers.
async function fetchFaviconBlob(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  const faviconUrl = `${normalized}/favicon.ico`;
  try {
    const response = await fetch(faviconUrl);
    if (response.ok && isDecodableImageType(response.headers.get("content-type"))) {
      const blob = await response.blob();
      if (isUsableImageBlob(blob)) {
        return blob;
      }
    }
  } catch {
    // Ignore and try HTML parsing.
  }

  try {
    const response = await fetch(normalized);
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<link[^>]*rel=["'][^"']*\bicon\b[^"']*["'][^>]*>/i);
    if (!match) return null;
    const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return null;
    const href = hrefMatch[1];
    const iconUrl = new URL(href, normalized).toString();
    const iconResponse = await fetch(iconUrl);
    if (!iconResponse.ok) return null;
    if (!isDecodableImageType(iconResponse.headers.get("content-type"))) return null;
    const iconBlob = await iconResponse.blob();
    return isUsableImageBlob(iconBlob) ? iconBlob : null;
  } catch {
    return null;
  }
}

// Convert a blob into a data URL for caching.
// Uses arrayBuffer + btoa (both available in service workers) instead of
// FileReader (document-only).
async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const base64 = btoa(binary);
  const mimeType = blob.type || "image/png";
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Update the extension's toolbar icon and title to reflect a profile's
 * connection and favicon state: a grey fallback icon with a "connection
 * required" title when disconnected, a fetched-and-cached site favicon
 * when `useFavicon` is true and one loads successfully, otherwise the
 * default connected fallback icon. Favicon fetches are cached per profile
 * id in `chrome.storage.local`; a fetch or decode failure silently
 * degrades to the fallback icon rather than throwing.
 * @param {object} profile - A profile as returned by `getSettingsState` in `shared/settings.js`.
 * @param {boolean} useFavicon - Whether to attempt using the site's favicon (the `useFaviconForIcon` global setting).
 * @returns {Promise<void>}
 */
export async function updateActionIconForProfile(profile, useFavicon) {
  if (!isProfileConnected(profile)) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap(false) });
    await chrome.action.setTitle({ title: "Clip To Discourse - connection required" });
    return;
  }

  await chrome.action.setTitle({ title: "Clip To Discourse" });
  if (!useFavicon) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }

  if (!profile?.baseUrl) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }

  const cachedDataUrl = await getCachedDataUrl(profile.id);
  if (cachedDataUrl) {
    try {
      const imageData = await dataUrlToImageDataMap(cachedDataUrl);
      await chrome.action.setIcon({ imageData });
      return;
    } catch {
      // Ignore cache errors and refetch.
    }
  }

  const blob = await fetchFaviconBlob(profile.baseUrl);
  if (!blob) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }

  // A served content-type can still misdescribe the bytes, so a decode
  // failure here must degrade to the fallback icon rather than reject: this
  // runs on the popup's startup path and an unhandled rejection there leaves
  // the clip form disabled.
  let imageData;
  try {
    imageData = await blobToImageDataMap(blob);
  } catch {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }

  await chrome.action.setIcon({ imageData });
  const dataUrl = await blobToDataUrl(blob);
  await setCachedDataUrl(profile.id, dataUrl);
}
