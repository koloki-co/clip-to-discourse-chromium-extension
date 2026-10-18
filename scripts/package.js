// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archivePath = path.join(rootDir, "clip-to-discourse-extension.zip");

// esbuild inlines every shared/*.js module into whichever bundle(s) import
// it (directly or via chunks/, see scripts/bundle.js), so the raw shared/*.js
// sources are never loaded at runtime and are deliberately not listed here.
// chunks/ contents vary by build (hashed chunk names, and how many chunks
// esbuild produces), so they're discovered rather than hardcoded.
const chunkFiles = (await readdir(path.join(rootDir, "chunks")))
  .map((file) => path.join("chunks", file));

const runtimeFiles = [
  "manifest.json",
  "LICENSE.md",
  "THIRD-PARTY-NOTICES.md",
  "background.bundle.js",
  "popup/popup.html",
  "popup/popup.css",
  "popup/popup.bundle.js",
  "options/options.html",
  "options/options.css",
  "options/options.bundle.js",
  "shared/theme.css",
  "assets",
  ...chunkFiles
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
