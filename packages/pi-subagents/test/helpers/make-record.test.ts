import { describe, expect, it } from "vitest";
import { createTestRecord } from "./make-record.js";

describe("createTestRecord", () => {
	it("returns a completed record with expected defaults", () => {
		const record = createTestRecord();
		expect(record).toEqual({
			id: "agent-1",
			type: "general-purpose",
			description: "Test task",
			status: "completed",
			result: "All done.",
			toolUses: 3,
			startedAt: 1000,
			completedAt: 2000,
			compactionCount: 0,
			lifetimeUsage: { input: 500, output: 500, cacheWrite: 0 },
		});
	});

	it("applies overrides to defaults", () => {
		const record = createTestRecord({ id: "custom-id", status: "running" });
		expect(record.id).toBe("custom-id");
		expect(record.status).toBe("running");
		// Non-overridden fields retain defaults
		expect(record.description).toBe("Test task");
		expect(record.toolUses).toBe(3);
	});

	it("allows adding optional fields not in defaults", () => {
		const record = createTestRecord({ session: {} as any });
		expect(record.session).toEqual({});
	});

	it("allows overriding defaults to undefined", () => {
		const record = createTestRecord({ result: undefined, completedAt: undefined });
		expect(record.result).toBeUndefined();
		expect(record.completedAt).toBeUndefined();
	});
});
