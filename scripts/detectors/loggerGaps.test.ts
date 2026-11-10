import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './loggerGaps.js';

const mockConfig = {
  fuzzyDuplicates: {
    threshold: 0.8,
    weightBirthDate: 0.5,
    weightCounty: 0.3,
    weightPhone: 0.2,
    loggerGapHours: 6,
  },
} as unknown as CountryConfig;

describe('loggerGaps detector', () => {
  it('flags facility temperature logger gaps above threshold', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            facility_id: 'HSP-031',
            gap_start_iso: '2025-11-05T12:00:00Z',
            gap_end_iso: '2025-11-05T20:00:00Z',
            gap_hours: 8,
          },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, mockConfig);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      type: 'logger_gap',
      recordIds: ['HSP-031'],
      dedupeKey: 'logger_gap:HSP-031:2025-11-05T12:00:00Z:2025-11-05T20:00:00Z',
      confidence: 'rule',
      source: 'rule',
    });
    expect(findings[0].reason).toContain('8 hours');
    expect(findings[0].reason).toContain('HSP-031');
  });

  it('returns empty array when no gaps exceed threshold', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;

    expect(await run(mockPool, mockConfig)).toEqual([]);
  });
});

