import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createAvailabilityState } from "./lib/availability.js";
import { createReindexer, type Reindexer } from "./lib/reindex.js";
import { registerColGrep } from "./tools/colgrep.js";

const COLGREP_STATUS_KEY = "colgrep";

function setColGrepStatus(
  ctx: { ui: { setStatus?: (key: string, text: string | undefined) => void } },
  text: string | undefined,
): void {
  if (typeof ctx.ui.setStatus === "function") {
    ctx.ui.setStatus(COLGREP_STATUS_KEY, text);
  }
}

export default function piColGrepExtension(pi: ExtensionAPI): void {
  const availability = createAvailabilityState();
  let reindexer: Reindexer | undefined;

  registerColGrep(pi, {
    exec: (cmd, args, opts) => pi.exec(cmd, args, opts),
    availability,
  });

  pi.on("session_start", async (_event, ctx) => {
    const exec = (
      cmd: string,
      args: string[],
      opts?: { cwd?: string; timeout?: number; signal?: AbortSignal },
    ) => pi.exec(cmd, args, opts);

    await availability.refresh(exec);

    if (!availability.available) {
      ctx.ui.notify(
        "colgrep is not installed. Semantic code search will not be available.\n" +
          "Install from: https://github.com/lightonai/next-plaid#installation",
        "warning",
      );
      return;
    }

    reindexer = createReindexer({
      exec,
      cwd: ctx.cwd,
      onStatus: (text) => setColGrepStatus(ctx, text),
    });
    await reindexer.runNow();
  });

  pi.on("tool_result", async (event, _ctx) => {
    if (event.isError) return;
    if (event.toolName !== "write" && event.toolName !== "edit") return;
    reindexer?.schedule();
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    await reindexer?.shutdown();
    reindexer = undefined;
  });

  pi.registerCommand("colgrep-reindex", {
    description: "Manually refresh the ColGrep semantic search index",
    handler: async (_args, ctx) => {
      if (!availability.available) {
        ctx.ui.notify(
          "colgrep is not installed. Install from: https://github.com/lightonai/next-plaid#installation",
          "warning",
        );
        return;
      }

      const exec = (
        cmd: string,
        args: string[],
        opts?: { cwd?: string; timeout?: number; signal?: AbortSignal },
      ) => pi.exec(cmd, args, opts);

      // Use the session reindexer if available; otherwise create a one-shot
      // one (e.g., if the command is invoked before session_start has run).
      const indexer =
        reindexer ??
        createReindexer({
          exec,
          cwd: ctx.cwd,
          onStatus: (text) => setColGrepStatus(ctx, text),
        });

      await indexer.runNow();
      ctx.ui.notify("ColGrep index updated.", "info");
    },
  });
}
