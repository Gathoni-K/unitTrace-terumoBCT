/* ==========================================================================
   packages/web/src/api.ts
   Real API client — talks to Gathoni's live backend
   ========================================================================== */

const API_BASE = 'https://unittrace-terumobct.onrender.com';

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
  sensor_glitch: 'device_thermostat',
  logger_gap: 'cloud_off',
  missing_donor_blood_group: 'bloodtype',
  unknown_patient_blood_group: 'emergency',
  unconfirmed_transfer: 'local_shipping',
  donation_too_soon: 'timelapse',
};
