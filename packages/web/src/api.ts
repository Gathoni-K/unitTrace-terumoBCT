/* ==========================================================================
   packages/web/src/api.ts
   Real API client — talks to live backend
   ========================================================================== */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://unittrace-terumobct.onrender.com';

function getHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

export interface TaskRecord {
  id: string;
  type: string;
  status: string;
  recordIds: string[];
  suggestion: unknown;
  reason: string;
  confidence: string;
  source: string;
  createdAt: string;
  dedupeKey: string | null;
}

export interface TaskListResponse {
  tasks: TaskRecord[];
  total: number;
  limit: number;
  offset: number;
}

export async function listTasks(
  params: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<TaskListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE}/api/tasks?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list tasks: ${res.status}`);
  return res.json();
}

export const TASK_TYPE_LABELS: Record<string, string> = {
  duplicate_donor: 'Possible duplicate donor',
  facility_name: 'Facility name mismatch',
  implausible: 'Implausible Data',
  invalid_isbt128: 'Invalid ISBT 128 ID',
  sensor_glitch: 'Sensor glitch',
  logger_gap: 'Temperature logger gap',
  missing_donor_blood_group: 'Missing donor blood group',
  unknown_patient_blood_group: 'Unknown patient blood group',
  unconfirmed_transfer: 'Unconfirmed transfer',
  donation_too_soon: 'Donation too close together',
};

export const TASK_TYPE_ICONS: Record<string, string> = {
  duplicate_donor: 'people',
  facility_name: 'domain_disabled',
  implausible: 'domain_disabled',
  invalid_isbt128: 'badge',
  sensor_glitch: 'device_thermostat',
  logger_gap: 'cloud_off',
  missing_donor_blood_group: 'bloodtype',
  unknown_patient_blood_group: 'emergency',
  unconfirmed_transfer: 'local_shipping',
  donation_too_soon: 'timelapse',
};

/* ==========================================================================
   Metrics API
   ========================================================================== */

export interface BeforeAfterReport {
  headlineMetric: string;
  beforeValue: number;
  afterValue: number;
  resolvedCount: number;
  improvementPercentage: string;
  summaryText: string;
  taskBreakdown: {
    type: string;
    beforeOpen: number;
    afterResolved: number;
    improvementPercentage: string;
  }[];
}

export async function getMetrics(): Promise<BeforeAfterReport> {
  const res = await fetch(`${API_BASE}/api/metrics/before-after`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
  return res.json();
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user_id: string | null;
  action: string;
  task_id: string | null;
  channel: string | null;
  user_role: string | null;
  ip_address: string | null;
  actor?: string | null;
}

export async function getAuditLogs(limit = 20): Promise<AuditLogItem[]> {
  const res = await fetch(`${API_BASE}/api/audit?limit=${limit}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.status}`);
  return res.json();
}

export async function getAuditEntries(limit = 50): Promise<{ entries: AuditLogItem[] }> {
  const res = await fetch(`${API_BASE}/api/audit?limit=${limit}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch audit entries: ${res.status}`);
  const data: unknown = await res.json();
  // Backend may return an array or { entries: [] }
  if (Array.isArray(data)) return { entries: data as AuditLogItem[] };
  return data as { entries: AuditLogItem[] };
}

/* ==========================================================================
   Task Detail API functions & Offline PWA Queue
   ========================================================================== */

export interface DecisionPayload {
  action: 'accept' | 'change' | 'reject' | 'approve' | 'send_back' | 'escalate';
  modified_suggestion?: Record<string, unknown>;
  user_id?: string;
  actor?: string;
  user_role?: 'clerk' | 'supervisor';
  channel?: 'web' | 'offline_sync' | 'sms' | 'ussd';
  note?: string;
}

export interface QueuedDecision {
  id?: number;
  taskId: string;
  payload: DecisionPayload;
  queuedAt: string;
}

interface UnitTraceDB extends DBSchema {
  decisions_queue: {
    key: number;
    value: QueuedDecision;
    indexes: { 'by-task': string };
  };
}

const DB_NAME = 'unittrace-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'decisions_queue';

let dbPromise: Promise<IDBPDatabase<UnitTraceDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<UnitTraceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UnitTraceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-task', 'taskId');
        }
      },
    });
  }
  return dbPromise;
}

export async function getTask(id: string): Promise<TaskRecord> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to get task: ${res.status}`);
  return res.json();
}

export async function revealTaskPii(id: string, userId?: string): Promise<TaskRecord> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }

  const res = await fetch(`${API_BASE}/api/tasks/${id}/reveal`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`Failed to reveal PII: ${res.status}`);
  return res.json();
}

export async function submitDecision(
  id: string,
  payload: DecisionPayload,
): Promise<{ ok: boolean; task?: TaskRecord }> {
  const role = payload.user_role ?? 'clerk';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-role': role,
  };
  if (payload.user_id) {
    headers['x-user-id'] = payload.user_id;
  }

  const res = await fetch(`${API_BASE}/api/tasks/${id}/decision`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 403) {
    const err = new Error(
      'Forbidden: Only supervisors can approve duplicate merges. Please switch to Supervisor role.',
    );
    (err as any).status = 403;
    throw err;
  }

  if (!res.ok) {
    let errMessage = `Failed to submit decision: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) {
        errMessage = data.error;
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export interface DecisionResult {
  ok?: boolean;
  status: 'done' | 'queued' | 'open' | 'waiting_supervisor' | string;
  task?: TaskRecord;
}

export async function submitDecisionWithOfflineSync(
  id: string,
  payload: DecisionPayload,
): Promise<DecisionResult> {
  // If navigator reports offline: queue directly to IndexedDB
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const db = await getDb();
    await db.add(STORE_NAME, {
      taskId: id,
      payload: { ...payload, channel: 'offline_sync' },
      queuedAt: new Date().toISOString(),
    });
    return { ok: true, status: 'queued' };
  }

  try {
    const res = await submitDecision(id, payload);
    return {
      ok: res.ok,
      status: (res.task?.status as string) || 'done',
      task: res.task,
    };
  } catch (err) {
    // If a network connection error happens, queue to IndexedDB as well
    const isNetworkError =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      (err instanceof TypeError && err.message.toLowerCase().includes('fetch'));

    if (isNetworkError) {
      const db = await getDb();
      await db.add(STORE_NAME, {
        taskId: id,
        payload: { ...payload, channel: 'offline_sync' },
        queuedAt: new Date().toISOString(),
      });
      return { ok: true, status: 'queued' };
    }
    throw err;
  }
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const items = await tx.store.getAll();
  await tx.done;

  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await submitDecision(item.taskId, item.payload);
      if (item.id !== undefined) {
        await db.delete(STORE_NAME, item.id);
      }
      synced++;
    } catch (err) {
      // If already resolved (e.g. concurrent review or sync), clear from local queue to prevent duplicate processing
      if ((err as Error).message.includes('already resolved')) {
        if (item.id !== undefined) {
          await db.delete(STORE_NAME, item.id);
        }
        synced++;
      } else {
        console.error(`[Offline Sync] Failed to sync decision for task ${item.taskId}:`, err);
        failed++;
      }
    }
  }

  return { synced, failed };
}
