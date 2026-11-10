import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './invalidIsbt128.js';

const dummyConfig = {
  isbt128Regex: '^(U[0-9]{4}-[A-Z0-9]{3,4}-[0-9]{6}-(RBC|WB|PLT|FFP|CRYO)|[A-Z0-9]{5}\\s?[0-9]{2}\\s?[0-9]{6})$',
} as CountryConfig;

describe('invalidIsbt128 detector', () => {
  it('detects malformed unit IDs', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { unit_id: 'U2509-NBO-000035-CRYO' },
          { unit_id: 'INVALID-UNIT-99' },
          { unit_id: 'W0000 24 123456' },
          { unit_id: 'XYZ!!' },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      type: 'invalid_isbt128',
      recordIds: ['INVALID-UNIT-99'],
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'invalid_isbt128:INVALID-UNIT-99',
    });
    expect(findings[0].reason).toContain('INVALID-UNIT-99');
    expect(findings[0].reason).toContain('ISBT 128');

    expect(findings[1]).toMatchObject({
      type: 'invalid_isbt128',
      recordIds: ['XYZ!!'],
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'invalid_isbt128:XYZ!!',
    });
  });

  it('returns empty array when all unit IDs conform to standard', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { unit_id: 'U2509-NBO-000035-CRYO' },
          { unit_id: 'U2509-KSM-000169-FFP' },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings).toEqual([]);
  });

  it('dedupeKey is stable and unique per unit', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ unit_id: 'BAD-1' }, { unit_id: 'BAD-2' }],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings[0].dedupeKey).toBe('invalid_isbt128:BAD-1');
    expect(findings[1].dedupeKey).toBe('invalid_isbt128:BAD-2');
  });
});

