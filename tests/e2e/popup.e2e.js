// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { connectedAdminProfile, expect, test } from "./extension-fixtures.js";

async function selectFixtureText(page) {
  await page.locator("#selection-source").evaluate((element) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

test("detects selected text and posts it to the chosen category", async ({
  extension,
  fixtureSite,
  mockDiscourse,
  page
}) => {
  const profile = connectedAdminProfile({ baseUrl: mockDiscourse.baseUrl });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false
  });
  await page.goto(fixtureSite.url);
  await selectFixtureText(page);
  await page.bringToFront();
  expect(await extension.hasHostPermission(fixtureSite.url)).toBe(false);
  expect(await extension.canReadActiveTab()).toBe(false);

  const popup = await extension.triggerAction(page);
  await expect(popup.getByText(/Selection detected:/)).toBeVisible();
  await expect(popup.getByRole("radio", { name: "Text selection" })).toBeChecked();
  await popup.getByRole("combobox", { name: "Category" }).focus();
  await popup.getByRole("combobox", { name: "Category" }).selectOption("2");
  await popup.getByRole("button", { name: "Clip" }).click();
  await expect(popup.getByRole("status").last()).toContainText("Clipped successfully");

  const postRequest = mockDiscourse.requests.find((request) => request.path === "/posts.json");
  expect(postRequest.headers["api-key"]).toBe("e2e-not-a-secret-a");
  expect(postRequest.body.category).toBe(2);
  expect(postRequest.body.raw).toContain("Important **selected text** for clipping.");
  expect(postRequest.body.title).toBe("Clip: Playwright Fixture Article");
});

test("posts every clip style to the configured Discourse endpoint", async ({
  extension,
  fixtureSite,
  mockDiscourse,
  page
}) => {
  const profile = connectedAdminProfile({
    baseUrl: mockDiscourse.baseUrl,
    overrides: {
      defaultCategoryId: "1",
      titleUrlTemplate: "style:title-url\n{{title}}\n{{url}}",
      excerptTemplate: "style:excerpt\n{{excerpt}}",
      fullTextTemplate: "style:full-text\n{{full-text}}",
      textSelectionTemplate: "style:text-selection\n{{text-selection-markdown}}"
    }
  });
  await extension.setStorage({
    profiles: [profile],
    activeProfileId: profile.id,
    useFaviconForIcon: false,
    allowHttp: true
  });
  await page.goto(fixtureSite.url);
  await selectFixtureText(page);
  await page.bringToFront();

  const popup = await extension.triggerAction(page);
  await popup.getByRole("combobox", { name: "Category" }).focus();
  await expect(popup.getByRole("option", { name: "Community / Support" })).toBeAttached();

  const styles = [
    { name: "Title + URL", marker: "style:title-url", content: "Playwright Fixture Article" },
    { name: "Title + URL + excerpt", marker: "style:excerpt", content: "Important **selected text** for clipping." },
    { name: "Full page text", marker: "style:full-text", content: "Full-page fixture content" },
    { name: "Text selection", marker: "style:text-selection", content: "Important **selected text** for clipping." }
  ];

  for (const [index, style] of styles.entries()) {
    await popup.getByRole("radio", { name: style.name, exact: true }).check();
    await popup.getByRole("button", { name: "Clip" }).click();
    await expect.poll(() => mockDiscourse.requests.filter((request) => request.path === "/posts.json").length)
      .toBe(index + 1);
    await expect(popup.getByRole("status").last()).toContainText("Clipped successfully");
  }

  const posts = mockDiscourse.requests.filter((request) => request.path === "/posts.json");
  styles.forEach((style, index) => {
    expect(posts[index].body.category).toBe(1);
    expect(posts[index].body.raw).toContain(style.marker);
    expect(posts[index].body.raw).toContain(style.content);
  });
});

test("switches profile, persists it, and posts a reply with that profile", async ({
  extension,
  fixtureSite,
  mockDiscourse,
  page
}) => {
  const profileA = connectedAdminProfile({ baseUrl: mockDiscourse.baseUrl });
  const profileB = connectedAdminProfile({
    id: "profile-b",
    name: "Forum B",
    baseUrl: mockDiscourse.alternate.baseUrl,
    apiUsername: "e2e-user-b",
    apiKey: "e2e-not-a-secret-b",
    overrides: {
      defaultDestination: "append_topic",
      defaultCategoryId: "",
      defaultTopicId: "345"
    }
  });
  await extension.setStorage({
    profiles: [profileA, profileB],
    activeProfileId: profileA.id,
    useFaviconForIcon: false
  });
  await page.goto(fixtureSite.url);

  const popup = await extension.triggerAction(page);
  await popup.getByRole("combobox", { name: "Profile" }).selectOption(profileB.id);
  await expect(popup.getByRole("radio", { name: "Append to existing topic" })).toBeChecked();
  await expect(popup.getByRole("spinbutton", { name: "Topic ID" })).toHaveValue("345");
  await popup.getByRole("button", { name: "Clip" }).click();
  await expect(popup.getByRole("status").last()).toContainText("Clipped successfully");

  const storage = await extension.getStorage();
  expect(storage.activeProfileId).toBe(profileB.id);
  expect(mockDiscourse.requests.some((request) => request.path === "/posts.json")).toBe(false);
  const postRequest = mockDiscourse.alternate.requests.find((request) => request.path === "/posts.json");
  expect(postRequest.headers["api-key"]).toBe("e2e-not-a-secret-b");
  expect(postRequest.headers["api-username"]).toBe("e2e-user-b");
  expect(postRequest.body.topic_id).toBe(345);
});
