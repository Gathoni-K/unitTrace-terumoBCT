/* ==========================================================================
   packages/web/src/api.ts
   Real API client — talks to Gathoni's live backend
   ========================================================================== */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://unittrace-terumobct.onrender.com';

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

  const res = await fetch(`${API_BASE}/api/tasks?${query.toString()}`);
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
  const res = await fetch(`${API_BASE}/api/metrics/before-after`);
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
  const res = await fetch(`${API_BASE}/api/audit?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.status}`);
  return res.json();
}

/* ==========================================================================
   Task Detail API functions
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

export async function getTask(id: string): Promise<TaskRecord> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}`);
  if (!res.ok) throw new Error(`Failed to get task: ${res.status}`);
  return res.json();
}

export async function revealTaskPii(id: string): Promise<TaskRecord> {
  const res = await fetch(`${API_BASE}/api/tasks/${id}/reveal`);
  if (!res.ok) throw new Error(`Failed to reveal PII: ${res.status}`);
  return res.json();
}

export async function submitDecision(id: string, payload: DecisionPayload): Promise<{ ok: boolean; task?: TaskRecord }> {
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
