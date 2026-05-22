import { describe, expect, it, vi } from "vitest";
import { createSubagentRuntime, SubagentRuntime, type WidgetLike } from "../src/runtime.js";
import { AgentActivityTracker } from "../src/ui/agent-activity-tracker.js";

function createWidgetStub(): WidgetLike {
  return {
    setUICtx: vi.fn(),
    onTurnStart: vi.fn(),
    markFinished: vi.fn(),
    update: vi.fn(),
    ensureTimer: vi.fn(),
  };
}

describe("createSubagentRuntime", () => {
  it("returns correct defaults", () => {
    const runtime = createSubagentRuntime();
    expect(runtime.currentCtx).toBeUndefined();
    expect(runtime.widget).toBeNull();
    expect(runtime.agentActivity).toBeInstanceOf(Map);
    expect(runtime.agentActivity.size).toBe(0);
  });

  it("fields are independently mutable", () => {
    const runtime = createSubagentRuntime();
    runtime.currentCtx = { pi: {}, ctx: {} };
    expect(runtime.currentCtx).toEqual({ pi: {}, ctx: {} });
  });

  it("agentActivity map is independently mutable", () => {
    const runtime = createSubagentRuntime();
    const activity = new AgentActivityTracker();
    runtime.agentActivity.set("agent-1", activity);
    expect(runtime.agentActivity.size).toBe(1);
    expect(runtime.agentActivity.get("agent-1")).toBe(activity);
  });

  it("multiple instances are isolated — mutations do not cross-contaminate", () => {
    const a = createSubagentRuntime();
    const b = createSubagentRuntime();

    a.agentActivity.set("x", new AgentActivityTracker());

    expect(b.agentActivity.size).toBe(0);
  });

  it("widget field accepts a WidgetLike stub", () => {
    const runtime = createSubagentRuntime();
    const stub = createWidgetStub();
    runtime.widget = stub;
    expect(runtime.widget).toBe(stub);
  });
});

describe("SubagentRuntime class", () => {
  it("is a class — instances are created with new", () => {
    const runtime = new SubagentRuntime();
    expect(runtime).toBeInstanceOf(SubagentRuntime);
  });

  it("createSubagentRuntime returns an instance of the class", () => {
    const runtime = createSubagentRuntime();
    expect(runtime).toBeInstanceOf(SubagentRuntime);
  });
});

describe("SubagentRuntime session-context methods", () => {
  it("setSessionContext sets currentCtx with pi and ctx", () => {
    const runtime = createSubagentRuntime();
    const pi = { sendMessage: () => {} };
    const ctx = { ui: {} };
    runtime.setSessionContext(pi, ctx);
    expect(runtime.currentCtx).toEqual({ pi, ctx });
  });

  it("clearSessionContext resets currentCtx to undefined", () => {
    const runtime = createSubagentRuntime();
    runtime.setSessionContext({}, {});
    expect(runtime.currentCtx).toBeDefined();
    runtime.clearSessionContext();
    expect(runtime.currentCtx).toBeUndefined();
  });

  it("round-trip: set then clear returns to initial state", () => {
    const runtime = createSubagentRuntime();
    expect(runtime.currentCtx).toBeUndefined();
    runtime.setSessionContext({ id: 1 }, { id: 2 });
    expect(runtime.currentCtx).toEqual({ pi: { id: 1 }, ctx: { id: 2 } });
    runtime.clearSessionContext();
    expect(runtime.currentCtx).toBeUndefined();
  });
});

describe("SubagentRuntime widget delegation methods", () => {
  it("setUICtx delegates to widget.setUICtx", () => {
    const runtime = createSubagentRuntime();
    const stub = createWidgetStub();
    runtime.widget = stub;
    const ctx = { setStatus: vi.fn(), setWidget: vi.fn() };
    runtime.setUICtx(ctx);
    expect(stub.setUICtx).toHaveBeenCalledWith(ctx);
  });

  it("onTurnStart delegates to widget.onTurnStart", () => {
    const runtime = createSubagentRuntime();
    const stub = createWidgetStub();
    runtime.widget = stub;
    runtime.onTurnStart();
    expect(stub.onTurnStart).toHaveBeenCalledOnce();
  });

  it("markFinished delegates to widget.markFinished", () => {
    const runtime = createSubagentRuntime();
    const stub = createWidgetStub();
    runtime.widget = stub;
    runtime.markFinished("agent-42");
    expect(stub.markFinished).toHaveBeenCalledWith("agent-42");
  });

  it("updateWidget delegates to widget.update", () => {
    const runtime = createSubagentRuntime();
    const stub = createWidgetStub();
    runtime.widget = stub;
    runtime.updateWidget();
    expect(stub.update).toHaveBeenCalledOnce();
  });

  it("ensureTimer delegates to widget.ensureTimer", () => {
    const runtime = createSubagentRuntime();
    const stub = createWidgetStub();
    runtime.widget = stub;
    runtime.ensureTimer();
    expect(stub.ensureTimer).toHaveBeenCalledOnce();
  });

  it("all delegation methods no-op when widget is null", () => {
    const runtime = createSubagentRuntime();
    expect(runtime.widget).toBeNull();
    // None of these should throw
    runtime.setUICtx({ setStatus: vi.fn(), setWidget: vi.fn() });
    runtime.onTurnStart();
    runtime.markFinished("id");
    runtime.updateWidget();
    runtime.ensureTimer();
  });
});
