/**
 * runtime.ts — SubagentRuntime: composition root for all mutable extension state.
 *
 * Eliminates module-scope state in agent-runner.ts and closure-scoped state
 * in index.ts by consolidating them into a single, testable object.
 * Follows the same pattern as pi-permission-system's ExtensionRuntime.
 */

import type { AgentActivity, AgentWidget } from "./ui/agent-widget.js";

/**
 * Narrow config subset read by AgentManager when constructing RunOptions.
 * Kept separate so callers can satisfy it without depending on the full runtime.
 */
export interface RunConfig {
  readonly defaultMaxTurns: number | undefined;
  readonly graceTurns: number;
}

/**
 * All mutable state owned by the pi-subagents extension.
 *
 * Created once inside `piSubagentsExtension()` via `createSubagentRuntime()`.
 * Tests construct a fresh runtime per test for full isolation.
 */
export interface SubagentRuntime {
  // ── Execution config (was module-scope in agent-runner.ts) ──────────────
  /** Default max turns for all agents. undefined = unlimited. */
  defaultMaxTurns: number | undefined;
  /** Additional turns allowed after the soft-limit steer message. */
  graceTurns: number;

  // ── Session state (was closure-scoped in index.ts) ───────────────────────
  /** Active Pi session context — set on session_start, cleared on session_shutdown. */
  currentCtx: { pi: unknown; ctx: unknown } | undefined;
  /**
   * Per-agent live activity state shared across the notification system,
   * widget, and tool handlers. The Map itself is never replaced.
   */
  readonly agentActivity: Map<string, AgentActivity>;
  /**
   * Persistent widget reference. Null until constructed after AgentManager.
   * Notification closures use `runtime.widget!` — safe because agents always
   * complete after widget construction.
   */
  widget: AgentWidget | null;
}

/**
 * Create a fully-initialized SubagentRuntime with default values.
 *
 * Call once at extension startup; pass the result to factories and handlers.
 */
export function createSubagentRuntime(): SubagentRuntime {
  return {
    defaultMaxTurns: undefined,
    graceTurns: 5,
    currentCtx: undefined,
    agentActivity: new Map(),
    widget: null,
  };
}
