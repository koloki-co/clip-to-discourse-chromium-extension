// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { chromium, expect, test as base } from "@playwright/test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startFixtureSite, startMockDiscourse } from "./mock-discourse.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtimeEntries = [
  "manifest.json",
  "popup",
  "options",
  "shared",
  "assets",
  "background.bundle.js"
];

async function createTestExtension() {
  const extensionDir = await mkdtemp(path.join(tmpdir(), "clip-to-discourse-extension-"));
  try {
    for (const entry of runtimeEntries) {
      await cp(path.join(repoRoot, entry), path.join(extensionDir, entry), { recursive: true });
    }
    const manifestPath = path.join(extensionDir, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const optionalHosts = manifest.optional_host_permissions ?? [];
    if (manifest.host_permissions?.length || !optionalHosts.includes("http://*/*") || !optionalHosts.includes("https://*/*")) {
      throw new Error("Expected production host access to remain optional");
    }
    // Headless Chromium cannot accept extension host-access prompts. Pregrant only the mock API host.
    manifest.host_permissions = ["http://127.0.0.1/*"];
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return extensionDir;
  } catch (error) {
    await rm(extensionDir, { recursive: true, force: true });
    throw error;
  }
}

export const test = base.extend({
  // Playwright fixture functions require an object destructuring pattern.
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const userDataDir = await mkdtemp(path.join(tmpdir(), "clip-to-discourse-playwright-"));
    let context;
    let extensionDir;
    const unexpectedRequests = [];

    try {
      extensionDir = await createTestExtension();
      context = await chromium.launchPersistentContext(userDataDir, {
        channel: "chromium",
        headless: true,
        args: [
          `--disable-extensions-except=${extensionDir}`,
          `--load-extension=${extensionDir}`
        ]
      });
      await context.route(/^https?:\/\//, async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === "localhost" || url.hostname.startsWith("127.")) {
          await route.continue();
          return;
        }
        unexpectedRequests.push(url.href);
        await route.abort("blockedbyclient");
      });

      await use(context);
      if (unexpectedRequests.length > 0) {
        throw new Error(`Playwright blocked non-loopback requests:\n${unexpectedRequests.join("\n")}`);
      }
    } finally {
      try {
        await context?.close();
      } finally {
        await Promise.all([
          rm(userDataDir, { recursive: true, force: true }),
          extensionDir ? rm(extensionDir, { recursive: true, force: true }) : Promise.resolve()
        ]);
      }
    }
  },

  extension: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ||= await context.waitForEvent("serviceworker");
    const extensionId = new URL(serviceWorker.url()).host;
    const browserSession = await context.browser().newBrowserCDPSession();

    try {
      await serviceWorker.evaluate(async () => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const { profiles } = await chrome.storage.local.get("profiles");
          if (Array.isArray(profiles) && profiles.length > 0) {
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        throw new Error("Extension settings did not initialize in time");
      });

      await use({
        extensionId,
        serviceWorker,
        optionsUrl: `chrome-extension://${extensionId}/options/options.html`,
        popupUrl: `chrome-extension://${extensionId}/popup/popup.html`,
        async setStorage(state) {
          await serviceWorker.evaluate(async (nextState) => {
            const { allowHttp, theme, useFaviconForIcon, ...localState } = nextState;
            await chrome.storage.local.set(localState);
            const globalState = {};
            if (typeof useFaviconForIcon === "boolean") {
              globalState.useFaviconForIcon = useFaviconForIcon;
            }
            if (typeof allowHttp === "boolean") {
              globalState.allowHttp = allowHttp;
            }
            if (typeof theme === "string") {
              globalState.theme = theme;
            }
            if (Object.keys(globalState).length > 0) {
              await chrome.storage.sync.set(globalState);
            }
          }, state);
        },
        async getStorage() {
          return serviceWorker.evaluate(async () => {
            const local = await chrome.storage.local.get(null);
            const sync = await chrome.storage.sync.get(null);
            return { ...local, ...sync };
          });
        },
        async hasHostPermission(baseUrl) {
          const origin = `${new URL(baseUrl).origin}/*`;
          return serviceWorker.evaluate(
            (permissionOrigin) => chrome.permissions.contains({ origins: [permissionOrigin] }),
            origin
          );
        },
        async getActionTitle() {
          return serviceWorker.evaluate(() => chrome.action.getTitle({}));
        },
        async canReadActiveTab() {
          return serviceWorker.evaluate(async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              return false;
            }
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.title
              });
              return true;
            } catch {
              return false;
            }
          });
        },
        async triggerAction(page) {
          const popup = await context.newPage();
          await page.bringToFront();
          const { targetInfos } = await browserSession.send("Target.getTargets", {
            filter: [
              { type: "tab", exclude: false },
              { exclude: true }
            ]
          });
          const tabTarget = targetInfos.find((target) => target.url === page.url());
          if (!tabTarget) {
            throw new Error(`Could not find Chromium tab target for ${page.url()}`);
          }
          await browserSession.send("Extensions.triggerAction", {
            id: extensionId,
            targetId: tabTarget.targetId
          });
          const actionPopupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
          await expect.poll(async () => {
            const { targetInfos: actionTargets } = await browserSession.send("Target.getTargets");
            return actionTargets.some((target) => target.url === actionPopupUrl);
          }, { message: "Expected the extension action to open its configured popup" }).toBe(true);
          await popup.goto(actionPopupUrl);
          return popup;
        }
      });
    } finally {
      await browserSession.detach();
    }
  },

  // eslint-disable-next-line no-empty-pattern
  mockDiscourse: async ({}, use) => {
    const [server, alternate] = await Promise.all([startMockDiscourse(), startMockDiscourse()]);
    try {
      await use({ ...server, alternate });
    } finally {
      await Promise.all([server.close(), alternate.close()]);
    }
  },

  // eslint-disable-next-line no-empty-pattern
  fixtureSite: async ({}, use) => {
    const server = await startFixtureSite();
    try {
      await use(server);
    } finally {
      await server.close();
    }
  }
});

export { expect };

export function connectedAdminProfile({
  id = "profile-a",
  name = "Forum A",
  baseUrl,
  apiUsername = "e2e-user-a",
  apiKey = "e2e-not-a-secret-a",
  overrides = {}
}) {
  return {
    id,
    name,
    baseUrl,
    authMethod: "admin_api_key",
    apiUsername,
    apiKey,
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
    textSelectionTemplate: "",
    ...overrides
  };
}
