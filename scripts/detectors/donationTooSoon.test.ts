import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './donationTooSoon.js';

const mockConfig = {
  minDonationGapMonths: { male: 3, female: 4 },
} as unknown as CountryConfig;

describe('donationTooSoon detector', () => {
  it('flags donations violating minimum gap intervals', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            donation_id: 'DON-001',
            donor_id: 'DNR-001',
            collection_date: '2025-10-20',
            prev_collection_date: '2025-09-25',
            gap_days: 25,
            sex: 'F',
          },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, mockConfig);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      type: 'donation_too_soon',
      recordIds: ['DON-001', 'DNR-001'],
      dedupeKey: 'donation_too_soon:DON-001',
      confidence: 'rule',
      source: 'rule',
    });
    expect(findings[0].reason).toContain('25 days');
    expect(findings[0].reason).toContain('minimum interval of 120 days');
  });

  it('returns empty array when all donations respect intervals', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;

    expect(await run(mockPool, mockConfig)).toEqual([]);
  });
});

