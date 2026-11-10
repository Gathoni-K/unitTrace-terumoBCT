import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './duplicateDonors.js';

describe('duplicateDonors detector', () => {
  const dummyConfig = {} as CountryConfig;

  it('queries duplicate donor groups and formats findings correctly', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [
        {
          birth_date: '2006-06-24',
          sex: 'M',
          home_county: 'Machakos',
          phone_last4: '3653',
          group_count: 2,
          donor_ids: ['DNR-000453', 'DNR-046399'],
        },
      ],
    });
    const mockPool = { query: mockQuery } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual({
      type: 'duplicate_donor',
      recordIds: ['DNR-000453', 'DNR-046399'],
      suggestion: {
        action: 'merge_donors',
        primaryDonorId: 'DNR-000453',
        duplicateDonorIds: ['DNR-046399'],
      },
      reason: 'Found 2 donor records sharing birth date (2006-06-24), sex (M), home county (Machakos), and phone ending in 3653.',
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'duplicate_donor:DNR-000453:DNR-046399',
    });
  });

  it('handles empty results gracefully', async () => {
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as Pool;
    const findings = await run(mockPool, dummyConfig);
    expect(findings).toEqual([]);
  });
});
