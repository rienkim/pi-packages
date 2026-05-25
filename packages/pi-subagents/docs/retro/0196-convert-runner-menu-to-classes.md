---
issue: 196
issue_title: "Convert AgentRunner and AgentsMenuHandler to classes, simplify index.ts"
---

# Retro: #196 — Convert AgentRunner and AgentsMenuHandler to classes, simplify index.ts

## Stage: Planning (2026-05-25T14:35:46Z)

### Session summary

Produced a 6-step TDD plan covering the final two closure-factory-to-class conversions (`createAgentRunner` → `ConcreteAgentRunner`, `createAgentsMenuHandler` → `AgentsMenuHandler`) and the subsequent `index.ts` simplification.
Confirmed that `AgentManager` structurally satisfies `AgentMenuManager`, enabling direct pass-through without adapter closures.

### Observations

- The issue's proposed `AgentsMenuHandler` constructor omits `agentActivity`, but the class needs it for `viewAgentConversation`.
  Plan includes it as a constructor param — minimal deviation from the issue.
- `getModelLabel` can be internalized into `AgentsMenuHandler` since it only uses two pure imported functions (`resolveModel`, `getModelLabelFromConfig`) plus the registry (already a constructor param).
  This eliminates a 7-line closure from `index.ts`.
- Tests for `agent-runner` call `runAgent`/`resumeAgent` directly — no test uses `createAgentRunner`, so the runner conversion has zero test impact.
- The `agent-menu.test.ts` file is 215 lines and needs call-site updates (factory → class constructor + `.handle()`), but no logic changes.
- After both conversions, `index.ts` loses ~5 imports and ~4 adapter closures.
  The remaining ~15 closures are structural (event registrations, SDK factory callbacks) and cannot be eliminated.

## Stage: Implementation — TDD (2026-05-25T14:56:11Z)

### Session summary

Completed all 6 plan steps (collapsed into 5 commits: steps 3 and 5 merged).
Baseline was 854 tests across 53 files; final suite is 856 tests across 54 files (+2 tests, +1 file for `concrete-agent-runner.test.ts`).
All type-check, lint, and dead-code gates pass clean.

### Observations

- Plan steps 3 and 5 had to be merged into a single commit: removing `createAgentsMenuHandler` immediately broke `index.ts` imports, so the `index.ts` update could not wait for a separate commit.
  This is a known coupling when a factory's only call site is in `index.ts`.
- The `AgentsMenuHandler` class constructor includes `agentActivity` as planned (the issue's proposed signature omitted it; the plan's deviation was correct).
- `getModelLabel` internalization was clean: `resolveModel` and `getModelLabelFromConfig` are pure functions the class imports directly.
- `AgentManager` structurally satisfies `AgentMenuManager` with no adapter closures — confirmed by `pnpm run check` passing immediately.
- The `agent-menu.test.ts` refactor replaced `Partial<AgentMenuDeps>` overrides with a `makeHandler(opts)` helper that returns both the handler and collaborator stubs, which is cleaner for assertion.
- `rumdl` emitted 3 warnings in `pnpm run lint` — these are pre-existing and unrelated to this change (lint passes for markdown linting, the warnings are from biome/eslint steps that auto-fixed nothing).
