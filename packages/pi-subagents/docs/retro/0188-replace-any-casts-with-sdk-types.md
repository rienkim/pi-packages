---
issue: 188
issue_title: "refactor(pi-subagents): replace any casts with SDK types in extractText and SubscribableSession"
---

# Retro: #188 — Replace any casts with SDK types

## Stage: Planning (2026-05-24T20:04:58Z)

### Session summary

Produced a two-step refactoring plan for replacing `any` casts in `extractText` (with a `TextContent` type predicate) and `SubscribableSession` (with `AgentSessionEvent`).
Verified that both SDK types are already imported and used in adjacent files within the package.
Confirmed mock session compatibility via function parameter contravariance — no test changes expected.

### Observations

- The `extractText` parameter type stays `unknown[]` to avoid rippling through callers in `message-formatters.ts` that declare `content: unknown[]`.
  A future cleanup could tighten those caller signatures.
- `SubscribableSession` moves to `src/types.ts` as the shared location, matching existing cross-domain types there (`SubagentType`, `ThinkingLevel`, `ShellExec`).
- All three `eslint-disable` top-level comments (`context.ts`, `record-observer.ts`, `ui-observer.ts`) should be removable once the `any` casts are gone, since the SDK union's discriminated members cover the property access patterns.
- Risk: if `AgentSessionEvent` doesn't cover `assistantMessageEvent` in `ui-observer.ts`, the type checker will surface it immediately — the mitigation is to check the union members during implementation.

## Stage: Implementation — TDD (2026-05-24T20:17:38Z)

### Session summary

Completed both TDD steps from the plan.
Step 1 replaced the `any` filter/map chain in `extractText` with an `isTextContent` type predicate; the `??""` removal was required because `TextContent.text` is non-optional per the SDK type.
Step 2 moved `SubscribableSession` to `types.ts` typed with `AgentSessionEvent`, removed both duplicate local interfaces, and removed all three `eslint-disable` comments.
Test count: 902 → 901 (one test removed).

### Observations

- The `??` operator on `c.text` in `extractText` triggered `@typescript-eslint/no-unnecessary-condition` at commit time because `TextContent.text` is `string` (non-nullable); removing it was necessary, not just cosmetic.
- After typing the `record-observer` callback as `AgentSessionEvent`, five additional lint errors surfaced: `event.message?.role` (optional chain unnecessary since `MessageEndEvent.message` is required), `if (u)` guard (unnecessary since `AssistantMessage.usage` is required), and three `?? 0` guards on `input`/`output`/`cacheWrite` (all required `number` fields per `Usage` interface in the Pi source at `~/development/pi/pi/packages/ai/src/types.ts`).
- The test `"ignores message_end without usage"` was removed — it emitted a non-conforming event that the SDK types guarantee cannot occur at runtime.
- `ui-observer.ts` had one analogous fix: `event.assistantMessageEvent?.type` → `.type` (the field is required on `MessageUpdateEvent`).
- No test file changes were needed for `ui-observer.ts` — its existing tests all emit conforming events.
- The plan's contravariance reasoning about mock session compatibility was correct: `pnpm run check` passed without updating `MockSession.subscribe`.
