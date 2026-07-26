// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { THEMES } from "./constants.js";

export function normalizeTheme(value) {
  return Object.values(THEMES).includes(value) ? value : THEMES.SYSTEM;
}

export function applyTheme(value) {
  document.documentElement.dataset.theme = normalizeTheme(value);
}
