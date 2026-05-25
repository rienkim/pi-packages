---
issue: 214
issue_title: "Convert remaining closure factories to classes (Phase 13, Step 1)"
---

# Retro: #214 — Convert remaining closure factories to classes

## Stage: Planning (2026-05-25T20:00:00Z)

### Session summary

Produced a 4-step TDD plan to convert the three remaining closure factories (`createAgentConfigEditor`, `createAgentCreationWizard`, `createSubagentsService`) to classes.
Each conversion is one commit covering source, test, and consumer updates together.

### Observations

- The conversions are entirely mechanical — same pattern as Phase 11 (#195, #196).
  No design ambiguity requiring user input.
- `AgentCreationWizardDeps` is only used within its own file, so removing it is safe.
  The class dissolves the deps bag into positional constructor params for consistency with `AgentConfigEditor`.
- The `agent-creation-wizard.test.ts` has ~18 inline `createAgentCreationWizard(deps)` calls; the plan suggests adding a `makeWizard(deps)` helper to centralize construction and reduce the diff size.
- `SubagentsServiceAdapter` uses `implements SubagentsService` for compile-time verification, unlike the factory which relied on structural typing of the returned object literal.
- Pure helper functions (`buildMenuOptions`, `buildEjectContent`, `toSubagentRecord`) and narrow interfaces (`AgentManagerLike`, `ServiceRuntimeLike`, `WizardManager`, `WizardRegistry`) remain unchanged.
