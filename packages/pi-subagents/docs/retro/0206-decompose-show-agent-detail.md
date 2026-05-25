---
issue: 206
issue_title: "Decompose showAgentDetail (cognitive 33)"
---

# Retro: #206 — Decompose showAgentDetail (cognitive 33)

## Stage: Planning (2026-05-25T12:00:00Z)

### Session summary

Produced a 4-step plan to decompose `showAgentDetail` (cognitive 33) and `ejectAgent` (cognitive 20) in `ui/agent-config-editor.ts`.
The plan extracts two exported pure functions (`buildMenuOptions`, `buildEjectContent`) with dedicated unit tests, plus three closure-internal handlers (`handleEdit`, `handleDelete`, `handleReset`).

### Observations

- Three of the six action handlers (`ejectAgent`, `disableAgent`, `enableAgent`) were already extracted as closure functions — only Edit, Delete, and Reset were inlined in the dispatch chain.
- `buildMenuOptions` and `buildEjectContent` are ideal pure-function extractions: complex branching logic with no IO dependencies, previously untestable in isolation.
- The existing 18 integration tests through `showAgentDetail` provide a strong safety net — no risk of behavior regression during extraction.
- Chose to scope `ejectAgent` decomposition into this issue since the issue's outcome says "< 10 per function" and `ejectAgent` is at cognitive 20 in the same file.
- `disableAgent` and `enableAgent` were explicitly deferred — their cognitive complexity is manageable and decomposing them would add scope without meaningful benefit.
