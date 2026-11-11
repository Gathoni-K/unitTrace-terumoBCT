import type { Pool, PoolClient } from 'pg';
import { ensureCleanTables, applyDecisionFix } from './cleanTables.js';
import { maskTaskPii } from '../lib/masking.js';

export interface ListTasksOptions {
  status?: string;
  type?: string;
  source?: string;
  limit?: number;
  offset?: number;
  mask?: boolean;
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

export interface DecisionPayload {
  action: 'accept' | 'change' | 'reject' | 'approve' | 'send_back' | 'escalate';
  modified_suggestion?: Record<string, unknown>;
  user_id?: string;
  actor?: string;
  user_role?: 'clerk' | 'supervisor';
  ip_address?: string;
  channel?: 'web' | 'offline_sync' | 'sms' | 'ussd';
  note?: string;
}

export async function listTasks(
  pool: Pool | PoolClient,
  options: ListTasksOptions = {},
): Promise<{ tasks: TaskRecord[]; total: number; limit: number; offset: number }> {
  const status = options.status ?? 'open';
  const limit = Math.max(1, Math.min(options.limit ?? 50, 500));
  const offset = Math.max(0, options.offset ?? 0);

  const whereClauses: string[] = ['status = $1'];
  const params: unknown[] = [status];
  let paramIndex = 2;

  if (options.type) {
    whereClauses.push(`type = $${paramIndex}`);
    params.push(options.type);
    paramIndex++;
  }

  if (options.source) {
    whereClauses.push(`source = $${paramIndex}`);
    params.push(options.source);
    paramIndex++;
  }

  const whereSql = whereClauses.join(' and ');

  const countRes = await pool.query<{ count: string }>(
    `select count(*)::text as count from public.tasks where ${whereSql}`,
    params,
  );
  const total = Number(countRes.rows[0]?.count ?? 0);

  const queryParams = [...params, limit, offset];
  const tasksRes = await pool.query<{
    task_id: string | number;
    type: string;
    status: string;
    record_ids: unknown;
    suggestion: unknown;
    reason: string;
    confidence: string;
    source: string;
    created_at: string;
    dedupe_key: string | null;
  }>(
    `select
       task_id,
       type,
       status,
       record_ids,
       suggestion,
       reason,
       confidence,
       source,
       created_at::text as created_at,
       dedupe_key
     from public.tasks
     where ${whereSql}
     order by task_id asc
     limit $${paramIndex} offset $${paramIndex + 1}`,
    queryParams,
  );

  const tasks: TaskRecord[] = tasksRes.rows.map((row) => {
    let recordIds: string[] = [];
    if (Array.isArray(row.record_ids)) {
      recordIds = row.record_ids;
    } else if (typeof row.record_ids === 'string') {
      try {
        recordIds = JSON.parse(row.record_ids);
      } catch {
        recordIds = [row.record_ids];
      }
    }

    let suggestion: unknown = row.suggestion;
    if (typeof row.suggestion === 'string') {
      try {
        suggestion = JSON.parse(row.suggestion);
      } catch {
        suggestion = row.suggestion;
      }
    }

    const task: TaskRecord = {
      id: String(row.task_id),
      type: row.type,
      status: row.status,
      recordIds,
      suggestion,
      reason: row.reason,
      confidence: row.confidence,
      source: row.source,
      createdAt: row.created_at,
      dedupeKey: row.dedupe_key,
    };

    return options.mask === false ? task : maskTaskPii(task);
  });

  return { tasks, total, limit, offset };
}

export async function getTask(
  pool: Pool | PoolClient,
  id: number | string,
  mask = true,
): Promise<TaskRecord | null> {
  const strId = String(id).trim();
  if (!/^\d+$/.test(strId)) {
    return null;
  }

  const res = await pool.query<{
    task_id: string | number;
    type: string;
    status: string;
    record_ids: unknown;
    suggestion: unknown;
    reason: string;
    confidence: string;
    source: string;
    created_at: string;
    dedupe_key: string | null;
  }>(
    `select
       task_id,
       type,
       status,
       record_ids,
       suggestion,
       reason,
       confidence,
       source,
       created_at::text as created_at,
       dedupe_key
     from public.tasks
     where task_id = $1`,
    [id],
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  let recordIds: string[] = [];
  if (Array.isArray(row.record_ids)) {
    recordIds = row.record_ids;
  } else if (typeof row.record_ids === 'string') {
    try {
      recordIds = JSON.parse(row.record_ids);
    } catch {
      recordIds = [row.record_ids];
    }
  }

  let suggestion: unknown = row.suggestion;
  if (typeof row.suggestion === 'string') {
    try {
      suggestion = JSON.parse(row.suggestion);
    } catch {
      suggestion = row.suggestion;
    }
  }

  const task: TaskRecord = {
    id: String(row.task_id),
    type: row.type,
    status: row.status,
    recordIds,
    suggestion,
    reason: row.reason,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at,
    dedupeKey: row.dedupe_key,
  };

  return mask ? maskTaskPii(task) : task;
}

export async function revealTask(
  pool: Pool,
  taskId: number | string,
  userId?: string,
): Promise<TaskRecord> {
  const task = await getTask(pool, taskId, false);
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }

  const validUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ? userId
    : null;

  await pool.query(
    `insert into public.access_log (user_id, event, record_type, record_id)
     values ($1, 'task_pii_reveal', 'task', $2)`,
    [validUuid, String(taskId)],
  );

  return task;
}

export async function submitDecision(
  pool: Pool,
  taskId: number | string,
  payload: DecisionPayload,
): Promise<{ success: boolean; taskId: string; action: string; status: string; auditId?: string }> {
  const strTaskId = String(taskId).trim();
  if (!/^\d+$/.test(strTaskId)) {
    const notFoundError = new Error(`Task ${taskId} not found.`);
    (notFoundError as { statusCode?: number }).statusCode = 404;
    throw notFoundError;
  }

  const client = await pool.connect();
  try {
    await client.query('begin;');

    // 1. Fetch task with exclusive row lock
    const taskRes = await client.query<{
      task_id: string | number;
      type: string;
      status: string;
      record_ids: unknown;
      suggestion: unknown;
    }>('select task_id, type, status, record_ids, suggestion from public.tasks where task_id = $1 for update', [
      strTaskId,
    ]);

    if (taskRes.rows.length === 0) {
      const notFoundError = new Error(`Task ${taskId} not found.`);
      (notFoundError as { statusCode?: number }).statusCode = 404;
      throw notFoundError;
    }

    const task = taskRes.rows[0];
    const previousStatus = task.status;

    // Concurrency / Conflict Check: reject decisions on already resolved tasks
    if (previousStatus === 'done' || previousStatus === 'resolved') {
      const conflictError = new Error(`Task ${taskId} is already resolved (${previousStatus}).`);
      (conflictError as { statusCode?: number }).statusCode = 409;
      throw conflictError;
    }

    // RBAC: duplicate_donor merges strictly require 'supervisor' role
    const effectiveRole = payload.user_role === 'supervisor' ? 'supervisor' : 'clerk';
    if (task.type === 'duplicate_donor' && effectiveRole !== 'supervisor') {
      const forbiddenError = new Error('Forbidden: Only supervisors are authorized to decide on duplicate donor merges.');
      (forbiddenError as { statusCode?: number }).statusCode = 403;
      throw forbiddenError;
    }

    // 2. Compute after_value and next_status
    let afterValue: unknown = null;
    let nextStatus = previousStatus;

    if (payload.action === 'accept') {
      afterValue = task.suggestion;
      nextStatus = task.type === 'facility_name' ? 'waiting_supervisor' : 'done';
    } else if (payload.action === 'change') {
      afterValue = payload.modified_suggestion ?? task.suggestion;
      nextStatus = task.type === 'facility_name' ? 'waiting_supervisor' : 'done';
    } else if (payload.action === 'reject') {
      afterValue = null;
      nextStatus = 'done';
    } else if (payload.action === 'escalate') {
      nextStatus = 'escalated';
    } else if (payload.action === 'approve') {
      nextStatus = 'done';
    } else if (payload.action === 'send_back') {
      nextStatus = 'open';
    }

    // 3. Update task status
    await client.query('update public.tasks set status = $1 where task_id = $2', [nextStatus, taskId]);

    // 4. Record decision
    const channel = payload.channel ?? 'web';
    const userId = payload.user_id ?? null;
    const userRole = payload.user_role ?? 'clerk';
    const ipAddress = payload.ip_address ?? '127.0.0.1';
    const note = payload.note ?? (payload.actor ? `Action by ${payload.actor}` : null);

    await client.query(
      `insert into public.decisions (task_id, user_id, role, action, note, channel)
       values ($1, $2, $3, $4, $5, $6)`,
      [taskId, userId, userRole, payload.action, note, channel],
    );

    // 5. Record audit log with channel, ip_address, and user_role
    const auditRes = await client.query<{ id: string }>(
      `insert into public.audit_log (user_id, action, task_id, before_value, after_value)
       values ($1, $2, $3, $4::jsonb, $5::jsonb)
       returning id`,
      [
        userId,
        payload.action,
        taskId,
        JSON.stringify({ status: previousStatus, suggestion: task.suggestion }),
        JSON.stringify({
          status: nextStatus,
          fix: afterValue,
          channel,
          actor: payload.actor ?? null,
          ip_address: ipAddress,
          user_role: userRole,
        }),
      ],
    );

    // 6. Apply approved fix to clean tables copy
    await ensureCleanTables(client);
    await applyDecisionFix(client, task, payload.action as 'accept' | 'change' | 'reject', afterValue);

    await client.query('commit;');

    return {
      success: true,
      taskId: String(taskId),
      action: payload.action,
      status: nextStatus,
      auditId: auditRes.rows[0]?.id ? String(auditRes.rows[0].id) : undefined,
    };
  } catch (err) {
    await client.query('rollback;');
    throw err;
  } finally {
    client.release();
  }
}

export interface AuditLogEntry {
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

export async function listAuditLogs(
  pool: Pool | PoolClient,
  limit = 20,
): Promise<AuditLogEntry[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const res = await pool.query<{
    id: string | number;
    at: string | Date;
    user_id: string | null;
    action: string;
    task_id: string | number | null;
    after_value: unknown;
  }>(
    `select
       id,
       at,
       user_id::text as user_id,
       action,
       task_id,
       after_value
     from public.audit_log
     order by at desc, id desc
     limit $1`,
    [safeLimit],
  );

  return res.rows.map((row) => {
    let afterObj: Record<string, unknown> = {};
    if (typeof row.after_value === 'object' && row.after_value !== null) {
      afterObj = row.after_value as Record<string, unknown>;
    } else if (typeof row.after_value === 'string') {
      try {
        afterObj = JSON.parse(row.after_value);
      } catch {
        afterObj = {};
      }
    }

    return {
      id: String(row.id),
      timestamp: row.at instanceof Date ? row.at.toISOString() : String(row.at),
      user_id: row.user_id ?? null,
      action: row.action,
      task_id: row.task_id != null ? String(row.task_id) : null,
      channel: typeof afterObj.channel === 'string' ? afterObj.channel : null,
      user_role: typeof afterObj.user_role === 'string' ? afterObj.user_role : null,
      ip_address: typeof afterObj.ip_address === 'string' ? afterObj.ip_address : null,
      actor: typeof afterObj.actor === 'string' ? afterObj.actor : null,
    };
  });
}


