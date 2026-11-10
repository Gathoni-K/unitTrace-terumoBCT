import { describe, expect, it } from 'vitest';
import { maskBirthDate, maskPhoneLast4, maskText, maskObjectPii, maskTaskPii } from './masking.js';

describe('PII Masking utilities', () => {
  it('masks birth dates to year-XX-XX format', () => {
    expect(maskBirthDate('1995-01-01')).toBe('1995-XX-XX');
    expect(maskBirthDate('2002-12-31')).toBe('2002-XX-XX');
  });

  it('masks phone last 4 digits to XXXX', () => {
    expect(maskPhoneLast4('1234')).toBe('XXXX');
    expect(maskPhoneLast4('7788')).toBe('XXXX');
  });

  it('masks dates and phone mentions in reason text', () => {
    const raw = 'Donors DNR-1 and DNR-2 share the same phone last 4 digits (5678) and born on 1988-11-23.';
    const masked = maskText(raw);
    expect(masked).toBe('Donors DNR-1 and DNR-2 share the same phone last 4 digits (XXXX) and born on 1988-XX-XX.');
  });

  it('masks nested object fields with PII keys', () => {
    const obj = {
      action: 'review_merge',
      donor_details: {
        donor_id: 'DNR-001',
        birth_date: '1995-04-12',
        phone_last4: '9876',
        home_county: 'Kisumu',
      },
    };

    const masked = maskObjectPii(obj);
    expect(masked.donor_details.birth_date).toBe('1995-XX-XX');
    expect(masked.donor_details.phone_last4).toBe('XXXX');
    expect(masked.donor_details.home_county).toBe('Kisumu');
  });

  it('masks full task object properly', () => {
    const task = {
      id: '1',
      type: 'duplicate_donor',
      status: 'open',
      recordIds: ['DNR-1', 'DNR-2'],
      reason: 'Donors DNR-1 and DNR-2 share the same phone last 4 digits (1234).',
      suggestion: { birth_date: '1991-03-05', phone_last4: '1234' },
      confidence: 'rule',
      source: 'rule',
      createdAt: '2026-11-10T00:00:00Z',
      dedupeKey: 'duplicate_donor:DNR-1:DNR-2',
    };

    const masked = maskTaskPii(task);
    expect(masked.reason).toContain('XXXX');
    expect((masked.suggestion as { birth_date: string }).birth_date).toBe('1991-XX-XX');
    expect((masked.suggestion as { phone_last4: string }).phone_last4).toBe('XXXX');
  });
});

