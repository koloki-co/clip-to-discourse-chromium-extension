// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.js",
  forbidOnly: Boolean(process.env.CI),
  outputDir: "test-results/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  reporter: process.env.CI ? [["github"], ["line"]] : "line",
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  }
});
