/**
 * Maps the portable `onProgress` callback to Pi's `onUpdate` streaming mechanism.
 *
 * The `onUpdate` callback expects an `AgentToolResult`-shaped object.
 * We use a minimal local interface to avoid coupling the adapter to SDK internals.
 */

/** Minimal shape compatible with Pi's `AgentToolUpdateCallback`. */
type OnUpdate = (partialResult: { content: string }) => void;

/**
 * Create an `onProgress` callback that forwards lines to Pi's `onUpdate`.
 * Returns `undefined` when `onUpdate` is not provided (tool called without streaming).
 */
export function createProgressCallback(
  onUpdate: OnUpdate | undefined,
): ((line: string) => void) | undefined {
  if (!onUpdate) return undefined;
  return (line: string) => {
    onUpdate({ type: "progress", content: line } as { content: string });
  };
}
