/**
 * widget-renderer.ts — Pure rendering functions for the agent widget.
 *
 * All functions are stateless: they receive data and return formatted strings.
 * No timers, no SDK types, no side effects. Consumed by AgentWidget.
 */

import type { AgentConfigLookup } from "../agent-types.js";
import type { SubagentType } from "../types.js";
import type { LifetimeUsage, SessionLike } from "../usage.js";
import { getLifetimeTotal, getSessionContextPercent } from "../usage.js";
import {
	describeActivity,
	ERROR_STATUSES,
	formatMs,
	formatSessionTokens,
	formatTurns,
	getDisplayName,
	getPromptModeLabel,
	SPINNER,
	type Theme,
} from "./display.js";

// ── Data interfaces ──────────────────────────────────────────────────────────

/** Minimal agent snapshot for rendering — no class methods, no mutation surface. */
export interface WidgetAgent {
	readonly id: string;
	readonly type: SubagentType;
	readonly status: string;
	readonly description: string;
	readonly toolUses: number;
	readonly startedAt: number;
	readonly completedAt?: number;
	readonly error?: string;
	readonly lifetimeUsage?: Readonly<LifetimeUsage>;
	readonly compactionCount: number;
}

/** Read-only activity snapshot for widget rendering. */
export interface WidgetActivity {
	readonly activeTools: ReadonlyMap<string, string>;
	readonly responseText: string;
	readonly turnCount: number;
	readonly maxTurns?: number;
	readonly session?: SessionLike;
}

// ── Per-agent rendering ──────────────────────────────────────────────────────

/** Render a single finished agent line (no tree connector prefix). */
export function renderFinishedLine(
	agent: WidgetAgent,
	activity: WidgetActivity | undefined,
	registry: AgentConfigLookup,
	theme: Theme,
): string {
	const name = getDisplayName(agent.type, registry);
	const modeLabel = getPromptModeLabel(agent.type, registry);
	const duration = formatMs((agent.completedAt ?? Date.now()) - agent.startedAt);

	let icon: string;
	let statusText: string;
	if (agent.status === "completed") {
		icon = theme.fg("success", "✓");
		statusText = "";
	} else if (agent.status === "steered") {
		icon = theme.fg("warning", "✓");
		statusText = theme.fg("warning", " (turn limit)");
	} else if (agent.status === "stopped") {
		icon = theme.fg("dim", "■");
		statusText = theme.fg("dim", " stopped");
	} else if (agent.status === "error") {
		icon = theme.fg("error", "✗");
		const errMsg = agent.error ? `: ${agent.error.slice(0, 60)}` : "";
		statusText = theme.fg("error", ` error${errMsg}`);
	} else {
		// aborted
		icon = theme.fg("error", "✗");
		statusText = theme.fg("warning", " aborted");
	}

	const parts: string[] = [];
	if (activity) parts.push(formatTurns(activity.turnCount, activity.maxTurns));
	if (agent.toolUses > 0) parts.push(`${agent.toolUses} tool use${agent.toolUses === 1 ? "" : "s"}`);
	parts.push(duration);

	const modeTag = modeLabel ? ` ${theme.fg("dim", `(${modeLabel})`)}` : "";
	return `${icon} ${theme.fg("dim", name)}${modeTag}  ${theme.fg("dim", agent.description)} ${theme.fg("dim", "·")} ${theme.fg("dim", parts.join(" · "))}${statusText}`;
}

/** Render a single running agent as header + activity line pair (no tree connector prefix). */
export function renderRunningLines(
	agent: WidgetAgent,
	activity: WidgetActivity | undefined,
	registry: AgentConfigLookup,
	spinnerFrame: number,
	theme: Theme,
): [header: string, activity: string] {
	const name = getDisplayName(agent.type, registry);
	const modeLabel = getPromptModeLabel(agent.type, registry);
	const modeTag = modeLabel ? ` ${theme.fg("dim", `(${modeLabel})`)}` : "";
	const elapsed = formatMs(Date.now() - agent.startedAt);

	const tokens = getLifetimeTotal(agent.lifetimeUsage);
	const contextPercent = activity?.session ? getSessionContextPercent(activity.session) : null;
	const tokenText = tokens > 0 ? formatSessionTokens(tokens, contextPercent, theme, agent.compactionCount) : "";

	const parts: string[] = [];
	if (activity) parts.push(formatTurns(activity.turnCount, activity.maxTurns));
	if (agent.toolUses > 0) parts.push(`${agent.toolUses} tool use${agent.toolUses === 1 ? "" : "s"}`);
	if (tokenText) parts.push(tokenText);
	parts.push(elapsed);
	const statsText = parts.join(" · ");

	const frame = SPINNER[spinnerFrame % SPINNER.length];
	const activityText = activity ? describeActivity(activity.activeTools, activity.responseText) : "thinking\u2026";

	const header = `${theme.fg("accent", frame)} ${theme.bold(name)}${modeTag}  ${theme.fg("muted", agent.description)} ${theme.fg("dim", "·")} ${theme.fg("dim", statsText)}`;
	const activityLine = theme.fg("dim", `  \u23BF  ${activityText}`);

	return [header, activityLine];
}
