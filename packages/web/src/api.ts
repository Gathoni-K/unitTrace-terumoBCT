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
  duplicate_donor: 'Possible Duplicate Donor',
  inconsistent_facility_name: 'Facility Name Typo',
  facility_name: 'Facility Name Typo',
  implausible: 'Impossible reading',
  invalid_isbt128: 'Invalid barcode ID',
  sensor_glitch: 'Broken Fridge Sensor',
  logger_gap: 'Fridge stopped reporting',
  missing_donor_blood_group: 'Missing Blood Group',
  unknown_patient_blood_group: 'Missing patient blood group',
  unconfirmed_transfer: 'Missing Delivery Receipt',
  donation_too_soon: 'Donor Gave Blood Too Soon',
};

export function formatRecordId(id?: string): string {
  if (!id) return '';
  if (id.startsWith('DNR-')) {
    return `Donor #${id.slice(4)}`;
  }
  if (id.startsWith('UNT-')) {
    return `Unit #${id.slice(4)}`;
  }
  if (id.startsWith('REQ-')) {
    return `Request #${id.slice(4)}`;
  }
  if (id.startsWith('TRF-')) {
    return `Transfer #${id.slice(4)}`;
  }
  if (id.startsWith('DON-')) {
    return `Donation #${id.slice(4)}`;
  }
  if (id.startsWith('HSP-')) {
    return `Hospital #${id.slice(4)}`;
  }
  return id;
}

export function formatFriendlyReason(reason?: string, taskType?: string): string {
  if (!reason) return '';

  // 1. AI duplicate match
  if (/AI similarity score/i.test(reason) || (taskType === 'duplicate_donor' && /duplicates based on/i.test(reason))) {
    return 'Our AI thinks these might be the same person. They share the same gender, phone number ending, and birth date. A human needs to check.';
  }

  // 2. Exact duplicate match
  if (/Exact match on sex, home county, and phone/i.test(reason)) {
    return 'These two records have the exact same gender, home county, and phone number ending. A human needs to check.';
  }

  // 3. Missing donor blood group
  if (/has no recorded blood group/i.test(reason) || /without a confirmed blood group/i.test(reason)) {
    return 'This donor is missing a blood group. We cannot safely match them to a patient in an emergency.';
  }

  // 4. Unknown patient blood group
  if (/unknown patient blood group/i.test(reason)) {
    return 'This emergency request has no patient blood group listed. Doctors cannot check blood compatibility without this.';
  }

  // 5. Unconfirmed transfer
  if (/never confirmed received/i.test(reason) || /missing a receipt confirmation/i.test(reason)) {
    return 'Blood was sent to another hospital, but they never confirmed they received it.';
  }

  // 6. Sensor glitch
  if (/not physically possible for a blood fridge/i.test(reason) || /sensor fault/i.test(reason) || taskType === 'sensor_glitch') {
    return 'The fridge recorded an impossible temperature. The thermometer is probably broken.';
  }

  // 7. Logger gap
  if (/dropped out for/i.test(reason) || /exceeding the \d+h threshold/i.test(reason) || taskType === 'logger_gap') {
    return "The fridge didn't record its temperature for more than 6 hours.";
  }

  // 8. Donation too soon
  if (/below the minimum interval of/i.test(reason) || taskType === 'donation_too_soon') {
    return 'This person gave blood again before it was safe. (Wait 90 days for men, 120 days for women).';
  }

  // 9. Facility name
  const facilityMatch = reason.match(/Facility name '([^']+)' does not match the canonical facility registry '([^']+)'/i);
  if (facilityMatch) {
    return `Hospital name '${facilityMatch[1]}' does not match the official registry '${facilityMatch[2]}'. This stops the record from showing up in national health reports.`;
  }

  // 10. ISBT 128
  if (/does not conform to the ISBT 128/i.test(reason)) {
    return 'The blood bag barcode does not match national barcode standards. This makes it hard to track across hospitals.';
  }

  // Fallback: replace any database column names / snake_case
  return reason
    .replace(/\bphone_last4\b/g, 'Phone ending')
    .replace(/\bbirth_date\b/g, 'Date of birth')
    .replace(/\bhome_county\b/g, 'home county')
    .replace(/\breceived_at\b/g, 'Delivery confirmation')
    .replace(/\bdispatched_at\b/g, 'dispatch time');
}

export const TASK_TYPE_ICONS: Record<string, string> = {
  duplicate_donor: 'people',
  inconsistent_facility_name: 'domain_disabled',
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
      'Error: You must be a Supervisor to do this.',
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
