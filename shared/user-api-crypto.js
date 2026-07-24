// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const normalized = base64.replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function toPem(base64, label) {
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

export async function generateUserApiKeyPair() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is unavailable in this browser context.");
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-1"
    },
    true,
    ["encrypt", "decrypt"]
  );

  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  return {
    publicKeyPem: toPem(arrayBufferToBase64(spki), "PUBLIC KEY"),
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}

export async function decryptUserApiPayload(payload, privateKey) {
  const encrypted = base64ToArrayBuffer(payload);
  const decrypted = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encrypted);
  return new TextDecoder().decode(decrypted);
}
