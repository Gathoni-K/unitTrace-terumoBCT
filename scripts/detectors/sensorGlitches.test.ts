import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { CountryConfig } from '@workbench/shared';
import { run } from './sensorGlitches.js';

describe('sensorGlitches detector', () => {
  const dummyConfig = {
    sensorGlitchValues: [-99, 99.9, 0],
  } as unknown as CountryConfig;

  it('queries temperature_logs and formats findings with dedupeKey', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [
        { facility_id: 'RBTC-NBO', recorded_at: '2025-11-01 00:00:00', temp_c: -99.0 },
        { facility_id: 'HSP-001', recorded_at: '2025-11-01 04:00:00', temp_c: 0 },
        { facility_id: 'HSP-002', recorded_at: '2025-11-01 08:00:00', temp_c: 99.9 },
      ],
    });
    const mockPool = {
      query: mockQuery,
    } as unknown as Pool;

    const findings = await run(mockPool, dummyConfig);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][1]).toEqual([[-99, 99.9, 0]]);
    expect(findings).toHaveLength(3);

    expect(findings[0]).toEqual({
      type: 'sensor_glitch',
      recordIds: ['RBTC-NBO', '2025-11-01 00:00:00'],
      suggestion: {
        action: 'mark_sensor_fault',
        observedValue: -99.0,
      },
      reason: 'A reading of -99.0 is not physically possible for a blood fridge. It is likely a sensor fault.',
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'sensor_glitch:RBTC-NBO:2025-11-01 00:00:00',
    });

    expect(findings[1].reason).toBe('A reading of 0.0 is not physically possible for a blood fridge. It is likely a sensor fault.');
    expect(findings[1].dedupeKey).toBe('sensor_glitch:HSP-001:2025-11-01 04:00:00');

    expect(findings[2].reason).toBe('A reading of 99.9 is not physically possible for a blood fridge. It is likely a sensor fault.');
    expect(findings[2].dedupeKey).toBe('sensor_glitch:HSP-002:2025-11-01 08:00:00');
  });

  it('returns empty array if no glitch values configured', async () => {
    const mockPool = { query: vi.fn() } as unknown as Pool;
    const findings = await run(mockPool, { sensorGlitchValues: [] } as unknown as CountryConfig);
    expect(findings).toEqual([]);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

