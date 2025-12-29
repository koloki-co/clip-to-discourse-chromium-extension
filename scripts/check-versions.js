// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Ensure package.json and manifest.json stay in sync for release versioning.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const packageJsonPath = path.join(rootDir, "package.json");
const manifestPath = path.join(rootDir, "manifest.json");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (!packageJson.version || !manifest.version) {
  console.error("Missing version in package.json or manifest.json");
  process.exit(1);
}

if (packageJson.version !== manifest.version) {
  console.error(
    `Version mismatch: package.json (${packageJson.version}) vs manifest.json (${manifest.version})`
  );
  process.exit(1);
}

console.log(`Version check OK: ${packageJson.version}`);
