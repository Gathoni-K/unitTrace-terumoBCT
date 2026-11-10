import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './fuzzyDuplicates.js';

const mockConfig = {
  fuzzyDuplicates: {
    threshold: 0.8,
    weightBirthDate: 0.5,
    weightCounty: 0.3,
    weightPhone: 0.2,
    loggerGapHours: 6,
  },
} as unknown as CountryConfig;

describe('fuzzyDuplicates detector', () => {
  it('detects high-confidence fuzzy duplicate pairs above threshold', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            donor_id: 'DNR-001',
            birth_date: '1995-04-12',
            home_county: 'Nairobi',
            phone_last4: '4567',
            sex: 'M',
          },
          {
            donor_id: 'DNR-002',
            birth_date: '1995-04-12',
            home_county: 'NAIROBI ',
            phone_last4: '4567',
            sex: 'M',
          },
          // Third donor with different birth date and county
          {
            donor_id: 'DNR-003',
            birth_date: '1980-01-01',
            home_county: 'Mombasa',
            phone_last4: '4567',
            sex: 'M',
          },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, mockConfig);

    // Only DNR-001 and DNR-002 should exceed threshold 0.8
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      type: 'duplicate_donor',
      recordIds: ['DNR-001', 'DNR-002'],
      source: 'ai',
      dedupeKey: 'duplicate_donor:DNR-001:DNR-002',
    });
    expect(findings[0].confidence).toBeGreaterThanOrEqual(0.8);
    expect(findings[0].suggestion).toHaveProperty('matched_fields');
  });

  it('returns empty array when candidates score below threshold', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            donor_id: 'DNR-A',
            birth_date: '1990-01-01',
            home_county: 'Nairobi',
            phone_last4: '1111',
            sex: 'F',
          },
          {
            donor_id: 'DNR-B',
            birth_date: '2005-12-12',
            home_county: 'Kisumu',
            phone_last4: '1111',
            sex: 'F',
          },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, mockConfig);
    expect(findings).toEqual([]);
  });
});

