import { describe, it, expect } from "vitest";
import { isNearBottom } from "./autoscroll";

describe("isNearBottom", () => {
  it("returns false when user is far from bottom", () => {
    expect(
      isNearBottom({ scrollHeight: 2000, clientHeight: 500, scrollTop: 0 }, 80)
    ).toBe(false);
  });

  it("returns true when user is near bottom", () => {
    // distance = 2000 - 1425 - 500 = 75 < 80
    expect(
      isNearBottom({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1425 }, 80)
    ).toBe(true);
  });
});


