import Dexie, { type Table } from 'dexie';
import type { DataClient, Decision } from '@workbench/shared';

class OfflineDatabase extends Dexie {
  pendingDecisions!: Table<Decision, string>;
  constructor() {
    super('workbench-offline');
    this.version(1).stores({ pendingDecisions: 'id, taskId, createdAt' });
  }
}
export const offlineDb = new OfflineDatabase();
export async function syncPending(client: DataClient): Promise<void> {
  // TODO: call DataClient.recordDecision for each queued decision, then remove successful entries.
  if (!navigator.onLine) return;
  void client;
}
