import { describe, expect, it } from "vitest";
import type { Theme } from "#src/ui/display";
import type { FormatterContext } from "#src/ui/message-formatters";
import { formatAssistantMessage, formatToolResult, formatUserMessage } from "#src/ui/message-formatters";

// ── Theme helpers ────────────────────────────────────────────────────────────

/** Label theme: wraps text in [color:text] / [bold:text] for precise assertions. */
const labelTheme: Theme = {
  fg: (color, text) => `[${color}:${text}]`,
  bold: (text) => `[bold:${text}]`,
};

/** Identity theme: returns text unchanged for structure-only assertions. */
const plainTheme: Theme = {
  fg: (_color, text) => text,
  bold: (text) => text,
};

/** No-op wrapText: returns input as a single line. */
const noWrap = (text: string, _width: number): string[] => [text];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("message-formatters", () => {
  describe("formatUserMessage", () => {
    const ctx: FormatterContext = { theme: labelTheme, wrapText: noWrap };

    it("returns null for empty string content", () => {
      expect(formatUserMessage("", 80, ctx)).toBeNull();
    });

    it("returns null for whitespace-only string content", () => {
      expect(formatUserMessage("   \n  ", 80, ctx)).toBeNull();
    });

    it("returns null for empty content array", () => {
      expect(formatUserMessage([], 80, ctx)).toBeNull();
    });

    it("returns null for content array with no text items", () => {
      const content = [{ type: "toolCall", name: "read" }];
      expect(formatUserMessage(content, 80, ctx)).toBeNull();
    });

    it("formats string content with User header and wrapped text", () => {
      const result = formatUserMessage("hello world", 80, ctx);
      expect(result).toEqual(["[accent:[User]]", "hello world"]);
    });

    it("extracts text from content array", () => {
      const content = [{ type: "text", text: "from array" }];
      const result = formatUserMessage(content, 80, ctx);
      expect(result).toEqual(["[accent:[User]]", "from array"]);
    });

    it("trims content before passing to wrapText", () => {
      const result = formatUserMessage("  trimmed  ", 80, ctx);
      expect(result).toEqual(["[accent:[User]]", "trimmed"]);
    });

    it("passes width to wrapText", () => {
      const capturedWidths: number[] = [];
      const capturingWrap = (text: string, width: number): string[] => {
        capturedWidths.push(width);
        return [text];
      };
      formatUserMessage("text", 42, { theme: plainTheme, wrapText: capturingWrap });
      expect(capturedWidths).toEqual([42]);
    });

    it("returns multiple lines when wrapText splits content", () => {
      const splitWrap = (text: string, _width: number): string[] => text.split(" ");
      const result = formatUserMessage("one two three", 80, { theme: plainTheme, wrapText: splitWrap });
      expect(result).toEqual(["[User]", "one", "two", "three"]);
    });
  });

  describe("formatAssistantMessage", () => {
    const ctx: FormatterContext = { theme: labelTheme, wrapText: noWrap };

    it("returns [Assistant] header for empty content", () => {
      expect(formatAssistantMessage([], 80, ctx)).toEqual(["[bold:[Assistant]]"]);
    });

    it("formats text-only content", () => {
      const content = [{ type: "text", text: "Hello from assistant" }];
      const result = formatAssistantMessage(content, 80, ctx);
      expect(result).toEqual(["[bold:[Assistant]]", "Hello from assistant"]);
    });

    it("formats tool-call-only content", () => {
      const content = [{ type: "toolCall", name: "read" }];
      const result = formatAssistantMessage(content, 80, ctx);
      expect(result).toEqual(["[bold:[Assistant]]", "[muted:  [Tool: read]]"]);
    });

    it("formats mixed text and tool calls", () => {
      const content = [
        { type: "text", text: "Let me check" },
        { type: "toolCall", name: "grep" },
      ];
      const result = formatAssistantMessage(content, 80, ctx);
      expect(result).toEqual(["[bold:[Assistant]]", "Let me check", "[muted:  [Tool: grep]]"]);
    });

    it("joins multiple text parts with newline before wrapping", () => {
      const capturedTexts: string[] = [];
      const capturingWrap = (text: string, _width: number): string[] => {
        capturedTexts.push(text);
        return [text];
      };
      const content = [
        { type: "text", text: "Part A" },
        { type: "text", text: "Part B" },
      ];
      formatAssistantMessage(content, 80, { theme: plainTheme, wrapText: capturingWrap });
      expect(capturedTexts).toEqual(["Part A\nPart B"]);
    });

    it("uses toolName as fallback when name is absent", () => {
      const content = [{ type: "toolCall", toolName: "bash" }];
      const result = formatAssistantMessage(content, 80, ctx);
      expect(result).toEqual(["[bold:[Assistant]]", "[muted:  [Tool: bash]]"]);
    });

    it("uses 'unknown' when both name and toolName are absent", () => {
      const content = [{ type: "toolCall" }];
      const result = formatAssistantMessage(content, 80, ctx);
      expect(result).toEqual(["[bold:[Assistant]]", "[muted:  [Tool: unknown]]"]);
    });

    it("skips text items with no text value", () => {
      const content = [{ type: "text" }, { type: "text", text: "" }];
      const result = formatAssistantMessage(content, 80, ctx);
      expect(result).toEqual(["[bold:[Assistant]]"]);
    });

    it("skips unknown content types", () => {
      const content = [{ type: "image" }];
      const result = formatAssistantMessage(content, 80, ctx);
      expect(result).toEqual(["[bold:[Assistant]]"]);
    });
  });

  describe("formatToolResult", () => {
    const ctx: FormatterContext = { theme: labelTheme, wrapText: noWrap };

    it("returns null for empty content array", () => {
      expect(formatToolResult([], 80, ctx)).toBeNull();
    });

    it("returns null when all content items have no text", () => {
      const content = [{ type: "text", text: "" }];
      expect(formatToolResult(content, 80, ctx)).toBeNull();
    });

    it("returns null for whitespace-only content", () => {
      const content = [{ type: "text", text: "   " }];
      expect(formatToolResult(content, 80, ctx)).toBeNull();
    });

    it("formats normal content with Result header", () => {
      const content = [{ type: "text", text: "output" }];
      const result = formatToolResult(content, 80, ctx);
      expect(result).toEqual(["[dim:[Result]]", "[dim:output]"]);
    });

    it("applies dim styling to each body line", () => {
      const splitWrap = (text: string, _width: number): string[] => text.split("\n");
      const content = [{ type: "text", text: "line1\nline2" }];
      const result = formatToolResult(content, 80, { theme: labelTheme, wrapText: splitWrap });
      expect(result).toEqual(["[dim:[Result]]", "[dim:line1]", "[dim:line2]"]);
    });

    it("truncates content exceeding 500 chars", () => {
      const longText = "A".repeat(600);
      const content = [{ type: "text", text: longText }];
      const result = formatToolResult(content, 80, ctx);
      expect(result).not.toBeNull();
      // Body line should contain the truncated text in dim styling
      const bodyLine = result![1];
      expect(bodyLine).toContain("A".repeat(500));
      expect(bodyLine).toContain("... (truncated)");
    });

    it("does not truncate content at exactly 500 chars", () => {
      const exactText = "B".repeat(500);
      const content = [{ type: "text", text: exactText }];
      const result = formatToolResult(content, 80, ctx);
      expect(result).not.toBeNull();
      expect(result![1]).toBe(`[dim:${ "B".repeat(500)}]`);
    });

    it("trims content before wrapping", () => {
      const capturedTexts: string[] = [];
      const capturingWrap = (text: string, _width: number): string[] => {
        capturedTexts.push(text);
        return [text];
      };
      const content = [{ type: "text", text: "  trimmed  " }];
      formatToolResult(content, 80, { theme: plainTheme, wrapText: capturingWrap });
      expect(capturedTexts).toEqual(["trimmed"]);
    });
  });
});
