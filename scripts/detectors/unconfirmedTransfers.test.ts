import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './unconfirmedTransfers.js';

const dummyConfig = {} as CountryConfig;

describe('unconfirmedTransfers detector', () => {
  it('returns one finding per unconfirmed transfer', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { transfer_id: 'TRF-001', to_facility_id: 'HSP-005', dispatched_at: '2025-11-01 12:00:00' },
          { transfer_id: 'TRF-002', to_facility_id: 'HSP-012', dispatched_at: '2025-11-02 08:00:00' },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      type: 'unconfirmed_transfer',
      recordIds: ['TRF-001'],
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'unconfirmed_transfer:TRF-001',
    });
    expect(findings[0].reason).toContain('TRF-001');
    expect(findings[0].reason).toContain('HSP-005');
    expect(findings[0].reason).toContain('never confirmed received');
  });

  it('returns empty array when all transfers are confirmed', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;

    expect(await run(mockPool, dummyConfig)).toEqual([]);
  });

  it('dedupeKey is stable and unique per transfer', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ transfer_id: 'TRF-XYZ', to_facility_id: 'HSP-001', dispatched_at: '2025-11-01 00:00:00' }],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings[0].dedupeKey).toBe('unconfirmed_transfer:TRF-XYZ');
  });
});

