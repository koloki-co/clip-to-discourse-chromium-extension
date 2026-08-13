// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { connectedAdminProfile, expect, test } from "./extension-fixtures.js";

test("creates, saves, switches, and persists distinct profiles with host access", async ({
  extension,
  mockDiscourse,
  page
}) => {
  await page.goto(extension.optionsUrl);
  await page.getByRole("button", { name: "New Profile" }).click();
  await page.getByRole("textbox", { name: "New profile name" }).fill("Forum A");
  await page.getByRole("button", { name: "Create Profile" }).click();
  await expect(page.getByRole("status").last()).toContainText('Profile "Forum A" created.');
  const forumAId = await extension.getStorage().then((storage) => storage.activeProfileId);

  await page.getByRole("tab", { name: "Admin API Key" }).click();
  await page.getByRole("textbox", { name: "Discourse BaseURL" }).fill(mockDiscourse.baseUrl);
  await page.getByRole("checkbox", { name: "Allow HTTP connections (advanced)" }).check();
  await page.getByRole("textbox", { name: "Discourse API Username" }).fill("e2e-user-a");
  await page.getByRole("textbox", { name: /Discourse API Key/ }).fill("e2e-not-a-secret-a");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("status").last()).toContainText("Settings saved");
  await expect.poll(() => extension.hasHostPermission(mockDiscourse.baseUrl)).toBe(true);

  await page.getByRole("button", { name: "New Profile" }).click();
  await page.getByRole("textbox", { name: "New profile name" }).fill("Forum B");
  await page.getByRole("button", { name: "Create Profile" }).click();
  await expect(page.getByRole("status").last()).toContainText('Profile "Forum B" created.');
  const forumBId = await extension.getStorage().then((storage) => storage.activeProfileId);
  expect(forumBId).not.toBe(forumAId);

  await page.getByRole("tab", { name: "Admin API Key" }).click();
  await page.getByRole("textbox", { name: "Discourse BaseURL" }).fill(mockDiscourse.alternate.baseUrl);
  await page.getByRole("textbox", { name: "Discourse API Username" }).fill("e2e-user-b");
  await page.getByRole("textbox", { name: /Discourse API Key/ }).fill("e2e-not-a-secret-b");
  await page.getByRole("combobox", { name: "Default Clip Style" }).selectOption("full_text");
  await page.getByRole("combobox", { name: "Default Destination" }).selectOption("append_topic");
  await page.getByRole("spinbutton", { name: "Default Topic ID" }).fill("345");
  await page.locator("#titleTemplate").fill("Forum B: {{title}}");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("status").last()).toContainText("Settings saved");

  await page.getByRole("option", { name: "Forum A" }).click();
  await expect(page.getByRole("textbox", { name: "Discourse BaseURL" })).toHaveValue(mockDiscourse.baseUrl);
  await expect.poll(async () => {
    const storage = await extension.getStorage();
    return storage.activeProfileId;
  }).toBe(forumAId);
  await page.reload();
  await expect(page.getByRole("option", { name: "Forum A" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("textbox", { name: /Discourse API Key/ })).toHaveValue("e2e-not-a-secret-a");

  await page.getByRole("option", { name: "Forum B" }).click();
  await expect(page.getByRole("textbox", { name: "Discourse BaseURL" })).toHaveValue(mockDiscourse.alternate.baseUrl);
  await expect(page.getByRole("combobox", { name: "Default Clip Style" })).toHaveValue("full_text");
  await expect(page.getByRole("combobox", { name: "Default Destination" })).toHaveValue("append_topic");
  await expect(page.getByRole("spinbutton", { name: "Default Topic ID" })).toHaveValue("345");
  await expect(page.locator("#titleTemplate")).toHaveValue("Forum B: {{title}}");
  await expect.poll(async () => {
    const storage = await extension.getStorage();
    return storage.activeProfileId;
  }).toBe(forumBId);
  await page.reload();
  await expect(page.getByRole("option", { name: "Forum B" })).toHaveAttribute("aria-selected", "true");

  const storage = await extension.getStorage();
  const forumA = storage.profiles.find((profile) => profile.name === "Forum A");
  const forumB = storage.profiles.find((profile) => profile.name === "Forum B");
  expect(storage.activeProfileId).toBe(forumB.id);
  expect(forumA.apiKey).toBe("e2e-not-a-secret-a");
  expect(forumB.apiKey).toBe("e2e-not-a-secret-b");
  expect(forumB.defaultClipStyle).toBe("full_text");
  expect(forumB.defaultDestination).toBe("append_topic");
  expect(forumB.defaultTopicId).toBe("345");
  expect(forumB.titleTemplate).toBe("Forum B: {{title}}");
});

