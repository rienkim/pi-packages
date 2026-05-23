import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createAvailabilityState } from "./lib/availability.js";
import { registerColGrep } from "./tools/colgrep.js";

export default function piColGrepExtension(pi: ExtensionAPI): void {
  const availability = createAvailabilityState();

  registerColGrep(pi, {
    exec: (cmd, args, opts) => pi.exec(cmd, args, opts),
    availability,
  });

  pi.on("session_start", async (_event, ctx) => {
    await availability.refresh((cmd, args, opts) => pi.exec(cmd, args, opts));

    if (!availability.available) {
      ctx.ui.notify(
        "colgrep is not installed. Semantic code search will not be available.\n" +
          "Install from: https://github.com/lightonai/next-plaid#installation",
        "warning",
      );
    }
  });
}
