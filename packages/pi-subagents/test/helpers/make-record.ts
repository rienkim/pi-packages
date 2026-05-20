import { AgentRecord, type AgentRecordInit } from "../../src/agent-record.js";

export function createTestRecord(overrides: Partial<AgentRecordInit> = {}): AgentRecord {
	return new AgentRecord({
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
		...overrides,
	});
}
