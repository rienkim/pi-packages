import { describe, expect, it, vi } from "vitest";
import { createProgressCallback } from "../src/progress";

describe("createProgressCallback", () => {
  it("returns undefined when onUpdate is undefined", () => {
    expect(createProgressCallback(undefined)).toBeUndefined();
  });

  it("returns a function that calls onUpdate with progress type", () => {
    const onUpdate = vi.fn();
    const callback = createProgressCallback(onUpdate);

    expect(callback).toBeInstanceOf(Function);
    callback!("building...");

    expect(onUpdate).toHaveBeenCalledWith({
      type: "progress",
      content: "building...",
    });
  });
});
