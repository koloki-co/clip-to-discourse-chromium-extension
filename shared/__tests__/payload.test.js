// SPDX-FileCopyrightText: 2025 Marcus Baw / Koloki Ltd
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from "vitest";
import { buildPayload, truncateRaw } from "../payload.js";
import { DESTINATIONS, MAX_PAYLOAD_LENGTH } from "../constants.js";

describe("payload", () => {
  it("builds a new topic payload with category", () => {
    const payload = buildPayload({
      destination: DESTINATIONS.NEW_TOPIC,
      title: "Clip: Example",
      categoryId: "12",
      raw: "Hello"
    });

    expect(payload).toEqual({
      title: "Clip: Example",
      raw: "Hello",
      category: 12
    });
  });

  it("builds a reply payload", () => {
    const payload = buildPayload({
      destination: DESTINATIONS.APPEND_TOPIC,
      topicId: "42",
      raw: "Reply"
    });

    expect(payload).toEqual({
      topic_id: 42,
      raw: "Reply"
    });
  });
});

describe("truncateRaw", () => {
  it("returns short strings unchanged", () => {
    expect(truncateRaw("short text")).toBe("short text");
  });

  it("returns strings at exactly the limit unchanged", () => {
    const exact = "a".repeat(MAX_PAYLOAD_LENGTH);
    expect(truncateRaw(exact)).toBe(exact);
    expect(truncateRaw(exact).length).toBe(MAX_PAYLOAD_LENGTH);
  });

  it("truncates strings exceeding the limit", () => {
    const long = "b".repeat(MAX_PAYLOAD_LENGTH + 500);
    const result = truncateRaw(long);
    expect(result.length).toBe(MAX_PAYLOAD_LENGTH);
    expect(result).toBe("b".repeat(MAX_PAYLOAD_LENGTH));
  });

  it("passes through non-string values", () => {
    expect(truncateRaw(undefined)).toBeUndefined();
    expect(truncateRaw(null)).toBeNull();
  });
});

describe("buildPayload truncation", () => {
  it("truncates raw in a new topic payload", () => {
    const long = "x".repeat(MAX_PAYLOAD_LENGTH + 100);
    const payload = buildPayload({
      destination: DESTINATIONS.NEW_TOPIC,
      title: "Clip: Long",
      categoryId: "1",
      raw: long
    });

    expect(payload.raw.length).toBe(MAX_PAYLOAD_LENGTH);
  });

  it("truncates raw in a reply payload", () => {
    const long = "y".repeat(MAX_PAYLOAD_LENGTH + 100);
    const payload = buildPayload({
      destination: DESTINATIONS.APPEND_TOPIC,
      topicId: "10",
      raw: long
    });

    expect(payload.raw.length).toBe(MAX_PAYLOAD_LENGTH);
  });
});
