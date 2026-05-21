import { describe, expect, test } from "vitest";

import {
  type DenialContext,
  EXTENSION_TAG,
  formatDenyReason,
  formatUnavailableReason,
  formatUserDeniedReason,
} from "../src/denial-messages";
import type { PermissionCheckResult } from "../src/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function toolCheck(
  toolName: string,
  overrides: Partial<PermissionCheckResult> = {},
): PermissionCheckResult {
  return {
    toolName,
    state: "deny",
    source: "tool",
    origin: "builtin",
    ...overrides,
  };
}

function mcpCheck(
  target: string,
  overrides: Partial<PermissionCheckResult> = {},
): PermissionCheckResult {
  return {
    toolName: "mcp",
    target,
    state: "deny",
    source: "mcp",
    origin: "builtin",
    ...overrides,
  };
}

function toolCtx(
  check: PermissionCheckResult,
  agentName?: string,
): Extract<DenialContext, { kind: "tool" }> {
  return { kind: "tool", check, agentName };
}

function pathCtx(
  toolName: string,
  pathValue: string,
  agentName?: string,
): Extract<DenialContext, { kind: "path" }> {
  return { kind: "path", toolName, pathValue, agentName };
}

function extDirCtx(
  toolName: string,
  pathValue: string,
  cwd: string,
  agentName?: string,
): Extract<DenialContext, { kind: "external_directory" }> {
  return { kind: "external_directory", toolName, pathValue, cwd, agentName };
}

function bashExtDirCtx(
  command: string,
  externalPaths: string[],
  cwd: string,
  agentName?: string,
): Extract<DenialContext, { kind: "bash_external_directory" }> {
  return {
    kind: "bash_external_directory",
    command,
    externalPaths,
    cwd,
    agentName,
  };
}

function bashPathCtx(
  command: string,
  pathValue: string,
  agentName?: string,
): Extract<DenialContext, { kind: "bash_path" }> {
  return { kind: "bash_path", command, pathValue, agentName };
}

function skillReadCtx(
  skillName: string,
  readPath: string,
  agentName?: string,
): Extract<DenialContext, { kind: "skill_read" }> {
  return { kind: "skill_read", skillName, readPath, agentName };
}

// ── EXTENSION_TAG ──────────────────────────────────────────────────────────

describe("EXTENSION_TAG", () => {
  test("is [pi-permission-system]", () => {
    expect(EXTENSION_TAG).toBe("[pi-permission-system]");
  });
});

// ── Shared assertions ──────────────────────────────────────────────────────

function assertTagged(result: string): void {
  expect(result).toContain("[pi-permission-system]");
  expect(result).not.toContain("Hard stop");
}

// ── formatDenyReason ───────────────────────────────────────────────────────

