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
  } catch {
    try {
      rawText = await response.text();
    } catch {
      rawText = "";
    }
  }

  if (data && (data.errors || data.error)) {
    return (data.errors || data.error).toString();
  }

  return rawText || response.statusText;
}

function actionableDiscourseError(response, detail, context) {
  const normalized = detail.toLowerCase();
  let guidance;

  if (normalized.includes("scope") || normalized.includes("not permitted")) {
    guidance = "The available User API scopes are insufficient. Ask the site administrator to enable both read and write in 'allow user API key scopes', then authorize again.";
  } else if (normalized.includes("unable to issue user api keys") || normalized.includes("trust level") || normalized.includes("allowed group")) {
    guidance = "This account is not allowed to create User API keys. Ask the site administrator to enable User API keys and include your group in 'user API key allowed groups'.";
  } else if (normalized.includes("redirect")) {
    guidance = "The site rejected the authorization callback. Current sites should use device authorization; on older sites an administrator must allow the redirect URL shown in Authorization details.";
  } else if (normalized.includes("expired") || response.status === 410) {
    guidance = "The authorization or credential has expired. Start authorization again.";
  } else if (response.status === 401) {
    guidance = "Discourse rejected the stored credential. It may have been revoked or expired; authorize this profile again.";
  } else if (response.status === 403) {
    guidance = context === "posting"
      ? "Discourse accepted the credential but refused this action. Check that the account can post to the selected category or topic and that write scope is enabled."
      : "Discourse refused this authorization request. Check User API scopes, allowed groups, and the account's site permissions.";
  } else if (response.status === 404) {
    guidance = "The expected Discourse API endpoint was not found. Check the Base URL and confirm the site is a supported, current Discourse installation.";
  } else if (response.status === 429) {
    guidance = "Discourse is rate-limiting requests. Wait a few minutes before trying again.";
  } else if (response.status >= 500) {
    guidance = "The Discourse site encountered a server error. Retry later or ask the site administrator to inspect the server logs.";
  } else {
    guidance = "Discourse rejected the request. Check the Base URL, authentication method, account permissions, and selected destination.";
  }

  return `${guidance} Server response: ${detail || `HTTP ${response.status}`}`;
}

/**
 * Create a new Discourse post (topic or reply) via `POST /posts.json`.
 * @param {object} options
 * @param {string} options.baseUrl - Discourse site base URL, no trailing slash.
 * @param {string} [options.authMethod] - One of {@link AUTH_METHODS}; inferred from `userApiKey` when omitted.
 * @param {string} [options.apiUsername] - Required for `ADMIN_API_KEY` auth.
 * @param {string} [options.apiKey] - Required for `ADMIN_API_KEY` auth.
 * @param {string} [options.userApiKey] - Required for `USER_API` auth.
 * @param {string} [options.userApiClientId] - Optional client id sent alongside a User API key.
 * @param {object} options.payload - Body shaped by {@link buildPayload} from `shared/payload.js`.
 * @returns {Promise<object>} The parsed JSON response, or `{}` if the 2xx response has no JSON body.
 * @throws {Error} With actionable guidance if credentials are missing or Discourse returns a non-2xx response.
 */
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
    throw new Error(actionableDiscourseError(response, errorMessage, "posting"));
  }

  // A 2xx response means the post was created even if the body is not JSON;
  // returning an empty object keeps callers from treating success as failure.
  try {
    return (await response.json()) ?? {};
  } catch {
    return {};
  }
}

/**
 * Verify credentials by asking Discourse who we're authenticated as, via
 * `GET /session/current.json` (works for both Admin API keys and User API
 * keys).
 * @param {object} options
 * @param {string} options.baseUrl - Discourse site base URL, no trailing slash.
 * @param {string} [options.authMethod] - One of {@link AUTH_METHODS}; inferred from `userApiKey` when omitted.
 * @param {string} [options.apiUsername] - Required for `ADMIN_API_KEY` auth.
 * @param {string} [options.apiKey] - Required for `ADMIN_API_KEY` auth.
 * @param {string} [options.userApiKey] - Required for `USER_API` auth.
 * @param {string} [options.userApiClientId] - Optional client id sent alongside a User API key.
 * @returns {Promise<{data: object|null, username: string}>} The raw JSON response and the resolved username (empty string if not resolvable).
 * @throws {Error} With actionable guidance if credentials are missing or Discourse returns a non-2xx response.
 */
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
    throw new Error(actionableDiscourseError(response, errorMessage, "connection test"));
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  const username = data?.current_user?.username || data?.user?.username || "";
  return { data, username };
}

/**
 * List categories available on a Discourse site via `GET /site.json`.
 * Sub-categories are returned flat with their name prefixed by the parent
 * category's name (e.g. `"Parent / Child"`), sorted alphabetically by that
 * combined name.
 * @param {object} options
 * @param {string} options.baseUrl - Discourse site base URL, no trailing slash.
 * @param {string} [options.authMethod] - One of {@link AUTH_METHODS}; inferred from `userApiKey` when omitted.
 * @param {string} [options.apiUsername] - Required for `ADMIN_API_KEY` auth.
 * @param {string} [options.apiKey] - Required for `ADMIN_API_KEY` auth.
 * @param {string} [options.userApiKey] - Required for `USER_API` auth.
 * @param {string} [options.userApiClientId] - Optional client id sent alongside a User API key.
 * @returns {Promise<Array<{id: number, name: string}>>} Categories sorted by display name.
 * @throws {Error} With actionable guidance if credentials are missing, Discourse returns a non-2xx response, or the response shape is unrecognized.
 */
