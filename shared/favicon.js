const CACHE_KEY = "faviconCache";
const ICON_SIZES = [16, 32];

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

async function loadImageFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

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

async function dataUrlToImageDataMap(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return blobToImageDataMap(blob);
}

function createFallbackImageDataMap() {
  const imageDataMap = {};
  ICON_SIZES.forEach((size) => {
    const canvas = createCanvas(size);
    const ctx = getCanvasContext(canvas);
    ctx.fillStyle = "#577188";
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

async function fetchFaviconBlob(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  const faviconUrl = `${normalized}/favicon.ico`;
  try {
    const response = await fetch(faviconUrl);
    if (response.ok && response.headers.get("content-type")?.startsWith("image")) {
      return await response.blob();
    }
  } catch (error) {
    // Ignore and try HTML parsing.
  }

  try {
    const response = await fetch(normalized);
    if (!response.ok) return null;
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const iconLink = doc.querySelector("link[rel~='icon']");
    if (!iconLink) return null;
    const href = iconLink.getAttribute("href");
    if (!href) return null;
    const iconUrl = new URL(href, normalized).toString();
    const iconResponse = await fetch(iconUrl);
    if (!iconResponse.ok) return null;
    return await iconResponse.blob();
  } catch (error) {
    return null;
  }
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read favicon data."));
    reader.readAsDataURL(blob);
  });
}

export async function updateActionIconForProfile(profile, useFavicon) {
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
    } catch (error) {
      // Ignore cache errors and refetch.
    }
  }

  const blob = await fetchFaviconBlob(profile.baseUrl);
  if (!blob) {
    await chrome.action.setIcon({ imageData: createFallbackImageDataMap() });
    return;
  }

  const imageData = await blobToImageDataMap(blob);
  await chrome.action.setIcon({ imageData });
  const dataUrl = await blobToDataUrl(blob);
  await setCachedDataUrl(profile.id, dataUrl);
}
