// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

// Regenerates the Chrome Web Store API refresh token via Google's OAuth
// loopback-redirect flow (the same flow used by fregante/chrome-webstore-upload-keys),
// then writes the new token into the local chrome-web-store.env and syncs it
// to the `chrome-web-store` GitHub Actions environment secret. The only
// manual step is approving the consent screen Google opens in the browser.
//
// Refresh tokens expire after 7 days while the OAuth consent screen is in
// "Testing" publishing status. If this needs re-running every few weeks,
// move the consent screen to "In production" in Google Cloud Console first.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(rootDir, "chrome-web-store.env");
const OAUTH_SCOPE = "https://www.googleapis.com/auth/chromewebstore";
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

function parseEnvFile(filePath) {
  const env = {};
  readFileSync(filePath, "utf8").split("\n").forEach((line) => {
    const trimmed = line.trim();
    const eq = trimmed.indexOf("=");
    if (!trimmed || trimmed.startsWith("#") || eq === -1) {
      return;
    }
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  });
  return env;
}

function updateEnvToken(filePath, token) {
  const content = readFileSync(filePath, "utf8");
  if (!/^CHROME_REFRESH_TOKEN=.*$/m.test(content)) {
    throw new Error(`${filePath} has no CHROME_REFRESH_TOKEN= line to update.`);
  }
  writeFileSync(filePath, content.replace(/^CHROME_REFRESH_TOKEN=.*$/m, `CHROME_REFRESH_TOKEN=${token}`));
}

function openInBrowser(url) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(opener, [url], { stdio: "ignore", detached: true }).unref();
  } catch {
    // Best-effort only; the URL is also printed for the user to open manually.
  }
}

// Binds an ephemeral loopback port, then resolves with a promise for the
// `code` query param of the first request it receives (Google's redirect).
function startCallbackServer() {
  return new Promise((resolveServer) => {
    const server = createServer();
    const codePromise = new Promise((resolveCode, rejectCode) => {
      server.on("request", (req, res) => {
        const url = new URL(req.url, "http://127.0.0.1");
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(code
          ? "<p>Authorized. You can close this tab.</p>"
          : `<p>Authorization failed: ${error || "unknown error"}. You can close this tab.</p>`);
        server.close();

        if (code) {
          resolveCode(code);
        } else {
          rejectCode(new Error(`Google returned an authorization error: ${error || "unknown error"}`));
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      resolveServer({ port: server.address().port, codePromise, server });
    });
  });
}

async function waitForCode(codePromise, server) {
  let timeoutHandle;
  try {
    return await Promise.race([
      codePromise,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          server.close();
          reject(new Error("Timed out waiting for the browser authorization (5 minutes). Run the script again."));
        }, CALLBACK_TIMEOUT_MS);
      })
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${data.error_description || data.error || response.statusText}`);
  }
  if (!data.refresh_token) {
    throw new Error("Google did not return a refresh token. This shouldn't happen with prompt=consent; try again.");
  }
  return data;
}

function updateGitHubSecret(token) {
  execFileSync("gh", ["secret", "set", "CHROME_REFRESH_TOKEN", "--env", "chrome-web-store"], {
    input: token,
    stdio: ["pipe", "inherit", "inherit"],
    cwd: rootDir
  });
}

async function main() {
  if (!existsSync(envPath)) {
    throw new Error(`Missing ${envPath}. Create it with CHROME_CLIENT_ID and CHROME_CLIENT_SECRET first.`);
  }

  const env = parseEnvFile(envPath);
  const clientId = env.CHROME_CLIENT_ID;
  const clientSecret = env.CHROME_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(`${envPath} is missing CHROME_CLIENT_ID or CHROME_CLIENT_SECRET.`);
  }

  const { port, codePromise, server } = await startCallbackServer();
  const redirectUri = `http://127.0.0.1:${port}`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", OAUTH_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("Opening the Google consent screen. Approve access to continue:");
  console.log(`  ${authUrl.toString()}`);
  openInBrowser(authUrl.toString());

  const code = await waitForCode(codePromise, server);

  console.log("Authorization received, exchanging it for a refresh token...");
  const tokens = await exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri });

  updateEnvToken(envPath, tokens.refresh_token);
  console.log(`Updated ${envPath}.`);

  updateGitHubSecret(tokens.refresh_token);
  console.log("Updated the chrome-web-store GitHub Actions environment secret CHROME_REFRESH_TOKEN.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