test("renames, duplicates, and confirms deletion of profiles", async ({ extension, mockDiscourse, page }) => {
  const profile = connectedAdminProfile({
    name: "Full page",
    baseUrl: mockDiscourse.baseUrl,
    overrides: { defaultClipStyle: "full_text" }
  });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false,
    allowHttp: true
  });
  await page.goto(extension.optionsUrl);

  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page.getByRole("textbox", { name: "Profile name" }).fill("Research archive");
  await page.getByRole("button", { name: "Save Name" }).click();
  await expect(page.getByRole("option", { name: "Research archive" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByRole("option", { name: "Research archive copy" })).toHaveAttribute("aria-selected", "true");
  let storage = await extension.getStorage();
  const duplicate = storage.profiles.find((candidate) => candidate.name === "Research archive copy");
  expect(duplicate.apiKey).toBe(profile.apiKey);
  expect(duplicate.apiUsername).toBe(profile.apiUsername);
  expect(duplicate.defaultClipStyle).toBe("full_text");

  await page.getByRole("button", { name: "Delete Profile..." }).click();
  await expect(page.getByText("Its connection credentials and defaults will be removed.")).toBeVisible();
  await page.getByRole("button", { name: "Delete Profile", exact: true }).click();
  await expect(page.getByRole("option", { name: "Research archive copy" })).toHaveCount(0);
  storage = await extension.getStorage();
  expect(storage.profiles).toHaveLength(1);
  expect(storage.profiles[0].name).toBe("Research archive");
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
    useFaviconForIcon: false,
    allowHttp: true
  });

  await page.goto(extension.optionsUrl);
  await page.getByRole("combobox", { name: /Default Category/ }).click();
  await expect(page.getByRole("option", { name: "Community / Support" })).toBeAttached();
  await page.getByRole("button", { name: "Test Connection" }).click();
  await expect(page.getByRole("status").last()).toContainText("authenticated as @e2e-user");

  expect(mockDiscourse.requests.some((request) => request.path === "/site.json")).toBe(true);
  const sessionRequest = mockDiscourse.requests.find((request) => request.path === "/session/current.json");
  expect(sessionRequest.headers["api-key"]).toBe("e2e-not-a-secret-a");
  expect(sessionRequest.headers["api-username"]).toBe("e2e-user-a");
});

test("shows an actionable error when Discourse rejects the connection test", async ({
  extension,
  mockDiscourse,
  page
}) => {
  const profile = connectedAdminProfile({ baseUrl: mockDiscourse.baseUrl });
  mockDiscourse.setConnectionResponse(401, { errors: ["Test credential was rejected."] });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false,
    allowHttp: true
  });

  await page.goto(extension.optionsUrl);
  await page.getByRole("button", { name: "Test Connection" }).click();
  await expect(page.getByRole("status").last()).toContainText("Discourse rejected the stored credential");
  await expect(page.getByRole("status").last()).toContainText("Test credential was rejected.");
});

test("caches the destination favicon when the toolbar setting is enabled", async ({
  extension,
  mockDiscourse,
  page
}) => {
  const profile = connectedAdminProfile({ baseUrl: mockDiscourse.baseUrl });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false,
    allowHttp: true
  });

  await page.goto(extension.optionsUrl);
  await page.getByRole("checkbox", { name: "Use destination site favicon for the toolbar icon" }).check();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("status").last()).toContainText("Settings saved");
  await expect.poll(async () => {
    const storage = await extension.getStorage();
    return storage.faviconCache?.[profile.id] || "";
  }).toMatch(/^data:image\/png;base64,/);

  expect(mockDiscourse.requests.some((request) => request.path === "/favicon.ico")).toBe(true);
  expect(await extension.getActionTitle()).toBe("Clip To Discourse");
});
