import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

// We'll test the tool's execute function directly. Since the extension registers
// tools via pi.registerTool, we capture the registered tool definitions.

function captureTools(factory: (pi: ExtensionAPI) => void) {
  const tools = new Map<
    string,
    { execute: (...args: unknown[]) => Promise<unknown> }
  >();
  const pi = {
    registerTool: vi.fn(
      (tool: {
        name: string;
        execute: (...args: unknown[]) => Promise<unknown>;
      }) => {
        tools.set(tool.name, tool);
      },
    ),
  } as unknown as ExtensionAPI;
  factory(pi);
  return tools;
}

function makeCtx(entries: unknown[], sessionFile?: string): ExtensionContext {
  return {
    sessionManager: {
      getEntries: () => entries,
      getSessionFile: () => sessionFile,
    },
  } as unknown as ExtensionContext;
}

describe("read_session tool", () => {
  it("returns all session entries as JSON", async () => {
    // Dynamically import to get the latest version
    const { default: sessionTools } = await import("#src/index");
    const tools = captureTools(sessionTools);
    const tool = tools.get("read_session");
    expect(tool).toBeDefined();

    const entries = [
      {
        type: "message",
        id: "1",
        parentId: null,
        timestamp: "2026-01-01T00:00:00Z",
        message: { role: "user", content: "hi" },
      },
      {
        type: "message",
        id: "2",
        parentId: "1",
        timestamp: "2026-01-01T00:00:01Z",
        message: { role: "assistant", content: [] },
      },
    ];

    const ctx = makeCtx(entries);
    const result = await tool!.execute("tc1", {}, undefined, undefined, ctx);
    const text = (result as { content: { text: string }[] }).content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed).toEqual(entries);
  });

  it("filters entries by type", async () => {
    const { default: sessionTools } = await import("#src/index");
    const tools = captureTools(sessionTools);
    const tool = tools.get("read_session")!;

    const entries = [
      { type: "message", id: "1", parentId: null, timestamp: "t1" },
      { type: "compaction", id: "2", parentId: "1", timestamp: "t2" },
      { type: "message", id: "3", parentId: "2", timestamp: "t3" },
    ];

    const ctx = makeCtx(entries);
    const result = await tool.execute(
      "tc1",
      { types: ["compaction"] },
      undefined,
      undefined,
      ctx,
    );
    const text = (result as { content: { text: string }[] }).content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed).toEqual([entries[1]]);
  });

  it("limits to the most recent N entries", async () => {
    const { default: sessionTools } = await import("#src/index");
    const tools = captureTools(sessionTools);
    const tool = tools.get("read_session")!;

    const entries = [
      { type: "message", id: "1", parentId: null, timestamp: "t1" },
      { type: "message", id: "2", parentId: "1", timestamp: "t2" },
      { type: "message", id: "3", parentId: "2", timestamp: "t3" },
    ];

    const ctx = makeCtx(entries);
    const result = await tool.execute(
      "tc1",
      { limit: 2 },
      undefined,
      undefined,
      ctx,
    );
    const text = (result as { content: { text: string }[] }).content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed).toEqual([entries[1], entries[2]]);
  });

  it("combines type filter and limit", async () => {
    const { default: sessionTools } = await import("#src/index");
    const tools = captureTools(sessionTools);
    const tool = tools.get("read_session")!;

    const entries = [
      { type: "message", id: "1", parentId: null, timestamp: "t1" },
      { type: "compaction", id: "2", parentId: "1", timestamp: "t2" },
      { type: "message", id: "3", parentId: "2", timestamp: "t3" },
      { type: "message", id: "4", parentId: "3", timestamp: "t4" },
    ];

    const ctx = makeCtx(entries);
    const result = await tool.execute(
      "tc1",
      { types: ["message"], limit: 1 },
      undefined,
      undefined,
      ctx,
    );
    const text = (result as { content: { text: string }[] }).content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed).toEqual([entries[3]]);
  });

  it("returns empty array when no entries match the filter", async () => {
    const { default: sessionTools } = await import("#src/index");
    const tools = captureTools(sessionTools);
    const tool = tools.get("read_session")!;

    const ctx = makeCtx([
      { type: "message", id: "1", parentId: null, timestamp: "t1" },
    ]);
    const result = await tool.execute(
      "tc1",
      { types: ["compaction"] },
      undefined,
      undefined,
      ctx,
    );
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(JSON.parse(text)).toEqual([]);
  });
});
