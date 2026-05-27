---
issue: 236
issue_title: "Add pre-completion reviewer subagent"
---

# Retro: #236 — Add pre-completion reviewer subagent

## Stage: Planning (2026-05-26T20:00:00Z)

### Session summary

Planned the pre-completion reviewer subagent — three markdown deliverables (agent definition, dispatch skill, template updates) with no code changes.
Studied the repone reference implementation at `~/tinyigsoftware/repone/.opencode/agents/pre-completion-reviewer.md` and its `pre-completion` skill to adapt the pattern for Pi's agent/skill system.
Clarified three design decisions with the user: always-dispatch (no ask), report-to-user on FAIL (no auto-fix loop), and `claude-sonnet-4-6-20260526` as the model.

### Observations

- The repone reviewer has 10 judgment sections; the plan scopes down to 7 by dropping app-specific sections (OTel, polish gaps, lifecycle completeness, AWS SSO).
- Repone's `dod_preflight` tool bundles deterministic checks into a single tool call; this plan runs the same checks as raw bash commands since no custom tool infrastructure exists in this repo.
- The plan inserts the reviewer between "After the last step" (final checks) and "Summarize" in both templates — the skill keeps the template insertion minimal (one line: "Load the `pre-completion` skill and follow the dispatch protocol").
- This is a `/build-plan` execution (all markdown, no TDD cycles).
- The `AGENTS.md` available-skills list auto-discovers from `.pi/skills/` but documenting the new skill explicitly helps discoverability.
