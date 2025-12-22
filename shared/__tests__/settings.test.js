import { describe, expect, it } from "vitest";
import { normalizeBaseUrl, DEFAULT_SETTINGS } from "../settings.js";

describe("settings", () => {
  it("normalizes base url by trimming trailing slashes", () => {
    expect(normalizeBaseUrl("https://forum.example.com/"))
      .toBe("https://forum.example.com");
  });

  it("provides sane defaults", () => {
    expect(DEFAULT_SETTINGS.defaultClipStyle).toBeDefined();
    expect(DEFAULT_SETTINGS.defaultDestination).toBeDefined();
  });
});
