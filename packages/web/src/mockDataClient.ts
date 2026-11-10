import type { AuditEntry, DataClient, Decision, DecisionFilters, Task, TaskFilters, AuditFilters, TaskStatus } from '@workbench/shared';

const sampleTasks: Task[] = [
  { id: 'DNR-000412', type: 'duplicate_donor', status: 'open', recordIds: ['DNR-000412', 'DNR-000413'], suggestion: 'Review possible duplicate donor', reason: 'Sample data only', confidence: 'rule', source: 'rule', createdAt: '2026-01-01' },
  { id: 'HSP-001', type: 'facility_name', status: 'waiting_supervisor', recordIds: ['HSP-001'], suggestion: 'Use standard facility name', reason: 'Sample data only', confidence: 'medium', source: 'smart', createdAt: '2026-01-02' },
  { id: 'REQ-003031', type: 'logger_gap', status: 'open', recordIds: ['REQ-003031'], suggestion: 'Review logger gap', reason: 'Sample data only', confidence: 'rule', source: 'rule', createdAt: '2026-01-03' },
];
let decisions: Decision[] = [];
const audits: AuditEntry[] = [];
export class MockDataClient implements DataClient {
  async listTasks(filters?: TaskFilters) { return sampleTasks.filter((task) => (!filters?.status || task.status === filters.status) && (!filters?.type || task.type === filters.type)); }
  async getTask(id: string) { return sampleTasks.find((task) => task.id === id); }
  async recordDecision(decision: Decision) { decisions = [...decisions, decision]; }
  async listDecisions(filters?: DecisionFilters) { return decisions.filter((decision) => !filters?.taskId || decision.taskId === filters.taskId); }
  async listAuditEntries(filters?: AuditFilters) { return audits.filter((entry) => !filters?.taskId || entry.taskId === filters.taskId); }
  async getSummaryCounts(): Promise<Record<TaskStatus, number>> { return { open: 2, waiting_supervisor: 1, done: 0, escalated: 0 }; }
  async getMethodResults() { return { baseline: 0, smart: 0 }; }
}
