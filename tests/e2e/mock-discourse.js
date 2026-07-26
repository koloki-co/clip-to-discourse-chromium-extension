// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import http from "node:http";
import { readFileSync } from "node:fs";

const longFixtureText = "Full-page fixture content gives Readability enough prose to retain the article body. ".repeat(12);
const favicon = readFileSync(new URL("../../assets/images/clip-to-discourse-logo.png", import.meta.url));

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function listen(server, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.closeAllConnections?.();
    server.close((error) => error ? reject(error) : resolve());
  });
}

export async function startMockDiscourse() {
  const requests = [];
  let connectionResponse = {
    status: 200,
    body: { current_user: { username: "e2e-user" } }
  };
  const server = http.createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Api-Key, Api-Username, Content-Type, User-Api-Key, User-Api-Client-Id");
    response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");

    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url, "http://127.0.0.1");
    const body = await readJson(request);
    requests.push({
      method: request.method,
      path: url.pathname,
      headers: request.headers,
      body
    });

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
          { id: 3, name: "Announcements" }
        ]
      }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/session/current.json") {
      response.writeHead(connectionResponse.status).end(JSON.stringify(connectionResponse.body));
      return;
    }
    if (request.method === "POST" && url.pathname === "/posts.json") {
      response.end(JSON.stringify({
        id: 9001,
        topic_id: body?.topic_id || 9001,
        topic_slug: "playwright-topic"
      }));
      return;
    }
    if (request.method === "HEAD" && url.pathname === "/user-api-key/new") {
      response.setHeader("Auth-Api-Version", "4");
      response.setHeader("Auth-Api-Device-Code", "true");
      response.end();
      return;
    }

    response.writeHead(404).end(JSON.stringify({ errors: ["Not found"] }));
  });

  await listen(server);
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    resetRequests() {
      requests.length = 0;
    },
    setConnectionResponse(status, body) {
      connectionResponse = { status, body };
    },
    async close() {
      await close(server);
    }
  };
}

export async function startFixtureSite() {
  const server = http.createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <html lang="en">
        <head><title>Playwright Fixture Article</title></head>
        <body>
          <article>
            <h1>Playwright Fixture Article</h1>
            <p id="selection-source">Important <strong>selected text</strong> for clipping.</p>
            <p>${longFixtureText}</p>
          </article>
        </body>
      </html>`);
  });
  await listen(server, "127.0.0.2");
  const address = server.address();
  return {
    url: `http://127.0.0.2:${address.port}/article`,
    async close() {
      await close(server);
    }
  };
}
