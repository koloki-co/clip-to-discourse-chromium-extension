// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  getSettingsState,
  setActiveProfile,
  saveActiveProfile,
  saveProfile,
  addProfile,
  deleteProfile,
  DEFAULT_PROFILE
} from "../../shared/settings.js";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../../shared/constants.js";

describe("Chrome Storage Configuration", () => {
  let mockSync;
  let mockLocal;

  function createStorageArea(store) {
    return {
      get: vi.fn((keys) => {
        const result = {};
        if (typeof keys === "string") {
          result[keys] = store[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach((key) => {
            result[key] = store[key];
          });
        } else if (keys === null || keys === undefined) {
          Object.assign(result, store);
        } else if (typeof keys === "object") {
          Object.keys(keys).forEach((key) => {
            result[key] = store[key] !== undefined ? store[key] : keys[key];
          });
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items) => {
        Object.assign(store, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach((key) => delete store[key]);
        return Promise.resolve();
      })
    };
  }

  beforeEach(() => {
    mockSync = {};
    mockLocal = {};

    globalThis.chrome = {
      storage: {
        sync: createStorageArea(mockSync),
        local: createStorageArea(mockLocal)
      }
    };
  });

  afterEach(() => {
    delete globalThis.chrome;
    vi.restoreAllMocks();
  });

  describe("getSettingsState", () => {
    it("loads settings from chrome.storage.sync", async () => {
      mockLocal.profiles = [{
        id: "test-profile",
        name: "Test",
        baseUrl: "https://forum.example.com"
      }];
      mockLocal.activeProfileId = "test-profile";

      const state = await getSettingsState();

      expect(chrome.storage.sync.get).toHaveBeenCalled();
      expect(state.profiles).toHaveLength(1);
      expect(state.activeProfileId).toBe("test-profile");
    });

    it("creates default profile when none exist", async () => {
      const state = await getSettingsState();

      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].name).toBe(DEFAULT_PROFILE.name);
      expect(state.profiles[0].id).toBeTruthy();
    });

    it("normalizes profiles with default values", async () => {
      mockLocal.profiles = [{
        id: "partial-profile",
        name: "Partial",
        baseUrl: "https://forum.example.com"
      }];

      const state = await getSettingsState();
      const profile = state.profiles[0];

      expect(profile.authMethod).toBe(DEFAULT_PROFILE.authMethod);
      expect(profile.defaultClipStyle).toBe(DEFAULT_PROFILE.defaultClipStyle);
      expect(profile.defaultDestination).toBe(DEFAULT_PROFILE.defaultDestination);
    });

    it("preserves Admin API credentials in profiles created before auth methods", async () => {
      mockLocal.profiles = [{
        id: "legacy-admin-profile",
        name: "Legacy Admin",
        baseUrl: "https://forum.example.com",
        apiUsername: "legacy-user",
        apiKey: "legacy-key"
      }];
      mockLocal.activeProfileId = "legacy-admin-profile";
      mockSync.useFaviconForIcon = false;

      const state = await getSettingsState();

      expect(state.activeProfile.authMethod).toBe(AUTH_METHODS.ADMIN_API_KEY);
      expect(mockLocal.profiles[0].authMethod).toBe(AUTH_METHODS.ADMIN_API_KEY);
    });

    it("returns active profile", async () => {
      mockLocal.profiles = [{
        id: "profile-1",
        name: "Profile 1",
        baseUrl: "https://forum1.example.com"
      }, {
        id: "profile-2",
        name: "Profile 2",
        baseUrl: "https://forum2.example.com"
      }];
      mockLocal.activeProfileId = "profile-2";

      const state = await getSettingsState();

      expect(state.activeProfile.id).toBe("profile-2");
      expect(state.activeProfile.baseUrl).toBe("https://forum2.example.com");
    });
  });

  describe("setActiveProfile", () => {
    beforeEach(() => {
      mockLocal.profiles = [
        { id: "profile-1", name: "Profile 1" },
        { id: "profile-2", name: "Profile 2" }
      ];
      mockLocal.activeProfileId = "profile-1";
    });

    it("updates active profile ID in storage", async () => {
      await setActiveProfile("profile-2");

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        activeProfileId: "profile-2"
      });
      expect(mockLocal.activeProfileId).toBe("profile-2");
    });

    it("does not change storage if profile does not exist", async () => {
      await expect(setActiveProfile("nonexistent")).rejects.toThrow("Selected profile does not exist.");
      expect(mockLocal.activeProfileId).toBe("profile-1");
    });
  });

  describe("addProfile", () => {
    it("creates new profile with generated id", async () => {
      // Start with a default profile so we know the count
      mockLocal.profiles = [{
        id: "default",
        name: "Default"
      }];
      mockLocal.activeProfileId = "default";

      const newProfile = {
        name: "New Profile",
        baseUrl: "https://new.example.com",
        apiUsername: "user",
        apiKey: "key"
      };

      const saved = await addProfile(newProfile);

      expect(saved.id).toBeTruthy();
      expect(chrome.storage.local.set).toHaveBeenCalled();
      expect(mockLocal.profiles).toHaveLength(2);
      expect(mockLocal.profiles[1].name).toBe("New Profile");
    });

    it("normalizes base URL by removing trailing slash", async () => {
      const profile = {
        name: "Test",
        baseUrl: "https://forum.example.com/"
      };

      const saved = await addProfile(profile);

      expect(saved.baseUrl).toBe("https://forum.example.com");
    });

    it("makes new profile active", async () => {
      const saved = await addProfile({
        name: "New Active",
        baseUrl: "https://forum.example.com"
      });

      expect(mockLocal.activeProfileId).toBe(saved.id);
    });
  });

  describe("saveActiveProfile", () => {
    beforeEach(() => {
      mockLocal.profiles = [{
        id: "active-profile",
        name: "Active Profile",
        baseUrl: "https://active.example.com"
      }];
      mockLocal.activeProfileId = "active-profile";
    });

    it("updates active profile", async () => {
      await saveActiveProfile({
        name: "Updated Name",
        baseUrl: "https://updated.example.com"
      });

      expect(mockLocal.profiles).toHaveLength(1);
      expect(mockLocal.profiles[0].name).toBe("Updated Name");
      expect(mockLocal.profiles[0].baseUrl).toBe("https://updated.example.com");
    });

    it("preserves other profiles when updating active one", async () => {
      mockLocal.profiles = [
        { id: "profile-1", name: "Profile 1" },
        { id: "profile-2", name: "Profile 2" }
      ];
      mockLocal.activeProfileId = "profile-1";

      await saveActiveProfile({
        name: "Updated Profile 1"
      });

      expect(mockLocal.profiles).toHaveLength(2);
      expect(mockLocal.profiles[0].name).toBe("Updated Profile 1");
      expect(mockLocal.profiles[1].name).toBe("Profile 2");
    });

    it("normalizes base URL by removing trailing slash", async () => {
      await saveActiveProfile({
        baseUrl: "https://forum.example.com/"
      });

      expect(mockLocal.profiles[0].baseUrl).toBe("https://forum.example.com");
    });
  });

  describe("saveProfile", () => {
    beforeEach(() => {
      mockLocal.profiles = [
        { id: "profile-1", name: "Profile 1", baseUrl: "https://forum1.example.com" },
        { id: "profile-2", name: "Profile 2", baseUrl: "https://forum2.example.com" }
      ];
      mockLocal.activeProfileId = "profile-1";
    });

    it("saves to the flow's profile even after the active profile changed", async () => {
      // A device-authorization flow started on profile-1; the user switched
      // to profile-2 before the credential arrived.
      await setActiveProfile("profile-2");

      await saveProfile("profile-1", { userApiKey: "key-for-profile-1" });

      const profile1 = mockLocal.profiles.find((profile) => profile.id === "profile-1");
      const profile2 = mockLocal.profiles.find((profile) => profile.id === "profile-2");
      expect(profile1.userApiKey).toBe("key-for-profile-1");
      expect(profile2.userApiKey).toBeFalsy();
    });

    it("rejects when the target profile no longer exists", async () => {
      await expect(saveProfile("deleted-profile", { userApiKey: "orphan-key" }))
        .rejects.toThrow("Profile no longer exists.");
      expect(mockLocal.profiles.every((profile) => !profile.userApiKey)).toBe(true);
    });
  });

  describe("deleteProfile", () => {
    beforeEach(() => {
      mockLocal.profiles = [
        { id: "profile-1", name: "Profile 1" },
        { id: "profile-2", name: "Profile 2" }
      ];
      mockLocal.activeProfileId = "profile-1";
    });

    it("removes profile from storage", async () => {
      await deleteProfile("profile-2");

      expect(mockLocal.profiles).toHaveLength(1);
      expect(mockLocal.profiles[0].id).toBe("profile-1");
    });

    it("switches active profile when deleting active profile", async () => {
      await deleteProfile("profile-1");

      expect(mockLocal.activeProfileId).toBe("profile-2");
    });

    it("does not remove last profile", async () => {
      await deleteProfile("profile-1");
      
      await expect(deleteProfile("profile-2")).rejects.toThrow("At least one profile is required.");
      expect(mockLocal.profiles.length).toBe(1);
    });
  });

  describe("Storage Migration", () => {
    it("migrates profiles from sync to local storage on first load", async () => {
      mockSync.profiles = [{ id: "migrated", name: "Migrated Profile", baseUrl: "https://forum.example.com" }];
      mockSync.activeProfileId = "migrated";
      mockSync.useFaviconForIcon = true;

      const state = await getSettingsState();

      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].id).toBe("migrated");
      expect(mockLocal.profiles).toHaveLength(1);
      expect(mockLocal.profiles[0].id).toBe("migrated");
      expect(mockLocal.activeProfileId).toBe("migrated");
      expect(mockSync.profiles).toBeUndefined();
      expect(mockSync.activeProfileId).toBeUndefined();
      expect(mockSync.useFaviconForIcon).toBe(true);
    });

    it("migrates legacy single-profile settings to multi-profile", async () => {
      mockSync.baseUrl = "https://legacy.example.com";
      mockSync.apiUsername = "legacyuser";
      mockSync.apiKey = "legacykey";
      mockSync.defaultClipStyle = CLIP_STYLES.EXCERPT;

      const state = await getSettingsState();

      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].baseUrl).toBe("https://legacy.example.com");
      expect(state.profiles[0].apiUsername).toBe("legacyuser");
      expect(state.profiles[0].apiKey).toBe("legacykey");
      expect(state.profiles[0].authMethod).toBe(AUTH_METHODS.ADMIN_API_KEY);
      expect(state.profiles[0].defaultClipStyle).toBe(CLIP_STYLES.EXCERPT);
    });

    it("removes legacy keys after migration", async () => {
      mockSync.baseUrl = "https://legacy.example.com";
      mockSync.apiUsername = "legacyuser";

      await getSettingsState();

      expect(chrome.storage.sync.remove).toHaveBeenCalled();
    });

    it("does not migrate when profiles already exist", async () => {
      mockLocal.profiles = [{
        id: "existing",
        name: "Existing Profile"
      }];
      mockSync.baseUrl = "https://legacy.example.com";

      const state = await getSettingsState();

      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].id).toBe("existing");
      expect(chrome.storage.sync.remove).not.toHaveBeenCalled();
    });
  });

  describe("Storage Persistence", () => {
    beforeEach(() => {
      // Start with a default profile
      mockLocal.profiles = [{
        id: "default",
        name: "Default"
      }];
      mockLocal.activeProfileId = "default";
    });

    it("persists multiple profiles", async () => {
      await addProfile({ name: "Profile 1", baseUrl: "https://forum1.example.com" });
      await addProfile({ name: "Profile 2", baseUrl: "https://forum2.example.com" });

      expect(mockLocal.profiles).toHaveLength(3); // default + 2 new
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it("keeps both profiles when two adds run concurrently", async () => {
      const profile1 = { name: "Profile 1", baseUrl: "https://forum1.example.com" };
      const profile2 = { name: "Profile 2", baseUrl: "https://forum2.example.com" };

      await Promise.all([
        addProfile(profile1),
        addProfile(profile2)
      ]);

      expect(mockLocal.profiles).toHaveLength(3); // default + both new profiles
      const names = mockLocal.profiles.map((profile) => profile.name);
      expect(names).toContain("Profile 1");
      expect(names).toContain("Profile 2");
    });

    it("does not lose a saved credential when another write runs concurrently", async () => {
      await Promise.all([
        saveActiveProfile({ userApiKey: "freshly-issued-key" }),
        addProfile({ name: "Second", baseUrl: "https://forum2.example.com" })
      ]);

      const defaultProfile = mockLocal.profiles.find((profile) => profile.id === "default");
      expect(defaultProfile.userApiKey).toBe("freshly-issued-key");
      expect(mockLocal.profiles.map((profile) => profile.name)).toContain("Second");
    });
  });

  describe("Default Values", () => {
    it("uses correct default auth method", () => {
      expect(DEFAULT_PROFILE.authMethod).toBe(AUTH_METHODS.USER_API);
    });

    it("uses correct default clip style", () => {
      expect(DEFAULT_PROFILE.defaultClipStyle).toBe(CLIP_STYLES.TITLE_URL);
    });

    it("uses correct default destination", () => {
      expect(DEFAULT_PROFILE.defaultDestination).toBe(DESTINATIONS.NEW_TOPIC);
    });

    it("has default title template", () => {
      expect(DEFAULT_PROFILE.titleTemplate).toBe("Clip: {{title}}");
    });
  });
});
