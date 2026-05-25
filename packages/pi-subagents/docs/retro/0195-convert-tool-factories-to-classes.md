---
issue: 195
issue_title: "Convert tool factories to classes"
---

# Retro: #195 — Convert tool factories to classes

## Stage: Planning (2026-05-24T12:00:00Z)

### Session summary

Produced a 5-step TDD plan converting `createAgentTool`, `createGetResultTool`, and `createSteerTool` to classes with constructor-injected dependencies.
Verified both prerequisites (#193, #194) are closed and their effects visible in the current source.
Designed narrow interfaces (`AgentToolRuntime`, `GetResultToolManager`, `SteerToolManager`, `SteerToolEvents`, etc.) that `SubagentRuntime`, `AgentManager`, and `NotificationManager` satisfy structurally.

### Observations

- The conversion is mechanical — no behavioral changes, just structural.
  Existing tests cover all paths; only test helpers need updating.
- `steerAgent` and `getAgentConversation` are pure functions that can be imported directly by the classes rather than injected — simplifies the constructor signature.
- `agentDir` doesn't fit neatly on any existing collaborator, so it remains a constructor param for `AgentTool`.
- The `AgentToolWidget` interface may become redundant once `AgentToolRuntime` replaces it as the type passed to `spawnBackground`/`runForeground`, but this is deferred to implementation.
- Ordered TDD steps from smallest (SteerTool) to largest (AgentTool) to build confidence incrementally.

## Stage: Implementation — TDD (2026-05-24T21:26:00Z)

### Session summary

Completed all 5 planned TDD cycles (SteerTool → GetResultTool → AgentTool → `index.ts` wiring → architecture doc).
All 854 tests pass; type check and lint clean.
Total: 5 commits across source + test files, plus 1 cleanup fix commit.

### Observations

- `steerAgent` was inlined as `session.steer(message)` directly in `SteerTool.execute()` rather than imported as a module function.
  This eliminated the dep entirely — the mock session's `steer` vi.fn() handles it in tests without `vi.mock`.
- The `verbose` test in `get-result-tool.test.ts` was upgraded to drive the real `getAgentConversation` function via `createMockSession({ messages: [...] })` overrides, making it a stronger integration test.
- `AgentToolWidget` was eliminated: `AgentToolRuntime` (a superset) replaced it, and `background-spawner` and `foreground-runner` already define their own narrow `BackgroundWidgetDeps`/`ForegroundWidgetDeps` interfaces.
- `createToolDeps()` changed shape from `AgentToolDeps` bag to `AgentToolFixture` (`{ manager, runtime, settings, registry, agentDir }`).
  This required updating `background-spawner.test.ts` and `foreground-runner.test.ts` (not listed in the plan) to destructure `{ manager, runtime }` instead of `{ manager, widget, agentActivity }`.
- Biome flagged an unused `import type { AgentSession }` in `get-result-tool.ts` (left by ESLint's cast removal in step 2) — caught by `pnpm run lint` and fixed in a separate commit.
- The `ReturnType<typeof vi.fn>` annotation on `makeNotifications()` in the get-result-tool test triggered a TypeScript error; fixed by removing the return type annotation entirely (per testing skill guidance).
