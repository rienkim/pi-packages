---
issue: 264
issue_title: "Remove isolated / extensions:false / noSkills from core"
---

# Retro: #264 — Remove isolated / extensions:false / noSkills from core

## Stage: Planning (2026-05-30T00:09:21Z)

### Session summary

Planned Phase 16, Step 4: removing the extension-lifecycle-control axis (`isolated`, `extensions: false`, `noSkills`) from the pi-subagents core per ADR 0002.
Confirmed all three prerequisite Phase 16 steps (#261, #262, #263) are closed, so the explicit "deny-at-use" dependency is satisfied.
Produced a four-cycle TDD plan (`isolated` → `extensions` → `skills`/`noSkills`/preload → docs) and committed it.

### Observations

- Scope expansion decided with the user: the issue names only `isolated` / `extensions: false` / `noSkills`, but `noSkills` is the single mechanism behind **both** skill-restriction modes (`skills: false` and `skills: string[]` preload).
  Removing `noSkills` without also removing `AgentConfig.skills` would leave a field that silently stops restricting.
  Chose the **collapse-skills-fully** option (symmetric with `extensions`): retire `AgentConfig.skills`, `skill-loader.ts`, `safe-fs.ts` (sole consumer was the skill loader), `preloadSkills`, `PromptExtras`, and `extras.skillBlocks`.
  Children always inherit Pi's full skill system — the `skills: true` path.
- The recursion guard's `if (cfg.extensions)` gate is removed in the `extensions` cycle (cycle 2), since `SessionConfig.extensions` disappears there.
  A guard-always-runs assertion replaces the deleted "extensions: false skips the filter entirely" test.
- This is a **breaking** change (`feat!:`): public `SpawnOptions.isolated` and the `isolated:` / `extensions:` / `skills:` custom-agent frontmatter keys are removed.
  Custom agents with legacy frontmatter will silently ignore those keys (matches the Phase 14 precedent for `disallowed_tools`).
- Sequencing note surfaced to the user: some `isolated`-threading removed here (`RunOptions.isolated`, `Agent.run()` plumbing) is structure that Step 5 (#265, dissolve the runner) will delete anyway — small, unavoidable, and #265 depends on this step, so no reordering benefit.
- Helper-file churn accepted: `test/helpers/runner-io.ts` is touched in all three removal cycles (one field per cycle); ordering is fixed (`isolated` → `extensions` → `skills`) so no cycle leaves a dangling reference.
- Doc updates identified: `docs/architecture/architecture.md` (Mermaid session subgraph, directory tree, `SpawnOptions`/`RunOptions` field lists, roadmap status) and the `package-pi-subagents` SKILL.md session-domain row (8 → 6 modules).