export async function listCategories({
  baseUrl,
  authMethod,
  apiUsername,
  apiKey,
  userApiKey,
  userApiClientId
}) {
  const response = await fetch(`${baseUrl}/site.json`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      ...buildAuthHeaders({ authMethod, apiUsername, apiKey, userApiKey, userApiClientId })
    }
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "category loading"));
  }

  const data = await response.json();
  const categories = Array.isArray(data.categories)
    ? data.categories
    : data.category_list?.categories;
  if (!Array.isArray(categories)) {
    throw new Error("Discourse returned an unexpected category response. The site may need to be updated.");
  }

  const namesById = new Map(categories.map((category) => [category.id, category.name]));
  return categories
    .filter((category) => Number.isInteger(category.id) && category.name)
    .map((category) => ({
      id: category.id,
      name: category.parent_category_id && namesById.has(category.parent_category_id)
        ? `${namesById.get(category.parent_category_id)} / ${category.name}`
        : category.name
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Probe whether a Discourse site supports the User API key flow, via
 * `HEAD /user-api-key/new`.
 * @param {object} options
 * @param {string} options.baseUrl - Discourse site base URL, no trailing slash.
 * @returns {Promise<{version: string, supportsDeviceCode: boolean}>} The site's `Auth-Api-Version` (empty string if absent) and whether it advertises device-code authorization.
 * @throws {Error} If the site is unreachable, returns 404 (User API not supported), or returns another non-2xx response.
 */
export async function checkUserApiVersion({ baseUrl }) {
  let response;
  try {
    response = await fetch(`${baseUrl}/user-api-key/new`, { method: "HEAD" });
  } catch (error) {
    throw new Error(`Could not reach ${baseUrl}: ${error.message}`, { cause: error });
  }

  if (response.status === 404) {
    throw new Error(
      "This Discourse instance does not support the User API key flow. Use an Admin API key instead."
    );
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "support check"));
  }

  return {
    version: response.headers.get("Auth-Api-Version") || response.headers.get("auth-api-version") || "",
    supportsDeviceCode:
      response.headers.get("Auth-Api-Device-Code")?.toLowerCase() === "true"
  };
}

/**
 * Start a User API key device authorization request via
 * `POST /user-api-key/device.json`. The caller must poll for completion
 * with {@link pollUserApiDeviceRequest}.
 * @param {object} options
 * @param {string} options.baseUrl - Discourse site base URL, no trailing slash.
 * @param {string} options.applicationName - Name shown to the user during authorization.
 * @param {string} options.clientId - This extension install's client identifier.
 * @param {string} options.scopes - Comma-separated User API scopes being requested.
 * @param {string} options.nonce - One-time nonce for this authorization attempt.
 * @param {string} options.publicKey - PEM-encoded RSA public key used to encrypt the resulting key.
 * @param {number} [options.expiresInSeconds] - Optional key lifetime; omitted from the request when not provided.
 * @returns {Promise<{device_code: string, user_code: string, verification_uri: string, [key: string]: unknown}>} The device authorization details returned by Discourse.
 * @throws {Error} With actionable guidance if Discourse returns a non-2xx response, or if the response is missing required fields.
 */
export async function createUserApiDeviceRequest({
  baseUrl,
  applicationName,
  clientId,
  scopes,
  nonce,
  publicKey,
  expiresInSeconds
}) {
  const response = await fetch(`${baseUrl}/user-api-key/device.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      application_name: applicationName,
      client_id: clientId,
      scopes,
      nonce,
      public_key: publicKey,
      padding: "oaep",
      ...(expiresInSeconds ? { expires_in_seconds: expiresInSeconds } : {})
    })
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "authorization"));
  }

  const data = await response.json();
  if (!data.device_code || !data.user_code || !data.verification_uri) {
    throw new Error("Discourse returned an incomplete device authorization response.");
  }

  return data;
}

/**
 * Poll a pending device authorization request via
 * `POST /user-api-key/device/poll.json`. Callers are expected to poll
 * repeatedly until `status` indicates completion, denial, or expiry.
 * @param {object} options
 * @param {string} options.baseUrl - Discourse site base URL, no trailing slash.
 * @param {string} options.deviceCode - The `device_code` returned by {@link createUserApiDeviceRequest}.
 * @returns {Promise<{status: string, [key: string]: unknown}>} The current authorization status and, once approved, the encrypted payload fields.
 * @throws {Error} With actionable guidance if Discourse returns a non-2xx response, or if the response is missing a status.
 */
export async function pollUserApiDeviceRequest({ baseUrl, deviceCode }) {
  const response = await fetch(`${baseUrl}/user-api-key/device/poll.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode })
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(actionableDiscourseError(response, errorMessage, "authorization polling"));
  }

  const data = await response.json();
  if (!data.status) {
    throw new Error("Discourse returned an incomplete authorization status.");
  }

  return data;
}

/**
 * Revoke a User API key via `POST /user-api-key/revoke`, so it can no
 * longer be used after the profile is disconnected or deleted.
 * @param {object} options
 * @param {string} options.baseUrl - Discourse site base URL, no trailing slash.
 * @param {string} options.userApiKey - The key to revoke.
 * @param {string} [options.userApiClientId] - Optional client id sent alongside the key.
 * @returns {Promise<void>}
 * @throws {Error} If `userApiKey` is missing, or Discourse returns a non-2xx response.
 */
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
    throw new Error(actionableDiscourseError(response, errorMessage, "revocation"));
  }
}