describe("formatDenyReason", () => {
  describe("tool context", () => {
    test("includes tool name and extension tag", () => {
      const result = formatDenyReason(toolCtx(toolCheck("write")));
      expect(result).toContain("write");
      assertTagged(result);
    });

    test("includes agent name when provided", () => {
      const result = formatDenyReason(toolCtx(toolCheck("write"), "my-agent"));
      expect(result).toContain("Agent 'my-agent'");
    });

    test("includes MCP target for mcp checks", () => {
      const result = formatDenyReason(toolCtx(mcpCheck("server:do-thing")));
      expect(result).toContain("MCP target 'server:do-thing'");
      assertTagged(result);
    });

    test("includes bash command when present", () => {
      const result = formatDenyReason(
        toolCtx(toolCheck("bash", { command: "rm -rf /" })),
      );
      expect(result).toContain("rm -rf /");
    });

    test("includes matched pattern when present", () => {
      const result = formatDenyReason(
        toolCtx(
          toolCheck("bash", { command: "rm -rf /", matchedPattern: "rm *" }),
        ),
      );
      expect(result).toContain("matched 'rm *'");
    });
  });

  describe("path context", () => {
    test("includes tool name, path, and extension tag", () => {
      const result = formatDenyReason(pathCtx("read", "/etc/passwd"));
      expect(result).toContain("read");
      expect(result).toContain("/etc/passwd");
      assertTagged(result);
    });

    test("includes agent name when provided", () => {
      const result = formatDenyReason(
        pathCtx("read", "/etc/passwd", "sec-agent"),
      );
      expect(result).toContain("Agent 'sec-agent'");
    });

    test("uses 'Current agent' without agent name", () => {
      const result = formatDenyReason(pathCtx("read", "/etc/passwd"));
      expect(result).toContain("Current agent");
    });
  });

  describe("external_directory context", () => {
    test("includes tool name, path, cwd, and extension tag", () => {
      const result = formatDenyReason(
        extDirCtx("read", "/etc/passwd", "/project"),
      );
      expect(result).toContain("read");
      expect(result).toContain("/etc/passwd");
      expect(result).toContain("/project");
      assertTagged(result);
    });

    test("includes agent name when provided", () => {
      const result = formatDenyReason(
        extDirCtx("read", "/etc/passwd", "/project", "sec-agent"),
      );
      expect(result).toContain("Agent 'sec-agent'");
    });
  });

  describe("bash_external_directory context", () => {
    test("includes command, paths, cwd, and extension tag", () => {
      const result = formatDenyReason(
        bashExtDirCtx("cat /etc/hosts", ["/etc/hosts"], "/project"),
      );
      expect(result).toContain("cat /etc/hosts");
      expect(result).toContain("/etc/hosts");
      expect(result).toContain("/project");
      assertTagged(result);
    });

    test("includes agent name when provided", () => {
      const result = formatDenyReason(
        bashExtDirCtx("cat /etc/hosts", ["/etc/hosts"], "/project", "my-agent"),
      );
      expect(result).toContain("Agent 'my-agent'");
    });
  });

  describe("bash_path context", () => {
    test("includes command, path, and extension tag", () => {
      const result = formatDenyReason(
        bashPathCtx("cat /etc/passwd", "/etc/passwd"),
      );
      expect(result).toContain("/etc/passwd");
      expect(result).toContain("bash");
      assertTagged(result);
    });

    test("includes agent name when provided", () => {
      const result = formatDenyReason(
        bashPathCtx("cat /etc/passwd", "/etc/passwd", "my-agent"),
      );
      expect(result).toContain("Agent 'my-agent'");
    });
  });

  describe("skill_read context", () => {
    test("includes skill name, read path, and extension tag", () => {
      const result = formatDenyReason(
        skillReadCtx("librarian", "/skills/librarian/SKILL.md"),
      );
      expect(result).toContain("librarian");
      expect(result).toContain("/skills/librarian/SKILL.md");
      assertTagged(result);
    });

    test("includes agent name when provided", () => {
      const result = formatDenyReason(
        skillReadCtx("librarian", "/skills/librarian/SKILL.md", "my-agent"),
      );
      expect(result).toContain("Agent 'my-agent'");
    });
  });
});

// ── formatUnavailableReason ────────────────────────────────────────────────

describe("formatUnavailableReason", () => {
  test("tool context — generic tool", () => {
    const result = formatUnavailableReason(toolCtx(toolCheck("write")));
    expect(result).toContain("write");
    expect(result).toContain("no interactive UI");
    assertTagged(result);
  });

  test("tool context — bash with command", () => {
    const result = formatUnavailableReason(
      toolCtx(toolCheck("bash", { command: "git push" })),
    );
    expect(result).toContain("git push");
    expect(result).toContain("no interactive UI");
  });

  test("tool context — mcp", () => {
    const result = formatUnavailableReason(toolCtx(mcpCheck("server:tool")));
    expect(result).toContain("mcp");
    expect(result).toContain("no interactive UI");
  });

  test("path context", () => {
    const result = formatUnavailableReason(pathCtx("read", "/etc/passwd"));
    expect(result).toContain("/etc/passwd");
    expect(result).toContain("no interactive UI");
    assertTagged(result);
  });

  test("external_directory context", () => {
    const result = formatUnavailableReason(
      extDirCtx("read", "/etc/passwd", "/project"),
    );
    expect(result).toContain("/etc/passwd");
    expect(result).toContain("outside the working directory");
    assertTagged(result);
  });

  test("bash_external_directory context", () => {
    const result = formatUnavailableReason(
      bashExtDirCtx("cat /etc/hosts", ["/etc/hosts"], "/project"),
    );
    expect(result).toContain("cat /etc/hosts");
    expect(result).toContain("no interactive UI");
    assertTagged(result);
  });

  test("bash_path context", () => {
    const result = formatUnavailableReason(
      bashPathCtx("cat /etc/passwd", "/etc/passwd"),
    );
    expect(result).toContain("cat /etc/passwd");
    expect(result).toContain("/etc/passwd");
    expect(result).toContain("no interactive UI");
    assertTagged(result);
  });

  test("skill_read context", () => {
    const result = formatUnavailableReason(
      skillReadCtx("librarian", "/skills/librarian/SKILL.md"),
    );
    expect(result).toContain("librarian");
    expect(result).toContain("no interactive UI");
    assertTagged(result);
  });
});

