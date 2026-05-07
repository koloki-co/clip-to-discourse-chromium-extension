// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { AUTH_METHODS } from "./constants.js";

function buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId }) {
  const effectiveAuthMethod = authMethod || (userApiKey ? AUTH_METHODS.USER_API : AUTH_METHODS.ADMIN_API_KEY);

  if (effectiveAuthMethod === AUTH_METHODS.USER_API) {
    if (!userApiKey) {
      throw new Error("Missing User API key. Update settings first.");
    }
    const headers = {
      "User-Api-Key": userApiKey
    };
    if (userApiClientId) {
      headers["User-Api-Client-Id"] = userApiClientId;
    }
    return headers;
  }

  if (!apiKey) {
    throw new Error("Missing API key. Update settings first.");
  }
  if (!apiUsername) {
    throw new Error("Missing API username. Update settings first.");
  }

  return {
    "Api-Key": apiKey,
    "Api-Username": apiUsername
  };
}

async function extractErrorMessage(response) {
  let data = null;
  let rawText = "";

  try {
    data = await response.json();
  } catch (error) {
    try {
      rawText = await response.text();
    } catch (textError) {
      rawText = "";
    }
  }

  if (data && (data.errors || data.error)) {
    return (data.errors || data.error).toString();
  }

  return rawText || response.statusText;
}

// Create a new Discourse post (topic or reply) via the API.
export async function createPost({
  baseUrl,
  authMethod,
  apiUsername,
  apiKey,
  userApiKey,
  userApiClientId,
  payload
}) {
  const response = await fetch(`${baseUrl}/posts.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId })
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(`Discourse error: ${errorMessage}`);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  return data;
}

// Verify credentials by asking Discourse who we're authenticated as.
// /session/current.json works for both Admin API keys and User API keys
// and returns the resolved username, which we surface to the user.
export async function testConnection({
  baseUrl,
  authMethod,
  apiUsername,
  apiKey,
  userApiKey,
  userApiClientId
}) {
  const response = await fetch(`${baseUrl}/session/current.json`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId })
    }
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(`Discourse error: ${errorMessage}`);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  const username = data?.current_user?.username || data?.user?.username || "";
  return { data, username };
}

export async function checkUserApiVersion({ baseUrl }) {
  let response;
  try {
    response = await fetch(`${baseUrl}/user-api-key/new`, { method: "HEAD" });
  } catch (error) {
    throw new Error(`Could not reach ${baseUrl}: ${error.message}`);
  }

  if (response.status === 404) {
    throw new Error(
      "This Discourse instance does not support the User API key flow. Use an Admin API key instead."
    );
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(`Discourse error: ${errorMessage}`);
  }

  return response.headers.get("Auth-Api-Version") || response.headers.get("auth-api-version") || "";
}

export async function revokeUserApiKey({ baseUrl, userApiKey, userApiClientId }) {
  if (!userApiKey) {
    throw new Error("Missing User API key.");
  }

  const headers = {
    "Content-Type": "application/json",
    "User-Api-Key": userApiKey
  };

  if (userApiClientId) {
    headers["User-Api-Client-Id"] = userApiClientId;
  }

  const response = await fetch(`${baseUrl}/user-api-key/revoke`, {
    method: "POST",
    headers
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(`Discourse error: ${errorMessage}`);
  }
}
