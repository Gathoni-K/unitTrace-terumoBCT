import { describe, expect, it } from 'vitest';
import { requestConfirmation, resolveProjectRef } from './confirm.js';

describe('confirm helper', () => {
  it('returns true when --yes or -y flag is present', async () => {
    expect(await requestConfirmation('proj-123', ['node', 'ingest.js', '--yes'])).toBe(true);
    expect(await requestConfirmation('proj-123', ['node', 'ingest.js', '-y'])).toBe(true);
  });

  it('resolves project ref from environment variables or default', () => {
    const originalRef = process.env.SUPABASE_PROJECT_REF;
    try {
      process.env.SUPABASE_PROJECT_REF = 'test-ref-123';
      expect(resolveProjectRef()).toBe('test-ref-123');

      delete process.env.SUPABASE_PROJECT_REF;
      expect(resolveProjectRef()).toBe('data-quality-workbench');
    } finally {
      if (originalRef !== undefined) {
        process.env.SUPABASE_PROJECT_REF = originalRef;
      } else {
        delete process.env.SUPABASE_PROJECT_REF;
      }
    }
  });
});

