---
issue: 263
issue_title: "Extract worktree isolation to @gotgenes/pi-subagents-worktrees"
---

# Retro: #263 — Extract worktree isolation to @gotgenes/pi-subagents-worktrees

## Stage: Planning (2026-05-29T17:00:46Z)

### Session summary

Produced a cross-package plan (`docs/plans/0263-extract-worktrees-package.md`) for Phase 16 Step 3 of ADR 0002: create `@gotgenes/pi-subagents-worktrees` implementing the `WorkspaceProvider` seam (#262, already landed and wired provider-first in `Agent.run()`), then evict the legacy worktree path and the `isolation` axis from the core.
The plan has nine TDD cycles split into Track A (build the new package) and Track B (two `feat!` core-eviction commits), plus root-config registration and docs.

### Observations

- The `WorkspaceProvider`/`Workspace` seam already exists; #262 is closed and `Agent.run()` already consults a provider provider-first with a legacy `worktree` fallback.
  This issue is purely "build the consumer + delete the fallback," which is smaller than the issue text implies.
- Three design decisions were resolved via `ask_user`: (1) opt-in is **per-agent via package config** (a `worktreeAgents` list keyed off `WorkspacePrepareContext.agentType`), (2) worktree-creation failure **throws and fails the run** (preserves the old strict `WorktreeIsolation.setup()` semantics), (3) the provider registers **once at extension init** (not per-session), relying on Pi's deterministic `settings.json` load order.
- The user explicitly flagged two constraints mid-session: the new package must be added to `.pi/settings.json` like the others, and Pi's `settings.json` order is deterministic (first-listed loads first) — so the new package is listed **after** `pi-subagents` and registration-at-init is safe.
  Both are captured in the plan.
- This is the **first intra-repo `@gotgenes/*` package import** — the new package imports seam types + `getSubagentsService` from `@gotgenes/pi-subagents`.
  Plan wires it as `workspace:*` devDep + peerDep range; flagged in Risks since no existing package does this.
- `service.ts` already carried a comment that "#263 adds named re-exports when it imports them" — so Step 1 adds `Workspace`/context/result type re-exports (currently only `WorkspaceProvider` is named).
- Core eviction must be **two type-coherent commits**: removing the tool-facing `isolation` axis (`SpawnExecution`/`AgentInvocation` field removal breaks all downstream object literals at once), then deleting the legacy worktree wiring + modules. `AgentSpawnConfig.isolation` is left optional after Step 7 so Step 7 type-checks, then removed in Step 8.
- Label note: the issue carries `pkg:pi-permission-system` **and** `pkg:pi-subagents`, but the content does not touch the permission system.
  Treated as cross-package (new package + core + root config) and placed in top-level `docs/plans/`; the `pi-permission-system` label appears incongruent.
- Confirmed no regression for no-provider children: `agent-runner.ts` uses `effectiveCwd = options.context.cwd ?? snapshot.cwd`, so a `undefined` cwd already falls back to the parent cwd today.
