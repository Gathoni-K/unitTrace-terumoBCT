import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './inconsistentFacilityName.js';

const dummyConfig = {} as CountryConfig;

describe('inconsistentFacilityName detector', () => {
  it('detects requests with facility names that do not match canonical registry', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            request_id: 'REQ-003044',
            facility_id: 'HSP-005',
            facility_name_raw: 'Kiambu CRH',
            canonical_name: 'Kiambu County Referral Hospital',
          },
          {
            request_id: 'REQ-003057',
            facility_id: 'HSP-015',
            facility_name_raw: 'Busia CRH',
            canonical_name: 'Busia County Referral Hospital',
          },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      type: 'implausible',
      recordIds: ['REQ-003044'],
      suggestion: {
        action: 'fix_facility_name',
        suggested_facility_id: 'HSP-005',
        expected_name: 'Kiambu County Referral Hospital',
      },
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'inconsistent_facility_name:REQ-003044',
    });
    expect(findings[0].reason).toContain('Kiambu CRH');
    expect(findings[0].reason).toContain('DHIS2 aggregation');
  });

  it('returns empty array when all facility names match canonical registry', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings).toEqual([]);
  });

  it('dedupeKey is stable and unique per request', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            request_id: 'REQ-1',
            facility_id: 'HSP-1',
            facility_name_raw: 'Name A',
            canonical_name: 'Canonical A',
          },
        ],
      }),
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);
    expect(findings[0].dedupeKey).toBe('inconsistent_facility_name:REQ-1');
  });
});
