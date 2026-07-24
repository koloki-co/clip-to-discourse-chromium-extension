// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { connectedAdminProfile, expect, test } from "./extension-fixtures.js";

test("creates, saves, switches, and persists profiles with host access", async ({
  extension,
  mockDiscourse,
  page
}) => {
  await page.goto(extension.optionsUrl);
  await page.getByRole("button", { name: "Add Profile" }).click();
  await page.getByRole("textbox", { name: "New profile name" }).fill("Forum A");
  await page.getByRole("button", { name: "Create Profile" }).click();
  const profileSelect = page.getByRole("combobox", { name: "Active Profile" });
  const forumAId = await profileSelect.inputValue();

  await page.getByRole("tab", { name: "Admin API Key" }).click();
  await page.getByRole("textbox", { name: "Discourse BaseURL" }).fill(mockDiscourse.baseUrl);
  await page.getByRole("textbox", { name: "Discourse API Username" }).fill("e2e-user-a");
  await page.getByRole("textbox", { name: /Discourse API Key/ }).fill("e2e-not-a-secret-a");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("status").last()).toContainText("Settings saved");
  await expect.poll(() => extension.hasHostPermission(mockDiscourse.baseUrl)).toBe(true);

  await page.getByRole("button", { name: "Add Profile" }).click();
  await page.getByRole("textbox", { name: "New profile name" }).fill("Forum B");
  await page.getByRole("button", { name: "Create Profile" }).click();
  await expect(profileSelect).not.toHaveValue(forumAId);

  await profileSelect.selectOption({ label: "Forum A" });
  await expect(page.getByRole("textbox", { name: "Discourse BaseURL" })).toHaveValue(mockDiscourse.baseUrl);
  await page.reload();
  await expect(profileSelect).toHaveValue(forumAId);

  const storage = await extension.getStorage();
  const forumA = storage.profiles.find((profile) => profile.name === "Forum A");
  expect(storage.activeProfileId).toBe(forumA.id);
  expect(forumA.apiKey).toBe("e2e-not-a-secret-a");
});

test("loads visible categories and tests the configured connection", async ({
  extension,
  mockDiscourse,
  page
}) => {
  const profile = connectedAdminProfile({ baseUrl: mockDiscourse.baseUrl });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false
  });

  await page.goto(extension.optionsUrl);
  await page.getByRole("combobox", { name: /Default Category/ }).focus();
  await expect(page.getByRole("option", { name: "Community / Support" })).toBeAttached();
  await page.getByRole("button", { name: "Test Connection" }).click();
  await expect(page.getByRole("status").last()).toContainText("authenticated as @e2e-user");

  expect(mockDiscourse.requests.some((request) => request.path === "/site.json")).toBe(true);
  const sessionRequest = mockDiscourse.requests.find((request) => request.path === "/session/current.json");
  expect(sessionRequest.headers["api-key"]).toBe("e2e-not-a-secret-a");
  expect(sessionRequest.headers["api-username"]).toBe("e2e-user-a");
});
