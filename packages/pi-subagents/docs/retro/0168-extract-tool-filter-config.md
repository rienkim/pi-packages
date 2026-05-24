---
issue: 168
issue_title: "refactor(pi-subagents): extract ToolFilterConfig from SessionConfig (11 fields)"
---

# Retro: #168 — extract ToolFilterConfig from SessionConfig

## Stage: Planning (2026-05-24T19:00:00Z)

### Session summary

Produced a 2-step plan to extract `ToolFilterConfig` (grouping `toolNames`, `disallowedSet`, `extensions`) from `SessionConfig` and update `filterActiveTools` to accept the named type.
The change is a pure internal refactoring — `SessionConfig` is not exported from the package.

### Observations

- The issue says "11 fields" but `SessionConfig` currently has 10 — likely a minor count discrepancy from when the issue was filed.
  The extraction still reduces top-level fields from 10 to 8.
- `toolNames` serves dual duty: it's both the session-creation tool list and the `filterActiveTools` allowlist reference.
  Nesting it under `toolFilter` is still correct since both uses originate from the same assembled config.
- `agent-runner-extension-tools.test.ts` exercises tool filtering end-to-end via `runAgent` and never references `SessionConfig` fields directly — it serves as a zero-change regression canary for this refactoring.
- The plan has only 2 TDD steps because the refactoring is mechanical and behavior-preserving.
  Step 1 handles the interface change + assembler + tests; step 2 handles the consumer (`filterActiveTools` + `runAgent`).
