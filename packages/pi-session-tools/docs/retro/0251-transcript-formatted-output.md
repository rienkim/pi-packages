---
issue: 251
issue_title: "Return transcript-formatted output from read_session and read_parent_session"
---

# Retro: #251 — Return transcript-formatted output from read_session and read_parent_session

## Stage: Planning (2026-05-27T18:00:00Z)

### Session summary

Produced a 4-step TDD plan to replace raw JSON output from `read_session` and `read_parent_session` with a structured transcript format.
The plan extracts a shared `formatTranscript` module in `src/format-transcript.ts` that handles tool result folding by `toolCallId`, sequential numbering of conversation turns, and metadata entry formatting.

### Observations

- The `ParsedEntry` type from `parent-session.ts` and the `SessionEntry` type from the SDK both use `{ type: string; [key: string]: unknown }` structurally, so the formatter can accept a minimal `TranscriptEntry` interface without importing SDK types.
- The `@gotgenes/opencode-session-context` plugin provides a proven reference format, but Pi's session model differs significantly (separate `toolResult` message entries vs. inline `parts`, `AgentMessage` union with `bashExecution` and `custom` roles, tree-structured entries).
  The formatter must handle these Pi-specific shapes rather than directly porting the OpenCode implementation.
- The existing tests assert `JSON.parse(text)` on tool output — step 4 rewrites these assertions to check transcript text, which is a non-trivial test update but keeps the step atomic since the formatter is already tested in isolation by that point.
- No ambiguous design choices needed user input — the issue's "Proposed behavior" section was comprehensive and unambiguous.
