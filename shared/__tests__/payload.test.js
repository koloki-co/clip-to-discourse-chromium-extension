import { describe, expect, it } from "vitest";
import { buildPayload } from "../payload.js";
import { DESTINATIONS } from "../constants.js";

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
