// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from "vitest";
import { decryptUserApiPayload, generateUserApiKeyPair } from "../user-api-crypto.js";

describe("User API credential encryption", () => {
  it("decrypts a Discourse-compatible RSA-OAEP SHA-1 payload", async () => {
    const { publicKey, privateKey } = await generateUserApiKeyPair();
    const plaintext = JSON.stringify({ key: "user-key", nonce: "nonce-123", api: 4 });
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      new TextEncoder().encode(plaintext)
    );
    const payload = Buffer.from(encrypted).toString("base64");

    await expect(decryptUserApiPayload(payload, privateKey)).resolves.toBe(plaintext);
  });
});
