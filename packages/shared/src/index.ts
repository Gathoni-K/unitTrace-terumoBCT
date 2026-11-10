import { z } from 'zod';

export const roles = ['clerk', 'supervisor'] as const;
export type Role = (typeof roles)[number];
export const taskTypes = [
  'duplicate_donor',
  'facility_name',
  'sensor_glitch',
  'logger_gap',
  'missing_donor_blood_group',
  'unknown_patient_blood_group',
  'unconfirmed_transfer',
  'donation_too_soon',
  'invalid_isbt128',
  'implausible',
] as const;
export type TaskType = (typeof taskTypes)[number];
export const confidences = ['high', 'medium', 'low', 'rule'] as const;
export type Confidence = (typeof confidences)[number];
export const taskStatuses = ['open', 'waiting_supervisor', 'done', 'escalated'] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const decisionActions = ['accept', 'change', 'reject', 'approve', 'send_back', 'escalate'] as const;
export type DecisionAction = (typeof decisionActions)[number];
export const channels = ['web', 'offline_sync', 'sms', 'ussd'] as const;
export type Channel = (typeof channels)[number];

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  recordIds: string[];
  suggestion: string;
  reason: string;
  confidence: Confidence;
  source: 'rule' | 'smart';
  createdAt: string;
}

export interface Decision {
  id: string;
  taskId: string;
  action: DecisionAction;
  channel: Channel;
  userId: string;
  note?: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  taskId: string;
  actorId: string;
  action: DecisionAction;
  channel: Channel;
  createdAt: string;
}

export interface Finding {
  type: TaskType;
  recordIds: string[];
  suggestion: string | Record<string, unknown>;
  reason: string;
  confidence: Confidence | number;
  source: 'rule' | 'smart' | 'ai';
  dedupeKey?: string;
}

export const countryConfigSchema = z.object({
  countryCode: z.string().length(2),
  displayName: z.string(),
  brandName: z.string(),
  languages: z.array(z.string()).min(1),
  defaultLanguage: z.string(),
  phoneFormatRegex: z.string(),
  safeTempRange: z.object({ minC: z.number(), maxC: z.number() }),
  minDonationGapMonths: z.object({ male: z.number(), female: z.number() }),
  sensorGlitchValues: z.array(z.number()),
  facilityNameAliases: z.record(z.string()),
  smartMatchThreshold: z.number().min(0).max(1),
  lockedFields: z.array(z.string()),
  smsTemplates: z.record(z.record(z.string())),
  enable_fuzzy_matching: z.boolean().default(true).optional(),
  enableFuzzyMatching: z.boolean().default(true).optional(),
  isbt128Regex: z.string().optional(),
  fuzzyDuplicates: z.object({
    threshold: z.number().min(0).max(1),
    weightBirthDate: z.number().min(0).max(1),
    weightCounty: z.number().min(0).max(1),
    weightPhone: z.number().min(0).max(1),
    loggerGapHours: z.number().positive(),
  }),
});
export type CountryConfig = z.infer<typeof countryConfigSchema>;

export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
}
export interface DecisionFilters {
  taskId?: string;
}
export interface AuditFilters {
  taskId?: string;
}

export interface DataClient {
  listTasks(filters?: TaskFilters): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  recordDecision(decision: Decision): Promise<void>;
  listDecisions(filters?: DecisionFilters): Promise<Decision[]>;
  listAuditEntries(filters?: AuditFilters): Promise<AuditEntry[]>;
  getSummaryCounts(): Promise<Record<TaskStatus, number>>;
  getMethodResults(): Promise<Record<string, number>>;
}

export type SmsCommandResult =
  | { taskId: number; action: 'accept' | 'reject' }
  | { error: string };

export function parseSmsCommand(text: string, lockedFields: readonly string[] = []): SmsCommandResult {
  const normalized = text.trim();
  if (lockedFields.some((field) => normalized.toLowerCase().includes(field.toLowerCase()))) {
    return { error: 'This command mentions a locked field.' };
  }
  const match = /^(\d+)\s+(OK|NO)$/i.exec(normalized);
  if (!match) return { error: 'Expected a command such as "41 OK" or "41 NO".' };
  return { taskId: Number(match[1]), action: match[2].toUpperCase() === 'OK' ? 'accept' : 'reject' };
}
