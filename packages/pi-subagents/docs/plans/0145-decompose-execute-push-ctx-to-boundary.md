---
issue: 145
issue_title: "Decompose execute and push ExtensionContext to the boundary (Phase 9, Step M)"
---

# Decompose execute and push ctx to the boundary

## Problem Statement

`agent-tool.ts` `execute` is ~140 lines mixing three concerns: boundary extraction (~5 lines reading `ctx`), config resolution (~60 lines unpacking `resolvedConfig` field by field), and dispatch (~80 lines building 14–16 field parameter bags for `spawnBackground` and `runForeground`).
The large parameter bags exist because config resolution happens inline instead of in a dedicated function.
Meanwhile, `ExtensionContext` is threaded from `execute` through `ForegroundParams.ctx` / `BackgroundParams.ctx` into `foreground-runner` and `background-spawner`, where the only thing consumed is `sessionManager.getSessionFile()` and `sessionManager.getSessionId()`.
`AgentManager.spawn()` and `spawnAndWait()` accept `ExtensionContext` directly and call `buildParentSnapshot(ctx)` internally — but this is already a pure boundary concern that belongs at the call site.

## Goals

- Extract config resolution into a pure function (`resolveSpawnConfig`) so `execute` becomes: extract ctx → resolve config → dispatch.
- Replace `ForegroundParams.ctx` and `BackgroundParams.ctx` with plain domain values (`parentSessionFile`, `parentSessionId`, `snapshot`).
- Change `AgentManager.spawn()` and `spawnAndWait()` to accept `ParentSnapshot` instead of `ExtensionContext`.
- Move `buildParentSnapshot(ctx)` calls to the two boundaries: `agent-tool.ts execute` and `service-adapter.ts`.
- Eliminate the `vi.mock("../src/parent-snapshot.js")` in `agent-manager.test.ts`.
- Apply the dependency bag convention: dissolve `ForegroundDeps`, `BackgroundDeps`, `AdapterDeps` (each ≤3 fields) into plain parameters.
- This is a breaking internal refactor — no public API changes.

## Non-Goals

