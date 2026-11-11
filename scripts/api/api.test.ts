import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Pool } from 'pg';
import { createServer } from './app.js';
import type http from 'node:http';

describe('Task Management API', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  const mockQuery = vi.fn();
  const mockClientQuery = vi.fn();
  const mockRelease = vi.fn();

  const mockPool = {
    query: mockQuery,
    connect: vi.fn().mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    }),
  } as unknown as Pool;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = createServer(mockPool);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          port = addr.port;
          baseUrl = `http://127.0.0.1:${port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/health returns 200 and status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('GET /api/audit returns recent audit log entries with required fields', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          at: '2026-11-10T22:00:00Z',
          user_id: 'clerk-sarah',
          action: 'accept',
          task_id: 41,
          after_value: {
            channel: 'web',
            user_role: 'clerk',
            ip_address: '192.168.1.5',
            actor: 'Sarah Achieng',
          },
        },
      ],
    });

    const res = await fetch(`${baseUrl}/api/audit`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: '1',
      timestamp: expect.any(String),
      user_id: 'clerk-sarah',
      action: 'accept',
      task_id: '41',
      channel: 'web',
      user_role: 'clerk',
      ip_address: '192.168.1.5',
    });
  });

  it('CORS headers allow x-user-role and x-user-id in preflight and responses', async () => {
    const res = await fetch(`${baseUrl}/api/tasks`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    const allowHeaders = res.headers.get('access-control-allow-headers');
    expect(allowHeaders).toContain('x-user-role');
    expect(allowHeaders).toContain('x-user-id');
  });

  it('GET /api/tasks returns paginated task list', async () => {
    mockQuery
      // Count query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      // Task rows query
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: '101',
            type: 'duplicate_donor',
            status: 'open',
            record_ids: ['DNR-001', 'DNR-002'],
            suggestion: { action: 'review_merge' },
            reason: 'Similar name and phone',
            confidence: 'high',
            source: 'smart',
            created_at: '2026-01-01T00:00:00Z',
            dedupe_key: 'duplicate_donor:DNR-001:DNR-002',
          },
        ],
      });

    const res = await fetch(`${baseUrl}/api/tasks?status=open&type=duplicate_donor`);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.total).toBe(1);
    expect(json.tasks).toHaveLength(1);
    expect(json.tasks[0]).toMatchObject({
      id: '101',
      type: 'duplicate_donor',
      status: 'open',
      recordIds: ['DNR-001', 'DNR-002'],
    });
  });

  it('GET /api/tasks/:id returns 404 when task not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await fetch(`${baseUrl}/api/tasks/999`);
    expect(res.status).toBe(404);
  });

  it('POST /api/tasks/:id/decision validates action and records decision', async () => {
    mockClientQuery
      // BEGIN
      .mockResolvedValueOnce({})
      // SELECT FOR UPDATE
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 101,
            type: 'duplicate_donor',
            status: 'open',
            record_ids: ['DNR-001', 'DNR-002'],
            suggestion: { action: 'review_merge', primaryDonorId: 'DNR-001', duplicateDonorIds: ['DNR-002'] },
          },
        ],
      })
      // UPDATE status
      .mockResolvedValueOnce({})
      // INSERT decisions
      .mockResolvedValueOnce({})
      // INSERT audit_log
      .mockResolvedValueOnce({ rows: [{ id: '555' }] })
      // ensureCleanTables (DDL)
      .mockResolvedValueOnce({})
      // ensureCleanTables (initial insert)
      .mockResolvedValueOnce({})
      // applyDecisionFix (update donors_clean)
      .mockResolvedValueOnce({})
      // COMMIT
      .mockResolvedValueOnce({});

    const res = await fetch(`${baseUrl}/api/tasks/101/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'supervisor' },
      body: JSON.stringify({ action: 'accept' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      taskId: '101',
      action: 'accept',
      status: 'done',
    });
  });

  it('POST /api/tasks/:id/decision rejects invalid actions', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/101/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid_action' }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('must be one of');
  });

  it('POST /api/tasks/:id/decision returns 403 when clerk attempts duplicate_donor decision', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 101,
            type: 'duplicate_donor',
            status: 'open',
            record_ids: ['DNR-001', 'DNR-002'],
            suggestion: { action: 'review_merge' },
          },
        ],
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const res = await fetch(`${baseUrl}/api/tasks/101/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'clerk',
      },
      body: JSON.stringify({ action: 'accept' }),
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
    expect(json.error).toContain('supervisors');
  });

  it('POST /api/tasks/:id/decision blocks spoofed x-user-role: superadmin from merging duplicates', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 101,
            type: 'duplicate_donor',
            status: 'open',
            record_ids: ['DNR-001', 'DNR-002'],
            suggestion: { action: 'review_merge' },
          },
        ],
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const res = await fetch(`${baseUrl}/api/tasks/101/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'superadmin', // spoofed role!
      },
      body: JSON.stringify({ action: 'accept' }),
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
    expect(json.error).toContain('supervisors');
  });

  it('POST /api/tasks/:id/decision returns 409 Conflict when task is already resolved', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 101,
            type: 'missing_donor_blood_group',
            status: 'done', // already resolved!
            record_ids: ['DNR-001'],
            suggestion: {},
          },
        ],
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const res = await fetch(`${baseUrl}/api/tasks/101/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'supervisor',
      },
      body: JSON.stringify({ action: 'accept' }),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('already resolved');
  });

  it('POST /api/tasks/:id/decision allows clerk to resolve missing_donor_blood_group', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 202,
            type: 'missing_donor_blood_group',
            status: 'open',
            record_ids: ['DNR-001'],
            suggestion: { action: 'request_confirmatory_typing' },
          },
        ],
      })
      .mockResolvedValueOnce({}) // UPDATE
      .mockResolvedValueOnce({}) // INSERT decisions
      .mockResolvedValueOnce({ rows: [{ id: '901' }] }) // INSERT audit_log
      .mockResolvedValueOnce({}) // ensureCleanTables DDL
      .mockResolvedValueOnce({}) // ensureCleanTables insert
      .mockResolvedValueOnce({}) // applyDecisionFix
      .mockResolvedValueOnce({}); // COMMIT

    const res = await fetch(`${baseUrl}/api/tasks/202/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'clerk',
      },
      body: JSON.stringify({ action: 'accept', modified_suggestion: { blood_group: 'A+' } }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.taskId).toBe('202');
  });

  it('GET /api/tasks masks birth_date and phone in task reason and suggestion', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: '105',
            type: 'duplicate_donor',
            status: 'open',
            record_ids: ['DNR-001', 'DNR-002'],
            suggestion: { action: 'review_merge', birth_date: '1992-04-18', phone_last4: '7788' },
            reason: 'Donors DNR-001 and DNR-002 share the same phone last 4 digits (7788) and born on 1992-04-18.',
            confidence: 'high',
            source: 'smart',
            created_at: '2026-01-01T00:00:00Z',
            dedupe_key: 'duplicate_donor:DNR-001:DNR-002',
          },
        ],
      });

    const res = await fetch(`${baseUrl}/api/tasks`);
    expect(res.status).toBe(200);
    const json = await res.json();
    const task = json.tasks[0];

    expect(task.reason).toContain('XXXX');
    expect(task.reason).toContain('1992-XX-XX');
    expect(task.suggestion.birth_date).toBe('1992-XX-XX');
    expect(task.suggestion.phone_last4).toBe('XXXX');
  });

  it('POST /api/tasks/:id/reveal records access_log audit entry and returns unmasked task', async () => {
    mockQuery
      // getTask query (unmasked)
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: '105',
            type: 'duplicate_donor',
            status: 'open',
            record_ids: ['DNR-001', 'DNR-002'],
            suggestion: { action: 'review_merge', birth_date: '1992-04-18', phone_last4: '7788' },
            reason: 'Donors DNR-001 and DNR-002 share the same phone last 4 digits (7788) and born on 1992-04-18.',
            confidence: 'high',
            source: 'smart',
            created_at: '2026-01-01T00:00:00Z',
            dedupe_key: 'duplicate_donor:DNR-001:DNR-002',
          },
        ],
      })
      // access_log insert
      .mockResolvedValueOnce({});

    const res = await fetch(`${baseUrl}/api/tasks/105/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();

    // Verify unmasked values
    expect(json.reason).toContain('(7788)');
    expect(json.reason).toContain('1992-04-18');
    expect(json.suggestion.birth_date).toBe('1992-04-18');
    expect(json.suggestion.phone_last4).toBe('7788');

    // Verify access_log insert query was invoked with user_id and event
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain('insert into public.access_log');
    expect(mockQuery.mock.calls[1][1]).toEqual(['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '105']);
  });

  it('POST /api/tasks/:id/reveal returns 404 when task ID does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // not found

    const res = await fetch(`${baseUrl}/api/tasks/99999/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('not found');
  });

  it('GET /api/metrics/before-after returns headline metrics', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          type: 'unconfirmed_transfer',
          total: '1046',
          open_count: '0',
          resolved_count: '1046',
        },
      ],
    });

    const res = await fetch(`${baseUrl}/api/metrics/before-after`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.headlineMetric).toBe('Transfer Confirmation & Data Completeness');
    expect(json.summaryText).toContain('1,046');
    expect(json.improvementPercentage).toBe('100.0%');
  });

  describe("Africa's Talking Inbound SMS Webhook", () => {
    it("processes '41 OK' via JSON and records SMS decision", async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              task_id: 41,
              type: 'missing_donor_blood_group',
              status: 'open',
              record_ids: ['DNR-001'],
              suggestion: { bloodGroup: 'O+' },
            },
          ],
        })
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // INSERT decisions
        .mockResolvedValueOnce({ rows: [{ id: '888' }] }) // INSERT audit_log
        .mockResolvedValueOnce({}) // ensureCleanTables DDL
        .mockResolvedValueOnce({}) // ensureCleanTables insert
        .mockResolvedValueOnce({}) // applyDecisionFix
        .mockResolvedValueOnce({}); // COMMIT

      const res = await fetch(`${baseUrl}/api/webhooks/africastalking/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '+254700000000',
          text: '41 OK',
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/plain');
      const text = await res.text();
      expect(text).toBe('Task 41 accepted. Logged to audit trail.');

      // Verify channel passed was 'sms'
      const decisionInsertCall = mockClientQuery.mock.calls.find((c) =>
        c[0].includes('insert into public.decisions'),
      );
      expect(decisionInsertCall).toBeDefined();
      expect(decisionInsertCall?.[1]).toContain('sms');
    });

    it("processes URL-encoded form data '41 NO' and records rejection", async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              task_id: 41,
              type: 'unconfirmed_transfer',
              status: 'open',
              record_ids: ['TRF-001'],
              suggestion: {},
            },
          ],
        })
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // INSERT decisions
        .mockResolvedValueOnce({ rows: [{ id: '889' }] }) // INSERT audit_log
        .mockResolvedValueOnce({}) // ensureCleanTables DDL
        .mockResolvedValueOnce({}) // ensureCleanTables insert
        .mockResolvedValueOnce({}); // COMMIT (action === 'reject' does not run applyDecisionFix queries)

      const res = await fetch(`${baseUrl}/api/webhooks/africastalking/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'from=%2B254700000000&text=41+NO',
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/plain');
      const text = await res.text();
      expect(text).toBe('Task 41 rejected. Logged to audit trail.');
    });

    it("returns 200 with format error on invalid text message", async () => {
      const res = await fetch(`${baseUrl}/api/webhooks/africastalking/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '+254700000000',
          text: 'hello',
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/plain');
      const text = await res.text();
      expect(text).toBe("Error: Invalid format. Reply '41 OK' or '41 NO'.");
    });

    it("enforces supervisor merge restriction over SMS", async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              task_id: 99,
              type: 'duplicate_donor',
              status: 'open',
              record_ids: ['DNR-001', 'DNR-002'],
              suggestion: {},
            },
          ],
        })
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await fetch(`${baseUrl}/api/webhooks/africastalking/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '+254700000000',
          text: '99 OK',
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/plain');
      const text = await res.text();
      expect(text).toBe('Error: Only supervisors can approve merges. Please use the web app.');
    });

    it("returns friendly error when SMS references nonexistent task", async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Task not found
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await fetch(`${baseUrl}/api/webhooks/africastalking/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '+254700000000',
          text: '9999 OK',
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('Error: Task 9999 not found.');
    });

    it("returns friendly error when SMS references already resolved task", async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              task_id: 41,
              type: 'unconfirmed_transfer',
              status: 'done', // already resolved!
              record_ids: ['TRF-001'],
              suggestion: {},
            },
          ],
        })
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await fetch(`${baseUrl}/api/webhooks/africastalking/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '+254700000000',
          text: '41 OK',
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('Error: Task 41 is already resolved.');
    });

    it("processes and logs unknown incoming phone numbers", async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              task_id: 42,
              type: 'unconfirmed_transfer',
              status: 'open',
              record_ids: ['TRF-002'],
              suggestion: {},
            },
          ],
        })
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // INSERT decisions
        .mockResolvedValueOnce({ rows: [{ id: '999' }] }) // INSERT audit_log
        .mockResolvedValueOnce({}); // COMMIT

      const res = await fetch(`${baseUrl}/api/webhooks/africastalking/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: '+123456789',
          text: '42 NO',
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('Task 42 rejected. Logged to audit trail.');

      // Check decisions insert logged '+123456789'
      const decisionCall = mockClientQuery.mock.calls.find((c) =>
        c[0].includes('insert into public.decisions'),
      );
      expect(decisionCall?.[1]).toContain('SMS reply from +123456789');
    });
  });
});

