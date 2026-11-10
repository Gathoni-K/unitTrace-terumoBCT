import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './unknownPatientBloodGroup.js';

const dummyConfig = {} as CountryConfig;

describe('unknownPatientBloodGroup detector', () => {
  it('returns one finding per affected request', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { request_id: 'REQ-001', urgency: 'emergency' },
          { request_id: 'REQ-002', urgency: 'routine' },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      type: 'unknown_patient_blood_group',
      recordIds: ['REQ-001'],
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'unknown_patient_blood_group:REQ-001',
    });
    expect(findings[0].reason).toContain('REQ-001');
    expect(findings[0].reason).toContain('Compatibility cannot be verified');
  });

  it('returns empty array when all requests have known blood groups', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;

    expect(await run(mockPool, dummyConfig)).toEqual([]);
  });

  it('dedupeKey is stable and unique per request', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ request_id: 'REQ-X', urgency: 'emergency' }],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings[0].dedupeKey).toBe('unknown_patient_blood_group:REQ-X');
  });
});

