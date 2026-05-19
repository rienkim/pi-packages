import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("debugLog", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does not call console.warn when PI_SUBAGENTS_DEBUG is unset", async () => {
    delete process.env.PI_SUBAGENTS_DEBUG;
    vi.resetModules();
    const { debugLog } = await import("../src/debug.js");
    debugLog("test context", new Error("boom"));
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("does not call console.warn when PI_SUBAGENTS_DEBUG=0", async () => {
    vi.stubEnv("PI_SUBAGENTS_DEBUG", "0");
    vi.resetModules();
    const { debugLog } = await import("../src/debug.js");
    debugLog("test context", new Error("boom"));
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("calls console.warn with formatted message when PI_SUBAGENTS_DEBUG=1", async () => {
    vi.stubEnv("PI_SUBAGENTS_DEBUG", "1");
    vi.resetModules();
    const { debugLog } = await import("../src/debug.js");
    const err = new Error("something failed");
    debugLog("cleanup worktree", err);
    expect(console.warn).toHaveBeenCalledWith(
      "[pi-subagents:debug] cleanup worktree:",
      err,
    );
  });

  it("DEBUG export is true when PI_SUBAGENTS_DEBUG=1", async () => {
    vi.stubEnv("PI_SUBAGENTS_DEBUG", "1");
    vi.resetModules();
    const { DEBUG } = await import("../src/debug.js");
    expect(DEBUG).toBe(true);
  });

  it("DEBUG export is false when PI_SUBAGENTS_DEBUG is unset", async () => {
    delete process.env.PI_SUBAGENTS_DEBUG;
    vi.resetModules();
    const { DEBUG } = await import("../src/debug.js");
    expect(DEBUG).toBe(false);
  });
});
