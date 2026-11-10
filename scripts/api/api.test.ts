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
      headers: { 'Content-Type': 'application/json' },
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
});

