// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { chromium } from "@playwright/test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { readFileSync } from "node:fs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archivePath = path.join(repoRoot, "clip-to-discourse-extension.zip");
const screenshotsDir = path.join(repoRoot, "assets", "images");
const fixturePort = 3999;

async function createExtension() {
  const dir = await mkdtemp(path.join(tmpdir(), "clip-to-discourse-screenshots-"));
  try {
    try {
      await readFile(archivePath);
    } catch {
      await execFileAsync("npm", ["run", "package"], { cwd: repoRoot });
    }
    await execFileAsync("unzip", ["-q", "-o", archivePath, "-d", dir]);
    const manifestPath = path.join(dir, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.host_permissions = ["http://127.0.0.1/*"];
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return dir;
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

async function startMockDiscourse() {
  const favicon = readFileSync(path.join(repoRoot, "assets", "images", "clip-to-discourse-logo.png"));
  const server = http.createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Api-Key, Api-Username, Content-Type, User-Api-Key, User-Api-Client-Id");
    response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    const url = new URL(request.url, "http://127.0.0.1");

    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    if (request.method === "GET" && url.pathname === "/favicon.ico") {
      response.setHeader("Content-Type", "image/png");
      response.end(favicon);
      return;
    }
    response.setHeader("Content-Type", "application/json");
    if (request.method === "GET" && url.pathname === "/site.json") {
      response.end(JSON.stringify({
        categories: [
          { id: 1, name: "Community" },
          { id: 2, name: "Support", parent_category_id: 1 },
          { id: 3, name: "Announcements" },
          { id: 4, name: "Devlog" }
        ]
      }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/session/current.json") {
      response.end(JSON.stringify({ current_user: { username: "demo-user" } }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/posts.json") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      response.end(JSON.stringify({ id: 9001, topic_id: body?.topic_id || 9001, topic_slug: "screenshot-topic" }));
      return;
    }
    response.writeHead(404).end(JSON.stringify({ errors: ["Not found"] }));
  });

  await new Promise((resolve) => server.listen(fixturePort, "127.0.0.1", resolve));
  return {
    baseUrl: `http://127.0.0.1:${fixturePort}`,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

async function startFixtureSite() {
  const server = http.createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
<html lang="en">
<head><title>Understanding Distributed Systems - A Practical Guide</title></head>
<body>
<article>
<h1>Understanding Distributed Systems - A Practical Guide</h1>
<p>Published by Demo Author on July 28, 2026</p>
<p id="selection-source">Distributed systems are collections of independent computers that appear to their users as a single coherent system. The key challenges include coordination, consistency, and fault tolerance.</p>
<p>When designing a distributed system, you must consider the trade-offs between consistency, availability, and partition tolerance - the so-called CAP theorem. In practice, most systems choose either strong consistency or high availability, depending on the workload requirements.</p>
<p>Consensus protocols like Raft and Paxos provide the foundation for strongly consistent systems, while eventually consistent systems rely on techniques like conflict-free replicated data types (CRDTs) and read-repair to converge over time.</p>
<p>The future of distributed systems lies in better developer ergonomics, simpler deployment models, and tools that make it easier to reason about system behaviour under partial failure.</p>
</article>
</body>
</html>`);
  });

  await new Promise((resolve) => server.listen(fixturePort + 1, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${fixturePort + 1}/article`,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

async function configureProfile(context, mockDiscourse) {
  const [serviceWorker] = context.serviceWorkers();
  const sw = serviceWorker || await context.waitForEvent("serviceworker");
  await sw.evaluate(async (baseUrl) => {
    await chrome.storage.local.set({
      profiles: [{
        id: "screenshot-profile",
        name: "Demo Forum",
        baseUrl,
        authMethod: "admin_api_key",
        apiUsername: "demo-user",
        apiKey: "demo-key-for-screenshots",
        userApiKey: "",
        userApiClientId: "",
        defaultClipStyle: "title_url",
        defaultDestination: "new_topic",
        defaultCategoryId: "1",
        defaultTopicId: "",
        titleTemplate: "Clip: {{title}}",
        titleUrlTemplate: "",
        excerptTemplate: "",
        fullTextTemplate: "",
        textSelectionTemplate: ""
      }],
      activeProfileId: "screenshot-profile"
    });
    await chrome.storage.sync.set({ allowHttp: true, useFaviconForIcon: false, theme: "system" });
  }, mockDiscourse.baseUrl);

  await sw.evaluate(async (baseUrl) => {
    const origin = `${new URL(baseUrl).origin}/*`;
    await chrome.permissions.request({ origins: [origin] });
  }, mockDiscourse.baseUrl).catch(() => {
    // Headless Chrome may reject the request; pre-grant via manifest host_permissions instead.
  });
}

async function main() {
  const extensionDir = await createExtension();
  const userDataDir = await mkdtemp(path.join(tmpdir(), "clip-to-discourse-screenshot-profile-"));
  const mockDiscourse = await startMockDiscourse();
  const fixtureSite = await startFixtureSite();

  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${extensionDir}`,
        `--load-extension=${extensionDir}`
      ]
    });

    await configureProfile(context, mockDiscourse);
    const [serviceWorker] = context.serviceWorkers();
    const extensionId = new URL(serviceWorker.url()).host;

    // Screenshot 1: Popup with clip form on a fixture article page
    const fixturePage = await context.newPage();
    await fixturePage.goto(fixtureSite.url);
    await fixturePage.bringToFront();

    // Select some text so the selection indicator shows
    await fixturePage.locator("#selection-source").evaluate((element) => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    });

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popup.bringToFront();
    await popup.waitForTimeout(500);

    // Resize the popup viewport to match typical extension popup dimensions
    await popup.setViewportSize({ width: 380, height: 600 });
    await popup.waitForTimeout(300);
    await popup.screenshot({
      path: path.join(screenshotsDir, "popup-screenshot.png"),
      type: "png"
    });
    console.log("Saved popup-screenshot.png");

    // Screenshot 2: Options/Settings page
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options/options.html`);
    await optionsPage.bringToFront();
    await optionsPage.setViewportSize({ width: 1280, height: 800 });
    await optionsPage.waitForTimeout(500);

    // Click on the category dropdown to show loaded categories
    await optionsPage.getByRole("combobox", { name: /Default Category/ }).click();
    await optionsPage.waitForTimeout(300);
    // Close the dropdown for a cleaner screenshot
    await optionsPage.keyboard.press("Escape");

    await optionsPage.screenshot({
      path: path.join(screenshotsDir, "settings-screenshot.png"),
      type: "png"
    });
    console.log("Saved settings-screenshot.png");

    // Screenshot 3: Popup with selection detected
    await popup.reload();
    await popup.waitForTimeout(500);
    await popup.screenshot({
      path: path.join(screenshotsDir, "popup-selection-screenshot.png"),
      type: "png"
    });
    console.log("Saved popup-selection-screenshot.png");

  } finally {
    try { await context?.close(); } catch {}
    await mockDiscourse.close();
    await fixtureSite.close();
    await rm(extensionDir, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});