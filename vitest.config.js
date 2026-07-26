// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "shared/extract.js",
        "shared/payload.js",
        "shared/discourse.js"
      ],
      reporter: ["text", "json-summary"],
      thresholds: {
        statements: 60,
        branches: 45,
        functions: 70,
        lines: 60
      }
    }
  }
});
