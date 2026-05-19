import { describe, expect, it } from "vitest";
import { createSubagentRuntime } from "../src/runtime.js";

describe("createSubagentRuntime", () => {
  it("returns correct defaults", () => {
    const runtime = createSubagentRuntime();
    expect(runtime.defaultMaxTurns).toBeUndefined();
    expect(runtime.graceTurns).toBe(5);
    expect(runtime.currentCtx).toBeUndefined();
    expect(runtime.widget).toBeNull();
    expect(runtime.agentActivity).toBeInstanceOf(Map);
    expect(runtime.agentActivity.size).toBe(0);
  });

  it("fields are independently mutable", () => {
    const runtime = createSubagentRuntime();
    runtime.defaultMaxTurns = 30;
    runtime.graceTurns = 10;
    runtime.currentCtx = { pi: {}, ctx: {} };
    expect(runtime.defaultMaxTurns).toBe(30);
    expect(runtime.graceTurns).toBe(10);
    expect(runtime.currentCtx).toEqual({ pi: {}, ctx: {} });
  });

  it("agentActivity map is independently mutable", () => {
    const runtime = createSubagentRuntime();
    const activity = {
      activeTools: new Map(),
      toolUses: 0,
      responseText: "",
      turnCount: 0,
      lifetimeUsage: { input: 0, output: 0, cacheWrite: 0 },
    };
    runtime.agentActivity.set("agent-1", activity as any);
    expect(runtime.agentActivity.size).toBe(1);
    expect(runtime.agentActivity.get("agent-1")).toBe(activity);
  });

  it("multiple instances are isolated — mutations do not cross-contaminate", () => {
    const a = createSubagentRuntime();
    const b = createSubagentRuntime();

    a.defaultMaxTurns = 20;
    a.graceTurns = 3;
    a.agentActivity.set("x", {} as any);

    expect(b.defaultMaxTurns).toBeUndefined();
    expect(b.graceTurns).toBe(5);
    expect(b.agentActivity.size).toBe(0);
  });

  it("widget field accepts an AgentWidget instance (structural check)", () => {
    const runtime = createSubagentRuntime();
    // Use a duck-typed stub to avoid importing the concrete class.
    const fakeWidget = { update: () => {}, markFinished: () => {}, setUICtx: () => {} };
    runtime.widget = fakeWidget as any;
    expect(runtime.widget).toBe(fakeWidget);
  });
});
