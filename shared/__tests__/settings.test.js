import { describe, expect, it } from "vitest";
import { normalizeBaseUrl, DEFAULT_PROFILE } from "../settings.js";

describe("settings", () => {
  it("normalizes base url by trimming trailing slashes", () => {
    expect(normalizeBaseUrl("https://forum.example.com/"))
      .toBe("https://forum.example.com");
  });

  it("provides sane profile defaults", () => {
    expect(DEFAULT_PROFILE.defaultClipStyle).toBeDefined();
    expect(DEFAULT_PROFILE.defaultDestination).toBeDefined();
  });
});
