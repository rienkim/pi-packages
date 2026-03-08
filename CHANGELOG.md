# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.7] - 2026-03-08

### Fixed
- **Widget crash in narrow terminals** — agent widget lines were not truncated to terminal width, causing `doRender` to throw when the tmux pane was narrower than the rendered content. All widget lines are now truncated using `truncateToWidth()` with the actual terminal column count.

## [0.2.6] - 2026-03-07

### Added
- **Background task join strategies** — smart grouping of background agent completion notifications
  - `smart` (default): 2+ background agents spawned in the same turn are auto-grouped into a single consolidated notification instead of individual nudges
  - `async`: each agent notifies individually on completion (previous behavior)
  - `group`: force grouping even for solo agents
  - 30s timeout after first completion delivers partial results; 15s straggler re-batch window for remaining agents
- **`join_mode` parameter** on the `Agent` tool — override join strategy per agent (`"async"` or `"group"`)
- **Join mode setting** in `/agents` → Settings — configure the default join mode at runtime
- New `src/group-join.ts` — `GroupJoinManager` class for batched completion notifications

### Changed
- `AgentRecord` now includes optional `groupId`, `joinMode`, and `resultConsumed` fields
- Background agent completion routing refactored: individual nudge logic extracted to `sendIndividualNudge()`, group delivery via `GroupJoinManager`

### Fixed
- **Debounce window race** — agents that complete during the 100ms batch debounce window are now deferred and retroactively fed into the group once it's registered, preventing split notifications (one individual + one partial group) and zombie groups
- **Solo agent swallowed notification** — if only one agent was spawned (no group formed) but it completed during the debounce window, its deferred notification is now sent when the batch finalizes
- **Duplicate notifications after polling** — calling `get_subagent_result` on a completed agent now marks its result as consumed, suppressing the subsequent completion notification (both individual and group)

## [0.2.5] - 2026-03-06

### Added
- **Interactive `/agents` menu** — single command replaces `/agent` and `/agents` with a full management wizard
  - Browse and manage running agents
  - Custom agents submenu — edit or delete existing agents
  - Create new custom agents via manual wizard or AI-generated (with comprehensive frontmatter documentation for the generator)
  - Settings: configure max concurrency, default max turns, and grace turns at runtime
  - Built-in agent types shown with model info (e.g. `Explore · haiku`)
  - Aligned formatting for agent lists
- **Configurable turn limits** — `defaultMaxTurns` and `graceTurns` are now runtime-adjustable via `/agents` → Settings
- Sub-menus return to main menu instead of exiting

### Removed
- `/agent <type> <prompt>` command (use `Agent` tool directly, or create custom agents via `/agents`)

## [0.2.4] - 2026-03-06

### Added
- **Global custom agents** — agents in `~/.pi/agent/agents/*.md` are now discovered automatically and available across all projects
- Two-tier discovery hierarchy: project-level (`.pi/agents/`) overrides global (`~/.pi/agent/agents/`)

## [0.2.3] - 2026-03-05

### Added
- Screenshot in README

## [0.2.2] - 2026-03-05

### Changed
- Renamed package to `@tintinweb/pi-subagents`
- Fuzzy model resolver now only matches models with auth configured (prevents selecting unconfigured providers)
- Custom agents hot-reload on each `Agent` tool call (no restart needed for new `.pi/agents/*.md` files)
- Updated pi dependencies to 0.56.1

### Refactored
- Extracted `createActivityTracker()` — eliminates duplicated tool activity wiring between foreground and background paths
- Extracted `safeFormatTokens()` — replaces 4 repeated try-catch blocks
- Extracted `buildDetails()` — consolidates AgentDetails construction
- Extracted `getStatusLabel()` / `getStatusNote()` — consolidates 3 duplicated status formatting chains
- Shared `extractText()` — consolidated duplicate from context.ts and agent-runner.ts
- Added `ERROR_STATUSES` constant in widget for consistent status checks
- `getDisplayName()` now delegates to `getConfig()` instead of separate lookups
- Removed unused `Tool` type export from agent-types

## [0.2.1] - 2026-03-05

### Added
- **Persistent above-editor widget** — tree view of all running/queued/finished agents with animated spinners and live stats
- **Concurrency queue** — configurable max concurrent background agents (default: 4), auto-drain
- **Queued agents** collapsed to single summary line in widget
- **Turn-based widget linger** — completed agents clear after 1 turn, errors/aborted linger for 2 extra turns
- **Colored status icons** — themed rendering via `setWidget` callback form (`✓` green, `✓` yellow, `✗` red, `■` dim)
- **Live response streaming** — `onTextDelta` shows truncated agent response text instead of static "thinking..."

### Changed
- Tool names match Claude Code: `Agent`, `get_subagent_result`, `steer_subagent`
- Labels use "Agent" / "Agents" (not "Subagent")
- Widget heading: `●` when active, `○` when only lingering finished agents
- Extracted all UI code to `src/ui/agent-widget.ts`

## [0.2.0] - 2026-03-05

### Added
- **Claude Code-style UI rendering** — `renderCall`/`renderResult`/`onUpdate` for live streaming progress
  - Live activity descriptions: "searching, reading 3 files…"
  - Token count display: "33.8k tokens"
  - Per-agent tool use counter
  - Expandable completed results (ctrl+o)
  - Distinct states: running, background, completed, error, aborted
- **Async environment detection** — replaced `execSync` with `pi.exec()` for non-blocking git/platform detection
- **Status bar integration** — running background agent count shown in pi's status bar
- **Fuzzy model selection** — `"haiku"`, `"sonnet"` resolve to best matching available model

### Changed
- Tool label changed from "Spawn Agent" to "Agent" (matches Claude Code style)
- `onToolUse` callback replaced with richer `onToolActivity` (includes tool name + start/end)
- `onSessionCreated` callback for accessing session stats (token counts)
- `env.ts` now requires `ExtensionAPI` parameter (async `pi.exec()` instead of `execSync`)

## [0.1.0] - 2026-03-05

Initial release.

### Added
- **Autonomous sub-agents** — spawn specialized agents via tool call, each running in an isolated pi session
- **Built-in agent types** — general-purpose, Explore (defaults to haiku), Plan, statusline-setup, claude-code-guide
- **Custom user-defined agents** — define agents in `.pi/agents/<name>.md` with YAML frontmatter + system prompt body
- **Frontmatter configuration** — tools, extensions, skills, model, thinking, max_turns, prompt_mode, inherit_context, run_in_background, isolated
- **Graceful max_turns** — steer message at limit, 5 grace turns, then hard abort
- **Background execution** — `run_in_background` with completion notifications
- **`get_subagent_result` tool** — check status, wait for completion, verbose conversation output
- **`steer_subagent` tool** — inject steering messages into running agents mid-execution
- **Agent resume** — continue a previous agent's session with a new prompt
- **Context inheritance** — fork the parent conversation into the sub-agent
- **Model override** — per-agent model selection
- **Thinking level** — per-agent extended thinking control
- **`/agent` and `/agents` commands**

[0.2.7]: https://github.com/tintinweb/pi-subagents/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/tintinweb/pi-subagents/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/tintinweb/pi-subagents/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/tintinweb/pi-subagents/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/tintinweb/pi-subagents/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/tintinweb/pi-subagents/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/tintinweb/pi-subagents/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/tintinweb/pi-subagents/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tintinweb/pi-subagents/releases/tag/v0.1.0
