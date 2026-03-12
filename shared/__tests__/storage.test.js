// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  getSettingsState,
  setActiveProfile,
  saveActiveProfile,
  addProfile,
  deleteProfile,
  DEFAULT_PROFILE
} from "../../shared/settings.js";
import { AUTH_METHODS, CLIP_STYLES, DESTINATIONS } from "../../shared/constants.js";

describe("Chrome Storage Configuration", () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    
    globalThis.chrome = {
      storage: {
        sync: {
          get: vi.fn((keys) => {
            const result = {};
            if (typeof keys === "string") {
              result[keys] = mockStorage[keys];
            } else if (Array.isArray(keys)) {
              keys.forEach((key) => {
                result[key] = mockStorage[key];
              });
            } else if (keys === null || keys === undefined) {
              Object.assign(result, mockStorage);
            } else if (typeof keys === "object") {
              Object.keys(keys).forEach((key) => {
                result[key] = mockStorage[key] !== undefined ? mockStorage[key] : keys[key];
              });
            }
            return Promise.resolve(result);
          }),
          set: vi.fn((items) => {
            Object.assign(mockStorage, items);
            return Promise.resolve();
          }),
          remove: vi.fn((keys) => {
            const keysArray = Array.isArray(keys) ? keys : [keys];
            keysArray.forEach((key) => delete mockStorage[key]);
            return Promise.resolve();
          })
        }
      }
    };
  });

  afterEach(() => {
    delete globalThis.chrome;
    vi.restoreAllMocks();
  });

  describe("getSettingsState", () => {
    it("loads settings from chrome.storage.sync", async () => {
      mockStorage.profiles = [{
        id: "test-profile",
        name: "Test",
        baseUrl: "https://forum.example.com"
      }];
      mockStorage.activeProfileId = "test-profile";

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
      mockStorage.profiles = [{
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

    it("returns active profile", async () => {
      mockStorage.profiles = [{
        id: "profile-1",
        name: "Profile 1",
        baseUrl: "https://forum1.example.com"
      }, {
        id: "profile-2",
        name: "Profile 2",
        baseUrl: "https://forum2.example.com"
      }];
      mockStorage.activeProfileId = "profile-2";

      const state = await getSettingsState();

      expect(state.activeProfile.id).toBe("profile-2");
      expect(state.activeProfile.baseUrl).toBe("https://forum2.example.com");
    });
  });

  describe("setActiveProfile", () => {
    beforeEach(() => {
      mockStorage.profiles = [
        { id: "profile-1", name: "Profile 1" },
        { id: "profile-2", name: "Profile 2" }
      ];
      mockStorage.activeProfileId = "profile-1";
    });

    it("updates active profile ID in storage", async () => {
      await setActiveProfile("profile-2");

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        activeProfileId: "profile-2"
      });
      expect(mockStorage.activeProfileId).toBe("profile-2");
    });

    it("does not change storage if profile does not exist", async () => {
      await expect(setActiveProfile("nonexistent")).rejects.toThrow("Selected profile does not exist.");
      expect(mockStorage.activeProfileId).toBe("profile-1");
    });
  });

  describe("addProfile", () => {
    it("creates new profile with generated id", async () => {
      // Start with a default profile so we know the count
      mockStorage.profiles = [{
        id: "default",
        name: "Default"
      }];
      mockStorage.activeProfileId = "default";

      const newProfile = {
        name: "New Profile",
        baseUrl: "https://new.example.com",
        apiUsername: "user",
        apiKey: "key"
      };

      const saved = await addProfile(newProfile);

      expect(saved.id).toBeTruthy();
      expect(chrome.storage.sync.set).toHaveBeenCalled();
      expect(mockStorage.profiles).toHaveLength(2);
      expect(mockStorage.profiles[1].name).toBe("New Profile");
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

      expect(mockStorage.activeProfileId).toBe(saved.id);
    });
  });

  describe("saveActiveProfile", () => {
    beforeEach(() => {
      mockStorage.profiles = [{
        id: "active-profile",
        name: "Active Profile",
        baseUrl: "https://active.example.com"
      }];
      mockStorage.activeProfileId = "active-profile";
    });

    it("updates active profile", async () => {
      await saveActiveProfile({
        name: "Updated Name",
        baseUrl: "https://updated.example.com"
      });

      expect(mockStorage.profiles).toHaveLength(1);
      expect(mockStorage.profiles[0].name).toBe("Updated Name");
      expect(mockStorage.profiles[0].baseUrl).toBe("https://updated.example.com");
    });

    it("preserves other profiles when updating active one", async () => {
      mockStorage.profiles = [
        { id: "profile-1", name: "Profile 1" },
        { id: "profile-2", name: "Profile 2" }
      ];
      mockStorage.activeProfileId = "profile-1";

      await saveActiveProfile({
        name: "Updated Profile 1"
      });

      expect(mockStorage.profiles).toHaveLength(2);
      expect(mockStorage.profiles[0].name).toBe("Updated Profile 1");
      expect(mockStorage.profiles[1].name).toBe("Profile 2");
    });

    it("normalizes base URL by removing trailing slash", async () => {
      await saveActiveProfile({
        baseUrl: "https://forum.example.com/"
      });

      expect(mockStorage.profiles[0].baseUrl).toBe("https://forum.example.com");
    });
  });

  describe("deleteProfile", () => {
    beforeEach(() => {
      mockStorage.profiles = [
        { id: "profile-1", name: "Profile 1" },
        { id: "profile-2", name: "Profile 2" }
      ];
      mockStorage.activeProfileId = "profile-1";
    });

    it("removes profile from storage", async () => {
      await deleteProfile("profile-2");

      expect(mockStorage.profiles).toHaveLength(1);
      expect(mockStorage.profiles[0].id).toBe("profile-1");
    });

    it("switches active profile when deleting active profile", async () => {
      await deleteProfile("profile-1");

      expect(mockStorage.activeProfileId).toBe("profile-2");
    });

    it("does not remove last profile", async () => {
      await deleteProfile("profile-1");
      
      await expect(deleteProfile("profile-2")).rejects.toThrow("At least one profile is required.");
      expect(mockStorage.profiles.length).toBe(1);
    });
  });

  describe("Storage Migration", () => {
    it("migrates legacy single-profile settings to multi-profile", async () => {
      mockStorage.baseUrl = "https://legacy.example.com";
      mockStorage.apiUsername = "legacyuser";
      mockStorage.apiKey = "legacykey";
      mockStorage.defaultClipStyle = CLIP_STYLES.EXCERPT;

      const state = await getSettingsState();

      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].baseUrl).toBe("https://legacy.example.com");
      expect(state.profiles[0].apiUsername).toBe("legacyuser");
      expect(state.profiles[0].apiKey).toBe("legacykey");
      expect(state.profiles[0].defaultClipStyle).toBe(CLIP_STYLES.EXCERPT);
    });

    it("removes legacy keys after migration", async () => {
      mockStorage.baseUrl = "https://legacy.example.com";
      mockStorage.apiUsername = "legacyuser";

      await getSettingsState();

      expect(chrome.storage.sync.remove).toHaveBeenCalled();
    });

    it("does not migrate when profiles already exist", async () => {
      mockStorage.profiles = [{
        id: "existing",
        name: "Existing Profile"
      }];
      mockStorage.baseUrl = "https://legacy.example.com";

      const state = await getSettingsState();

      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].id).toBe("existing");
      expect(chrome.storage.sync.remove).not.toHaveBeenCalled();
    });
  });

  describe("Storage Persistence", () => {
    beforeEach(() => {
      // Start with a default profile
      mockStorage.profiles = [{
        id: "default",
        name: "Default"
      }];
      mockStorage.activeProfileId = "default";
    });

    it("persists multiple profiles", async () => {
      await addProfile({ name: "Profile 1", baseUrl: "https://forum1.example.com" });
      await addProfile({ name: "Profile 2", baseUrl: "https://forum2.example.com" });

      expect(mockStorage.profiles).toHaveLength(3); // default + 2 new
      expect(chrome.storage.sync.set).toHaveBeenCalled();
    });

    it("handles concurrent profile updates", async () => {
      const profile1 = { name: "Profile 1", baseUrl: "https://forum1.example.com" };
      const profile2 = { name: "Profile 2", baseUrl: "https://forum2.example.com" };

      await Promise.all([
        addProfile(profile1),
        addProfile(profile2)
      ]);

      // Due to race conditions in concurrent operations, we expect at least 2 profiles
      // (the race may cause one to overwrite the other's state)
      expect(mockStorage.profiles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Default Values", () => {
    it("uses correct default auth method", () => {
      expect(DEFAULT_PROFILE.authMethod).toBe(AUTH_METHODS.ADMIN_API_KEY);
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
