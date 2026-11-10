import { describe, expect, it } from 'vitest';
import type { Finding } from '@workbench/shared';
import { toTaskRow } from './taskRow.js';

describe('toTaskRow', () => {
  it('converts a finding with structured suggestion and dedupeKey to a database task row', () => {
    const finding: Finding = {
      type: 'sensor_glitch',
      recordIds: ['RBTC-NBO', '2025-11-01 00:00:00'],
      suggestion: { action: 'mark_sensor_fault', observedValue: -99.0 },
      reason: 'A reading of -99.0 is not physically possible for a blood fridge. It is likely a sensor fault.',
      confidence: 'rule',
      source: 'rule',
      dedupeKey: 'sensor_glitch:RBTC-NBO:2025-11-01 00:00:00',
    };

    const row = toTaskRow(finding);

    expect(row).toEqual({
      type: 'sensor_glitch',
      record_ids: JSON.stringify(['RBTC-NBO', '2025-11-01 00:00:00']),
      suggestion: JSON.stringify({ action: 'mark_sensor_fault', observedValue: -99.0 }),
      reason: 'A reading of -99.0 is not physically possible for a blood fridge. It is likely a sensor fault.',
      confidence: 'rule',
      source: 'rule',
      dedupe_key: 'sensor_glitch:RBTC-NBO:2025-11-01 00:00:00',
    });
  });

  it('sets dedupe_key to null when finding does not specify dedupeKey', () => {
    const finding: Finding = {
      type: 'sensor_glitch',
      recordIds: ['HSP-001', '2025-11-01 01:00:00'],
      suggestion: 'manual check',
      reason: 'anomalous reading',
      confidence: 'rule',
      source: 'rule',
    };

    const row = toTaskRow(finding);
    expect(row.dedupe_key).toBeNull();
    expect(row.suggestion).toBe(JSON.stringify('manual check'));
  });

  it('maps AI source to smart and numeric confidence to category', () => {
    const finding: Finding = {
      type: 'duplicate_donor',
      recordIds: ['DNR-1', 'DNR-2'],
      suggestion: { action: 'review_merge', score: 0.95 },
      reason: 'Fuzzy match',
      confidence: 0.95,
      source: 'ai',
      dedupeKey: 'duplicate_donor:DNR-1:DNR-2',
    };

    const row = toTaskRow(finding);
    expect(row.source).toBe('smart');
    expect(row.confidence).toBe('high');
  });
});

