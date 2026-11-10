import { describe, expect, it } from 'vitest';
import { parseCsvHeaderLine, validateCsvHeaders } from './headers.js';

describe('headers helper', () => {
  it('parses csv header line correctly', () => {
    const line = 'donor_id,"sex",birth_date,blood_group,"extra_field"';
    expect(parseCsvHeaderLine(line)).toEqual([
      'donor_id',
      'sex',
      'birth_date',
      'blood_group',
      'extra_field',
    ]);
  });

  it('validates headers successfully when all required columns are present', () => {
    const actual = ['donor_id', 'sex', 'birth_date', 'blood_group', 'extra_col'];
    const required = ['donor_id', 'sex', 'birth_date', 'blood_group'];
    const result = validateCsvHeaders(actual, required, 'donors');

    expect(result.valid).toBe(true);
    expect(result.missingColumns).toEqual([]);
    expect(result.unexpectedColumns).toEqual(['extra_col']);
    expect(result.errorMessage).toBeUndefined();
  });

  it('fails validation when required columns are missing and lists missing + unexpected', () => {
    const actual = ['donor_id', 'unknown_field_1', 'unknown_field_2'];
    const required = ['donor_id', 'sex', 'birth_date'];
    const result = validateCsvHeaders(actual, required, 'donors');

    expect(result.valid).toBe(false);
    expect(result.missingColumns).toEqual(['sex', 'birth_date']);
    expect(result.unexpectedColumns).toEqual(['unknown_field_1', 'unknown_field_2']);
    expect(result.errorMessage).toContain('missing required column(s): [sex, birth_date]');
    expect(result.errorMessage).toContain('Unexpected column(s) present: [unknown_field_1, unknown_field_2]');
  });
});

