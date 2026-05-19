/**
 * debug.ts — Debug logging utility for silenced catch blocks.
 *
 * Set PI_SUBAGENTS_DEBUG=1 to reveal silent failures in catch blocks
 * throughout the package. Production behavior is unchanged when unset.
 */

export const DEBUG = process.env.PI_SUBAGENTS_DEBUG === "1";

export function debugLog(context: string, err: unknown): void {
  if (DEBUG) console.warn(`[pi-subagents:debug] ${context}:`, err);
}
