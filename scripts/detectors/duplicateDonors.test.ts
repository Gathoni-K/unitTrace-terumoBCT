import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './duplicateDonors.js';

const dummyConfig = {} as CountryConfig;

describe('duplicateDonors detector (sensible heuristic baseline)', () => {
  it('emits one finding per pair within each sex + home_county + phone_last4 group', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        // Group of 3 → 3 pairs; group of 2 → 1 pair
        rows: [
          { sex: 'M', home_county: 'Nairobi', phone_last4: '1234', donor_ids: ['DNR-A', 'DNR-B', 'DNR-C'] },
          { sex: 'F', home_county: 'Mombasa', phone_last4: '5678', donor_ids: ['DNR-D', 'DNR-E'] },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(findings).toHaveLength(4); // 3 + 1 pairs
    const keys = findings.map((f) => f.dedupeKey);
    expect(new Set(keys).size).toBe(4); // all unique
    expect(findings[0].reason).toBe('Exact match on sex, home county, and phone last 4 digits.');
  });

  it('dedupeKey is sorted and stable regardless of array order', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ sex: 'M', home_county: 'Kiambu', phone_last4: '9999', donor_ids: ['DNR-Z', 'DNR-A'] }],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings[0].dedupeKey).toBe('duplicate_donor:DNR-A:DNR-Z');
    expect(findings[0].recordIds).toEqual(['DNR-A', 'DNR-Z']);
  });

  it('returns empty array when no group has more than one donor', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;

    expect(await run(mockPool, dummyConfig)).toEqual([]);
  });

  it('finding source is rule and confidence is rule', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ sex: 'F', home_county: 'Kisumu', phone_last4: '0000', donor_ids: ['DNR-1', 'DNR-2'] }],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings[0].source).toBe('rule');
    expect(findings[0].confidence).toBe('rule');
    expect(findings[0].suggestion).toEqual({
      action: 'review_merge',
      matched_fields: ['sex', 'home_county', 'phone_last4'],
    });
  });
});
