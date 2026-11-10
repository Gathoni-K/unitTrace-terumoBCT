import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './missingDonorBloodGroup.js';

const dummyConfig = {} as CountryConfig;

describe('missingDonorBloodGroup detector', () => {
  it('returns one finding per donor missing a blood group', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ donor_id: 'DNR-000042' }, { donor_id: 'DNR-001337' }],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      type: 'missing_donor_blood_group',
      recordIds: ['DNR-000042'],
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'missing_donor_blood_group:DNR-000042',
    });
    expect(findings[0].reason).toContain('DNR-000042');
    expect(findings[0].reason).toContain('no recorded blood group');
  });

  it('returns empty array when no donors are missing blood groups', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;

    expect(await run(mockPool, dummyConfig)).toEqual([]);
  });

  it('dedupeKey is stable and unique per donor', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ donor_id: 'DNR-AAA' }, { donor_id: 'DNR-BBB' }],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    const keys = findings.map((f) => f.dedupeKey);
    expect(new Set(keys).size).toBe(2);
    expect(keys[0]).toBe('missing_donor_blood_group:DNR-AAA');
  });
});

