// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { cp, mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archivePath = path.join(rootDir, "clip-to-discourse-extension.zip");
const runtimeFiles = [
  "manifest.json",
  "background.bundle.js",
  "popup/popup.html",
  "popup/popup.css",
  "popup/popup.bundle.js",
  "options/options.html",
  "options/options.css",
  "options/options.bundle.js",
  "shared/constants.js",
  "shared/discourse.js",
  "shared/extract.js",
  "shared/favicon.js",
  "shared/markdown.js",
  "shared/payload.js",
  "shared/settings.js",
  "shared/theme.css",
  "shared/theme.js",
  "shared/user-api-crypto.js",
  "assets"
];

const stagingDir = await mkdtemp(path.join(tmpdir(), "clip-to-discourse-package-"));

try {
  await Promise.all(runtimeFiles.map((file) => cp(
    path.join(rootDir, file),
    path.join(stagingDir, file),
    { recursive: true }
  )));
  await rm(archivePath, { force: true });
  await execFileAsync("zip", ["-qr", archivePath, "."], { cwd: stagingDir });
} finally {
  await rm(stagingDir, { recursive: true, force: true });
}
