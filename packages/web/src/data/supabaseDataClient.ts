import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuditFilters, AuditEntry, DataClient, Decision, DecisionFilters, Task, TaskFilters, TaskStatus } from '@workbench/shared';
import type { Database } from '@workbench/shared/db.types';

export function createSupabaseClient(): SupabaseClient<Database> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for the Supabase data source.');
  }
  return createClient<Database>(url, anonKey);
}

export class SupabaseDataClient implements DataClient {
  private readonly client: SupabaseClient<Database>;

  constructor(client = createSupabaseClient()) {
    this.client = client;
  }

  async listTasks(filters?: TaskFilters): Promise<Task[]> {
    void filters; void this.client;
    throw new Error('Supabase listTasks is not implemented.');
  }
  async getTask(id: string): Promise<Task | undefined> {
    void id; throw new Error('Supabase getTask is not implemented.');
  }
  async recordDecision(decision: Decision): Promise<void> {
    void decision; throw new Error('Supabase recordDecision is not implemented.');
  }
  async listDecisions(filters?: DecisionFilters): Promise<Decision[]> {
    void filters; throw new Error('Supabase listDecisions is not implemented.');
  }
  async listAuditEntries(filters?: AuditFilters): Promise<AuditEntry[]> {
    void filters; throw new Error('Supabase listAuditEntries is not implemented.');
  }
  async getSummaryCounts(): Promise<Record<TaskStatus, number>> {
    throw new Error('Supabase getSummaryCounts is not implemented.');
  }
  async getMethodResults(): Promise<Record<string, number>> {
    throw new Error('Supabase getMethodResults is not implemented.');
  }
}
