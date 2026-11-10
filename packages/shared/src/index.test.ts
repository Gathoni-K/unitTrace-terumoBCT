import { describe, expect, it } from 'vitest';
import { parseSmsCommand } from './index.js';

describe('parseSmsCommand', () => {
  it('parses accept and reject commands', () => {
    expect(parseSmsCommand('41 OK')).toEqual({ taskId: 41, action: 'accept' });
    expect(parseSmsCommand('41 NO')).toEqual({ taskId: 41, action: 'reject' });
  });
  it('rejects malformed or locked-field commands', () => {
    expect(parseSmsCommand('hello')).toHaveProperty('error');
    expect(parseSmsCommand('41 blood_group', ['blood_group'])).toHaveProperty('error');
  });
});
