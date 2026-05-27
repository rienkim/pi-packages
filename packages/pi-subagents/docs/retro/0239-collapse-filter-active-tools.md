---
issue: 239
issue_title: "Collapse filterActiveTools to recursion guard (Phase 14, Step 3)"
---

# Retro: #239 — Collapse filterActiveTools to recursion guard

## Stage: Planning (2026-05-27T20:00:00Z)

### Session summary

Produced a 3-step TDD plan to flatten `SessionConfig.toolFilter` into top-level `toolNames` and `extensions` fields, simplify `filterActiveTools` to a one-liner recursion guard, remove the pre-bind filter call, and update architecture docs.
Both dependencies (#237, #238) are confirmed closed.

### Observations

- The `builtinToolNameSet` membership check in `filterActiveTools` is fully dead code — both branches return `true` after #238 removed the `string[]` extensions path.
- `ToolFilterConfig` is only imported by `agent-runner.ts` and never referenced in test files, so deletion is clean.
- The pre-bind filter call is safe to remove because `EXCLUDED_TOOL_NAMES` tools (`subagent`, `get_subagent_result`, `steer_subagent`) are registered by this extension during `bindExtensions`, not before — they cannot appear in the pre-bind active set.
- The `agent-runner-extension-tools.test.ts` file has 4 tests; 1 becomes structurally impossible (pre-bind/post-bind ordering) and the remaining 3 need assertion index adjustments (`calls[1]` → `calls[0]`).
- `SessionConfig` is internal-only (not package-exported), so flattening has no external API impact.

## Stage: Implementation — TDD (2026-05-27T22:00:00Z)

### Session summary

Completed all 3 TDD cycles: (1) flattened `SessionConfig` and deleted `ToolFilterConfig`, (2) simplified `filterActiveTools` to a one-liner and removed the pre-bind filter call, (3) updated architecture docs to mark Phase 14 Step 3 complete.
Test count held at 977 (no net change — the extension-tools test file was rewritten, removing 1 test and updating 3 others while keeping the same total count).
A follow-up skill maintenance commit updated `.pi/skills/package-pi-subagents/SKILL.md` to remove stale Patch 2 references.

### Observations

- The plan's step order (SessionConfig first → expected compile errors in `agent-runner.ts` → green after runner update) worked exactly as designed with no surprises.
- `agent-runner.test.ts` needed no changes — the default test config has `extensions: false`, so the filter call never ran in those tests.
- Pre-completion reviewer returned **WARN** for stale `package-pi-subagents` skill content: the "Patch 2 scheduled for removal" note and the `// Patch 2 (RepOne` grep instruction were both stale after #239 completion.
  Fixed immediately as a follow-up `docs:` commit before writing retro notes.
- `pnpm fallow dead-code` passed with 0 issues — no orphaned exports left behind.
