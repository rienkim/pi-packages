---
issue: 194
issue_title: "Align tool interfaces for structural typing"
---

# Retro: #194 — Align tool interfaces for structural typing

## Stage: Planning (2026-05-24T12:00:00Z)

### Session summary

Produced an implementation plan for three targeted alignment changes: moving `getMaxConcurrent` off manager interfaces to the settings accessor, renaming `SubagentRuntime.updateWidget()` → `update()`, and removing the dead `getToolCallName` re-export.
The plan includes a 4-step TDD order with type-check gates after each refactoring step.

### Observations

- Issue #193 (Layer 1) is already closed/implemented, confirming this layer can proceed immediately.
- The `background-spawner.ts` module is the only consumer of `getMaxConcurrent` — grep confirms no other call sites beyond `agent-tool.ts`'s interface definition.
- The `NotificationManager` constructor takes `updateWidget` as a positional callback parameter name — this does NOT need renaming (it's not a structural interface member).
- The rename from `updateWidget` → `update` is safe because the `WidgetLike` interface in `runtime.ts` already uses `update()` — no naming conflict within the class.
- All three changes are independent of each other and could be committed in any order, but the plan sequences them for clean `pnpm run check` passes at each step.
