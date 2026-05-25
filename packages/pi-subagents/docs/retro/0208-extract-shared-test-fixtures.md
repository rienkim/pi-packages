---
issue: 208
issue_title: "Extract shared test fixtures to reduce test duplication"
---

# Retro: #208 — Extract shared test fixtures to reduce test duplication

## Stage: Planning (2026-05-25T20:00:00Z)

### Session summary

Analyzed the three heaviest test clone families identified by fallow and designed a 10-step TDD plan to extract shared factories into `test/helpers/`.
Decided to follow the existing `test/helpers/` convention rather than the `test/fixtures/` directory mentioned in the issue and architecture doc.

### Observations

- Issue #131 (closed) already extracted `createMockSession`, `createToolDeps`, and `createTestRecord` — this issue targets the remaining duplication.
- The `createRunnerIO` factory in `agent-runner.test.ts` and `agent-runner-extension-tools.test.ts` includes stale `buildMemoryBlock` and `buildReadOnlyMemoryBlock` stubs that no longer match the `AssemblerIO` interface — the shared factory will clean these up as a side benefit.
- Session mock factories in the runner tests are structurally specialized (each serves a different test purpose) and were explicitly scoped as non-goals — extracting them would create a confusing multi-mode factory.
- The `agent-runner-extension-tools.test.ts` uses a mutable `agentConfigMock.current` pattern that doesn't fit into a shared static factory — only `createRunnerIO` is shared from that file.
- `STUB_SNAPSHOT` from `stub-ctx.ts` can replace all 5 local `ParentSnapshot` definitions — verified no test asserts on the specific field values.
- The `agent-manager.test.ts` internal duplication (~42 repetitive spawn calls) is best handled with local `spawnBg()`/`spawnFg()` helpers rather than cross-file extraction.
