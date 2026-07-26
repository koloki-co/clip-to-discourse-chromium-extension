// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { connectedAdminProfile, expect, test } from "./extension-fixtures.js";

function themeToken(page, name) {
  return page.evaluate((token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(), name);
}

test("persists an explicit theme and applies it to the popup", async ({
  extension,
  fixtureSite,
  mockDiscourse,
  page
}) => {
  const profile = connectedAdminProfile({ baseUrl: mockDiscourse.baseUrl });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false,
    allowHttp: true,
    theme: "system"
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(extension.optionsUrl);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect.poll(() => themeToken(page, "--card")).toBe("#282d35");

  await page.getByRole("combobox", { name: "Theme" }).selectOption("dark");
  await expect.poll(async () => (await extension.getStorage()).theme).toBe("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => themeToken(page, "--card")).toBe("#282d35");

  await page.getByRole("combobox", { name: "Theme" }).selectOption("light");
  await expect.poll(async () => (await extension.getStorage()).theme).toBe("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => themeToken(page, "--card")).toBe("#ffffff");

  await page.goto(fixtureSite.url);
  const popup = await extension.triggerAction(page);
  await expect(popup.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => themeToken(popup, "--card")).toBe("#ffffff");
});

test("updates an open System-themed page when the OS preference changes", async ({
  extension,
  fixtureSite,
  mockDiscourse,
  page
}) => {
  const profile = connectedAdminProfile({ baseUrl: mockDiscourse.baseUrl });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false,
    allowHttp: true,
    theme: "system"
  });

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(extension.optionsUrl);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect.poll(() => themeToken(page, "--card")).toBe("#ffffff");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => themeToken(page, "--card")).toBe("#282d35");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");

  await page.goto(fixtureSite.url);
  const popup = await extension.triggerAction(page);
  await popup.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => themeToken(popup, "--card")).toBe("#ffffff");

  await popup.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => themeToken(popup, "--card")).toBe("#282d35");
  await expect(popup.locator("html")).toHaveAttribute("data-theme", "system");
});