// ── formatUserDeniedReason ─────────────────────────────────────────────────

describe("formatUserDeniedReason", () => {
  describe("tool context", () => {
    test("includes tool name and extension tag", () => {
      const result = formatUserDeniedReason(toolCtx(toolCheck("write")));
      expect(result).toContain("write");
      assertTagged(result);
    });

    test("includes denial reason when provided", () => {
      const result = formatUserDeniedReason(
        toolCtx(toolCheck("write")),
        "too risky",
      );
      expect(result).toContain("Reason: too risky");
    });

    test("omits reason suffix when not provided", () => {
      const result = formatUserDeniedReason(toolCtx(toolCheck("write")));
      expect(result).not.toContain("Reason:");
    });

    test("mentions bash command for bash checks", () => {
      const result = formatUserDeniedReason(
        toolCtx(toolCheck("bash", { command: "ls -la" })),
      );
      expect(result).toContain("ls -la");
    });

    test("mentions MCP target for mcp checks", () => {
      const result = formatUserDeniedReason(toolCtx(mcpCheck("server:query")));
      expect(result).toContain("server:query");
    });
  });

  describe("path context", () => {
    test("includes path and extension tag", () => {
      const result = formatUserDeniedReason(pathCtx("read", "/etc/passwd"));
      expect(result).toContain("/etc/passwd");
      assertTagged(result);
    });

    test("includes denial reason when provided", () => {
      const result = formatUserDeniedReason(
        pathCtx("read", "/etc/passwd"),
        "sensitive",
      );
      expect(result).toContain("Reason: sensitive");
    });
  });

  describe("external_directory context", () => {
    test("includes tool name, path, and extension tag", () => {
      const result = formatUserDeniedReason(
        extDirCtx("edit", "/etc/hosts", "/project"),
      );
      expect(result).toContain("edit");
      expect(result).toContain("/etc/hosts");
      assertTagged(result);
    });

    test("includes denial reason when provided", () => {
      const result = formatUserDeniedReason(
        extDirCtx("edit", "/etc/hosts", "/project"),
        "too risky",
      );
      expect(result).toContain("Reason: too risky");
    });
  });

  describe("bash_external_directory context", () => {
    test("includes command and extension tag", () => {
      const result = formatUserDeniedReason(
        bashExtDirCtx("rm /etc/hosts", ["/etc/hosts"], "/project"),
      );
      expect(result).toContain("rm /etc/hosts");
      assertTagged(result);
    });

    test("includes denial reason when provided", () => {
      const result = formatUserDeniedReason(
        bashExtDirCtx("rm /etc/hosts", ["/etc/hosts"], "/project"),
        "dangerous",
      );
      expect(result).toContain("Reason: dangerous");
    });
  });

  describe("bash_path context", () => {
    test("includes command, path, and extension tag", () => {
      const result = formatUserDeniedReason(
        bashPathCtx("cat /etc/passwd", "/etc/passwd"),
      );
      expect(result).toContain("cat /etc/passwd");
      expect(result).toContain("/etc/passwd");
      assertTagged(result);
    });

    test("includes denial reason when provided", () => {
      const result = formatUserDeniedReason(
        bashPathCtx("cat /etc/passwd", "/etc/passwd"),
        "sensitive",
      );
      expect(result).toContain("Reason: sensitive");
    });
  });

  describe("skill_read context", () => {
    test("includes skill name and extension tag", () => {
      const result = formatUserDeniedReason(
        skillReadCtx("librarian", "/skills/librarian/SKILL.md"),
      );
      expect(result).toContain("librarian");
      assertTagged(result);
    });

    test("includes denial reason when provided", () => {
      const result = formatUserDeniedReason(
        skillReadCtx("librarian", "/skills/librarian/SKILL.md"),
        "not needed",
      );
      expect(result).toContain("Reason: not needed");
    });
  });
});
