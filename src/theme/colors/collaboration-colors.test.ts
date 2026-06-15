import { describe, expect, it } from "vitest";

import { getCollaborationColor } from "./collaboration-colors";

describe("collaboration colors", () => {
  it("returns a deterministic color for the same user", () => {
    expect(getCollaborationColor("user-123")).toBe(getCollaborationColor("user-123"));
  });

  it("handles empty and long user ids without falling outside the palette", () => {
    expect(getCollaborationColor("")).toEqual(
      expect.objectContaining({
        avatarClassName: expect.stringContaining("bg-collaboration-user-")
      })
    );
    expect(getCollaborationColor("a".repeat(256))).toEqual(
      expect.objectContaining({
        avatarClassName: expect.stringContaining("bg-collaboration-user-")
      })
    );
  });
});