- Narrowing menu handler ctx (Step N, #146) — deferred.
- Injecting text wrapping into ConversationViewer (Step O, #147) — unrelated track.
- Observation model consolidation (Step L, #144) — independent track.
- Changing the `SubagentsService` public API in `service.ts`.

## Background

### Relevant modules

| Module                        | Current role                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `tools/agent-tool.ts`         | `execute` callback — 140 lines, mixes boundary extraction, config resolution, dispatch           |
| `tools/foreground-runner.ts`  | `runForeground()` — receives 14-field `ForegroundParams` including `ctx` with `sessionManager`   |
| `tools/background-spawner.ts` | `spawnBackground()` — receives 14-field `BackgroundParams` including `ctx` with `sessionManager` |
| `agent-manager.ts`            | `spawn()` / `spawnAndWait()` accept `ExtensionContext`, call `buildParentSnapshot()` internally  |
| `parent-snapshot.ts`          | `buildParentSnapshot(ctx)` — pure function capturing `ParentSnapshot` from ctx                   |
| `service-adapter.ts`          | Cross-extension boundary — calls `manager.spawn(session.ctx, ...)`                               |
| `invocation-config.ts`        | `resolveAgentInvocationConfig()` — merges agent config with tool params                          |
| `model-resolver.ts`           | `resolveInvocationModel()` — resolves model strings to model instances                           |

### Constraints from AGENTS.md

- Keep modules focused and composable (one concern per file).
- Prefer explicit configuration over hidden behavior.
- Keep Pi SDK imports out of business-logic modules.
- Business logic should be pure functions — keep IO at the edges.

### Phase 9 context

This is Step M of Phase 9.
It has no blockers and blocks Step N (#146), which narrows menu handler ctx.
After this step, `ExtensionContext` appears only at true SDK/extension boundaries: `execute` callback, `service-adapter.ts`, `index.ts`, and menu handlers.

## Design Overview

### Part 1: Extract config resolution

A new pure function `resolveSpawnConfig` encapsulates all the config resolution logic currently inline in `execute`.
It accepts raw tool params, registry, model info, and settings, and returns a single `ResolvedSpawnConfig`:

```typescript
interface ModelInfo {
  parentModel: { id: string; name?: string } | undefined;
  modelRegistry: unknown;
}

interface ResolvedSpawnConfig {
  subagentType: string;
  fellBack: boolean;
  displayName: string;
  model: Model<any> | undefined;
  effectiveMaxTurns: number | undefined;
  thinking: ThinkingLevel | undefined;
  inheritContext: boolean;
  runInBackground: boolean;
  isolated: boolean;
  isolation: IsolationMode | undefined;
  modelName: string | undefined;
  agentInvocation: AgentInvocation;
  agentTags: string[];
  detailBase: Pick<AgentDetails, "displayName" | "description" | "subagentType" | "modelName" | "tags">;
}

function resolveSpawnConfig(
  params: Record<string, unknown>,
  registry: AgentTypeRegistry,
  modelInfo: ModelInfo,
  settings: { defaultMaxTurns: number | undefined },
): ResolvedSpawnConfig | { error: string };
```

After extraction, `execute` becomes ~30 lines:

```typescript
// 1. Extract boundary values from ctx
const ui = ctx.ui;
const snapshot = buildParentSnapshot(ctx, resolved.inheritContext);
const parentSessionFile = ctx.sessionManager.getSessionFile();
const parentSessionId = ctx.sessionManager.getSessionId();

// 2. Resolve config (pure)
const resolved = resolveSpawnConfig(params, deps.registry, ...);
if ("error" in resolved) return textResult(resolved.error);

// 3. Dispatch
if (params.resume) return handleResume(...);
if (resolved.runInBackground) return spawnBackground(...);
return runForeground(...);
```

### Part 2: Push ctx to the boundary

After Part 1, `execute` extracts all needed values from `ctx` upfront.
The downstream functions receive only domain values:

- `runForeground` and `spawnBackground` receive `snapshot: ParentSnapshot`, `parentSessionFile: string`, `parentSessionId: string` instead of `ctx`.
- `AgentManager.spawn()` and `spawnAndWait()` accept `ParentSnapshot` instead of `ExtensionContext`.
  The internal `buildParentSnapshot` call moves to the two call sites: `agent-tool.ts execute` and `service-adapter.ts`.
- `service-adapter.ts` calls `buildParentSnapshot(session.ctx, ...)` at its boundary before delegating to `manager.spawn(snapshot, ...)`.

Consumer call-site verification (agent-tool.ts execute):

```typescript
const snapshot = buildParentSnapshot(ctx, resolved.inheritContext);
const parentSessionFile = ctx.sessionManager.getSessionFile();
const parentSessionId = ctx.sessionManager.getSessionId();

// Background dispatch — no ctx passed downstream
spawnBackground(deps.manager, deps.widget, deps.agentActivity, {
  snapshot, parentSessionFile, parentSessionId,
  ...resolvedFields,
});
```

Consumer call-site verification (service-adapter.ts):

```typescript
spawn(type, prompt, options?) {
  const session = deps.getCtx();
  const snapshot = buildParentSnapshot(session.ctx, options?.inheritContext);
  return manager.spawn(snapshot, type, prompt, { ... });
}
```

### Part 3: Dissolve small dependency bags

Per the dependency bag convention, interfaces with ≤5 fields that are used at a single call site become plain parameters:

- `ForegroundDeps` (3 fields: `manager`, `widget`, `agentActivity`) → plain parameters on `runForeground`.
- `BackgroundDeps` (3 fields: `manager`, `widget`, `agentActivity`) → plain parameters on `spawnBackground`.
- `AdapterDeps` (4 fields: `manager`, `resolveModel`, `getCtx`, `getModelRegistry`) → plain parameters on `createSubagentsService`.
- `AgentToolDeps` (6 fields) → destructured in the `createAgentTool` signature; the interface stays as a named type for the test factory.

The narrow `*ManagerDeps` and `*WidgetDeps` interfaces stay — they define the contract each function needs from its collaborators.

### Part 4: Simplify ForegroundParams and BackgroundParams

With `ctx` gone and `resolveSpawnConfig` producing a single config object, the 14-field params bags shrink significantly.
Both receive `ResolvedSpawnConfig` plus the few dispatch-specific fields:

- `ForegroundParams`: `resolvedConfig`, `snapshot`, `parentSessionFile`, `parentSessionId`, `rawType`, `fellBack` (6 fields).
- `BackgroundParams`: `resolvedConfig`, `snapshot`, `parentSessionFile`, `parentSessionId`, `toolCallId`, `displayName` (6 fields).

Fields like `model`, `effectiveMaxTurns`, `isolated`, `inheritContext`, `thinking`, `isolation`, `agentInvocation`, `detailBase`, `subagentType`, `prompt`, `description` are all accessed via `resolvedConfig.*` instead of being individually spread.

## Module-Level Changes

### New file: `src/tools/spawn-config.ts`

- `ResolvedSpawnConfig` interface.
- `ModelInfo` interface.
- `resolveSpawnConfig()` pure function.
- Extracts logic from `execute`: type resolution, invocation config merge, model resolution, max-turns normalization, tag building, detail-base construction.

### Modified: `src/tools/agent-tool.ts`

- `execute` shrinks from ~140 to ~30 lines.
- Imports and calls `resolveSpawnConfig` from `spawn-config.ts`.
- Calls `buildParentSnapshot(ctx, ...)` at the boundary.
- Extracts `parentSessionFile` and `parentSessionId` from `ctx.sessionManager`.
- Passes domain values (not `ctx`) to `runForeground` / `spawnBackground`.
- `AgentToolDeps` stays as a named type (used by test factory) but its fields are destructured in the `createAgentTool` signature.
- `AgentToolManager.spawn` and `spawnAndWait` signatures change from `ctx: ExtensionContext` to `snapshot: ParentSnapshot`.

### Modified: `src/tools/foreground-runner.ts`

- `ForegroundDeps` interface removed — `runForeground` accepts `manager`, `widget`, `agentActivity` as plain parameters.
- `ForegroundParams.ctx` removed — replaced by `parentSessionFile: string`, `parentSessionId: string`.
- `ForegroundManagerDeps.spawnAndWait` signature changes from `ctx: any` to `snapshot: ParentSnapshot`.
- `ForegroundParams` fields that move into `ResolvedSpawnConfig` are removed.

### Modified: `src/tools/background-spawner.ts`

- `BackgroundDeps` interface removed — `spawnBackground` accepts `manager`, `widget`, `agentActivity` as plain parameters.
- `BackgroundParams.ctx` removed — replaced by `parentSessionFile: string`, `parentSessionId: string`.
- `BackgroundManagerDeps.spawn` signature changes from `ctx: any` to `snapshot: ParentSnapshot`.
- `BackgroundParams` fields that move into `ResolvedSpawnConfig` are removed.

### Modified: `src/agent-manager.ts`

- `spawn()` signature changes from `ctx: ExtensionContext` to `snapshot: ParentSnapshot`.
- `spawnAndWait()` signature changes from `ctx: ExtensionContext` to `snapshot: ParentSnapshot`.
- Internal `buildParentSnapshot(ctx, ...)` call removed — `snapshot` arrives pre-built.
- Import of `ExtensionContext` removed.
- Import of `buildParentSnapshot` removed.
- `SpawnArgs.snapshot` stays unchanged (already uses `ParentSnapshot`).

### Modified: `src/service-adapter.ts`

- `AdapterDeps` interface removed — `createSubagentsService` accepts `manager`, `resolveModel`, `getCtx`, `getModelRegistry` as plain parameters.
- `AgentManagerLike.spawn` signature changes from `ctx: unknown` to `snapshot: ParentSnapshot`.
- `spawn()` method calls `buildParentSnapshot(session.ctx, options?.inheritContext)` before delegating to `manager.spawn(snapshot, ...)`.
- Adds import of `buildParentSnapshot` and `ParentSnapshot`.

### Modified: `src/index.ts`

- Wiring call site for `createSubagentsService` changes from passing `{ manager, resolveModel, getCtx, getModelRegistry }` to passing the four values as plain arguments.

## Test Impact Analysis

### New unit tests enabled

- `spawn-config.test.ts` — pure-function tests for `resolveSpawnConfig` covering type resolution, model resolution, fallback, max-turns normalization, tag generation, detail-base construction.
  These test paths were previously buried inside the `execute` integration, making them hard to isolate.

### Existing tests that simplify

- `agent-manager.test.ts` — the `vi.mock("../src/parent-snapshot.js")` block is removed.
  All tests pass `mockSnapshot` (a plain `ParentSnapshot` object) directly instead of `mockCtx`.
  No mock-module overhead.
- `foreground-runner.test.ts` — `makeCtx()` helper removed.
  `makeParams()` uses plain strings for `parentSessionFile` / `parentSessionId` instead of a `ctx` object with `sessionManager` mock methods.
- `background-spawner.test.ts` — same as foreground: `makeCtx()` helper removed, plain strings replace `ctx.sessionManager` mocks.
- `service-adapter.test.ts` — adapter test setup simplifies from constructing `AdapterDeps` bag to passing plain parameters.

### Existing tests that stay

- `agent-tool.test.ts` — exercises the full `execute` flow including `ctx` extraction at the boundary.
  These integration-level tests remain but their `makeCtx()` stays since `execute` still receives `ctx` from the SDK.
- `parent-snapshot.test.ts` — unchanged; `buildParentSnapshot` is still a standalone pure function.

## TDD Order

### Step 1: Extract resolveSpawnConfig

1. Red: write `spawn-config.test.ts` testing `resolveSpawnConfig` — type resolution, model resolution error, fallback to general-purpose, max-turns normalization, tag building.
   Green: implement `resolveSpawnConfig` in `spawn-config.ts`.
   Commit: `feat: extract resolveSpawnConfig pure function (#145)`

2. Red: update `agent-tool.test.ts` to account for `execute` calling `resolveSpawnConfig` (existing tests pass as-is since behavior is preserved).
   Green: rewire `execute` to call `resolveSpawnConfig`, removing inline config resolution.
   Commit: `refactor: use resolveSpawnConfig in execute (#145)`

### Step 2: Push ctx out of AgentManager

3. Red: update `agent-manager.test.ts` — replace `mockCtx` with a plain `ParentSnapshot` object, remove `vi.mock("../src/parent-snapshot.js")`.
   Green: change `AgentManager.spawn()` and `spawnAndWait()` to accept `ParentSnapshot` instead of `ExtensionContext`.
   Move `buildParentSnapshot` call to `agent-tool.ts execute` and `service-adapter.ts`.
   Commit: `refactor: AgentManager accepts ParentSnapshot instead of ExtensionContext (#145)`

### Step 3: Push ctx out of foreground-runner and background-spawner

4. Red: update `foreground-runner.test.ts` — remove `makeCtx()`, replace `ForegroundParams.ctx` with `parentSessionFile` / `parentSessionId` strings.
   Green: change `ForegroundParams` to use plain domain values, update `runForeground` accordingly.
   Commit: `refactor: foreground-runner receives domain values instead of ctx (#145)`

5. Red: update `background-spawner.test.ts` — remove `makeCtx()`, replace `BackgroundParams.ctx` with `parentSessionFile` / `parentSessionId` strings.
   Green: change `BackgroundParams` to use plain domain values, update `spawnBackground` accordingly.
   Commit: `refactor: background-spawner receives domain values instead of ctx (#145)`

### Step 4: Shrink params bags with ResolvedSpawnConfig

6. Red: update `foreground-runner.test.ts` `makeParams()` to use `ResolvedSpawnConfig` fields.
   Green: change `ForegroundParams` to carry `ResolvedSpawnConfig` instead of 10+ individual fields.
   Update `agent-tool.ts` dispatch to pass the config through.
   Commit: `refactor: ForegroundParams carries ResolvedSpawnConfig (#145)`

7. Red: update `background-spawner.test.ts` `makeParams()` to use `ResolvedSpawnConfig` fields.
   Green: change `BackgroundParams` to carry `ResolvedSpawnConfig` instead of 10+ individual fields.
   Update `agent-tool.ts` dispatch to pass the config through.
   Commit: `refactor: BackgroundParams carries ResolvedSpawnConfig (#145)`

### Step 5: Dissolve small dependency bags

8. Red: update `foreground-runner.test.ts` calls to pass `manager`, `widget`, `agentActivity` as plain args.
   Green: remove `ForegroundDeps` interface, change `runForeground` signature to plain parameters.
   Commit: `refactor: dissolve ForegroundDeps into plain parameters (#145)`

9. Red: update `background-spawner.test.ts` calls to pass `manager`, `widget`, `agentActivity` as plain args.
   Green: remove `BackgroundDeps` interface, change `spawnBackground` signature to plain parameters.
   Commit: `refactor: dissolve BackgroundDeps into plain parameters (#145)`

10. Red: update `service-adapter.test.ts` to pass plain parameters instead of `AdapterDeps` bag.
    Green: remove `AdapterDeps` interface, change `createSubagentsService` signature to plain parameters.
    Update `index.ts` wiring call site.
    Commit: `refactor: dissolve AdapterDeps into plain parameters (#145)`

11. Refactor: destructure `AgentToolDeps` in `createAgentTool` signature (keep the named type for test factory).
    Update `agent-tool.ts`.
    Commit: `refactor: destructure AgentToolDeps in createAgentTool (#145)`

### Step 6: Final verification

12. Run full test suite (`pnpm vitest run`) and type check (`pnpm run check`).
    Commit: `test: verify full suite passes after decompose-execute refactor (#145)`

## Risks and Mitigations

| Risk                                                                                          | Mitigation                                                                                                            |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Wide blast radius — touches 7+ source files and 5+ test files                                 | Incremental TDD steps; each commit leaves the repo green                                                              |
| `service-adapter.ts` now imports `buildParentSnapshot` — new coupling                         | Acceptable: the adapter is already a boundary module that bridges `ExtensionContext` to domain types                  |
| `ResolvedSpawnConfig` could become a new "god object"                                         | It is a pure data return from a single function; consumers destructure what they need                                 |
| `ForegroundParams` / `BackgroundParams` still exist as interfaces                             | They carry dispatch-specific concerns (rawType, fellBack, toolCallId) that don't belong in the pure config resolution |
| Steps 6–7 (shrink params) may conflict if the interface shape changes in an intermediate step | Both steps use the same `ResolvedSpawnConfig` type introduced in step 1; they are independent of each other           |

## Open Questions

- The exact boundary between fields that stay in `ForegroundParams` / `BackgroundParams` vs. fields that move into `ResolvedSpawnConfig` may shift during implementation.
  The guiding principle: if the field is computed during config resolution, it belongs in `ResolvedSpawnConfig`; if it is dispatch-specific (e.g., `toolCallId`, `signal`, `onUpdate`), it stays in the params type.
- Whether `AgentToolDeps` should eventually be dissolved into plain parameters (it has 6 fields, at the threshold).
  This plan destructures it but keeps the named type for the test factory.
  A follow-up could remove the named type if the factory pattern changes.
