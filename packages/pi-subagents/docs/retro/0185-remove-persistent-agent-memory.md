---
issue: 185
issue_title: "pi-subagents: Remove persistent agent memory feature"
---

# Retro: #185 — pi-subagents: Remove persistent agent memory feature

## Stage: Planning (2026-05-24T20:46:56Z)

### Session summary

Traced all memory-related code across 9 source files, 5 test files, and the architecture doc.
Produced a 5-step TDD plan: extract shared utilities (`isSymlink`, `isUnsafeName`, `safeReadFile`) to `safe-fs.ts`, then remove memory consumers (session assembly, config, UI), then delete the module, then update docs.

### Observations

- The three utility functions in `memory.ts` are the only complication — `skill-loader.ts` imports them independently of memory.
  Extracting to `src/session/safe-fs.ts` keeps them co-located with their sole remaining consumer.
- The removal is consumers-first, declaration-last: session-config and prompts lose their memory logic before `MemoryScope` is removed from `types.ts`, avoiding intermediate type errors.
- No ambiguous design choices — the issue scope section is precise about what to remove and what to extract.
- Memory field in custom agent frontmatter will silently become a no-op (ignored by the YAML parser) — no user-facing error, just loss of the feature.
- The `AssemblerIO` interface shrinks from 4 fields to 2 after removal, which is a welcome simplification.
