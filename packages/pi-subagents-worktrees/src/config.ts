/**
 * config.ts — Per-agent opt-in for git worktree isolation.
 *
 * Worktrees are opt-in by agent type: an agent runs in a worktree only when its
 * type appears in `worktreeAgents`. Config is read from a global file
 * (`<agentDir>/subagents-worktrees.json`) merged under a project file
 * (`<cwd>/.pi/subagents-worktrees.json`, which overrides global).
 * Missing files are silent; a malformed file warns and falls back to empty.
 *
 * Mirrors the load/sanitize pattern in pi-subagents' settings.ts.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface WorktreesConfig {
  /** Agent-type names that run in a git worktree. Empty → no children isolated. */
  worktreeAgents: string[];
}

const CONFIG_FILENAME = "subagents-worktrees.json";

function globalPath(agentDir: string): string {
  return join(agentDir, CONFIG_FILENAME);
}

function projectPath(cwd: string): string {
  return join(cwd, ".pi", CONFIG_FILENAME);
}

/** Drop fields that don't match the expected shape. Silent — garbage becomes absent. */
function sanitize(raw: unknown): Partial<WorktreesConfig> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<WorktreesConfig> = {};
  if (
    Array.isArray(r.worktreeAgents) &&
    r.worktreeAgents.every((x) => typeof x === "string")
  ) {
    out.worktreeAgents = r.worktreeAgents;
  }
  return out;
}

/**
 * Read a config file. Missing file is silent (returns `{}`). A file that exists
 * but can't be parsed warns to stderr (so users aren't silently reverted) and
 * still returns `{}` so startup proceeds.
 */
function readConfigFile(path: string): Partial<WorktreesConfig> {
  if (!existsSync(path)) return {};
  try {
    return sanitize(JSON.parse(readFileSync(path, "utf-8")));
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[pi-subagents-worktrees] Ignoring malformed config at ${path}: ${reason}`,
    );
    return {};
  }
}

/** Load merged config: global provides defaults, project overrides. */
export function loadWorktreesConfig(
  agentDir: string,
  cwd: string,
): WorktreesConfig {
  const merged = {
    ...readConfigFile(globalPath(agentDir)),
    ...readConfigFile(projectPath(cwd)),
  };
  return { worktreeAgents: merged.worktreeAgents ?? [] };
}
