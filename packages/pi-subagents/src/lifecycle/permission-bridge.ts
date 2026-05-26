/**
 * permission-bridge.ts — Cross-extension bridge to @gotgenes/pi-permission-system.
 *
 * pi-subagents does not import pi-permission-system directly. Instead it
 * accesses the published PermissionsService via a process-global Symbol.for()
 * key, the same mechanism pi-permission-system uses to publish itself.
 *
 * When pi-permission-system is not installed, getPermissionsService() returns
 * undefined and all registration calls are silent no-ops.
 */

/**
 * The two PermissionsService methods pi-subagents needs.
 *
 * Follows ISP — does not expose the full PermissionsService surface
 * (checkPermission, getToolPermission, etc.) to avoid coupling.
 */
interface PermissionsServiceConsumer {
	registerSubagentSession(
		sessionKey: string,
		info: { parentSessionId?: string; agentName: string },
	): void;
	unregisterSubagentSession(sessionKey: string): void;
}

const PERMISSION_SERVICE_KEY = Symbol.for(
	"@gotgenes/pi-permission-system:service",
);

function getPermissionsService(): PermissionsServiceConsumer | undefined {
	return (globalThis as Record<symbol, unknown>)[
		PERMISSION_SERVICE_KEY
	] as PermissionsServiceConsumer | undefined;
}

/**
 * Register a child session with pi-permission-system's SubagentSessionRegistry.
 *
 * Must be called after deriving sessionDir but before session.bindExtensions()
 * so isSubagentExecutionContext() hits the registry on the first check during
 * child extension initialization.
 *
 * @param sessionKey - The session directory path (unique per session).
 * @param info       - Agent name and optional parent session ID for forwarding.
 */
export function registerChildSession(
	sessionKey: string,
	info: { parentSessionId?: string; agentName: string },
): void {
	getPermissionsService()?.registerSubagentSession(sessionKey, info);
}

/**
 * Unregister a child session from pi-permission-system's SubagentSessionRegistry.
 *
 * Must be called in a finally block so cleanup happens on both success and
 * error paths.
 *
 * @param sessionKey - The session directory path used during registration.
 */
export function unregisterChildSession(sessionKey: string): void {
	getPermissionsService()?.unregisterSubagentSession(sessionKey);
}
