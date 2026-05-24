---
issue: 172
issue_title: "refactor(pi-subagents): extract shared turn-formatting logic"
---

# Retro: #172 — Extract shared turn-formatting logic

## Stage: Planning (2026-05-24T18:00:00Z)

### Session summary

Planned the extraction of duplicated turn-formatting logic from `lifecycle/agent-runner.ts` and `ui/message-formatters.ts` into a new shared module `session/content-items.ts`.
The plan covers extracting `ToolCallContent`, `getToolCallName`, and a new `extractAssistantContent` function, with a 6-step TDD order.

### Observations

- Issue #170 (completed) shifted the duplication target from `conversation-viewer.ts` to `message-formatters.ts` — the issue body's line references are stale but the duplication still exists in the same form.
- Both dependencies (#164 and #170) are closed, so this is unblocked.
- The duplication is clearly incidental (same data extraction, different presentation) — safe to extract per the code-design skill's structural-reasons check.
- `getToolCallName` has no direct unit tests today; the extraction enables testing it for the first time.
- `getAgentConversation` also has no tests — noted as out of scope but worth a follow-up.
- Considered adding `extractText` to the new module for consistency but deferred to keep scope tight.
