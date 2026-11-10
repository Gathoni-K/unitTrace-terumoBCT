import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { exportCleanData } from './export-clean.js';

describe('exportCleanData', () => {
  it('exports clean donors and audit trail to CSV files', async () => {
    const mockQuery = vi.fn()
      // DDL for clean tables
      .mockResolvedValueOnce({})
      // Initial insert into clean tables
      .mockResolvedValueOnce({})
      // Select clean donors
      .mockResolvedValueOnce({
        rows: [
          {
            donor_id: 'DNR-000001',
            sex: 'M',
            birth_date: '1990-01-01',
            blood_group: 'O+',
            home_county: 'Nairobi',
            registration_date: '2025-11-01',
            registration_site_id: 'SAT-NBO',
            phone_last4: '1234',
            merged_into: null,
            resolution_status: 'active',
          },
        ],
      })
      // Select audit log
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            at: '2026-01-01T00:00:00Z',
            user_id: 'user-1',
            action: 'accept',
            task_id: '101',
            before_value: '{"status":"open"}',
            after_value: '{"status":"done"}',
          },
        ],
      });

    const mockPool = { query: mockQuery } as unknown as Pool;
    const testOutDir = path.resolve('data/clean_test');

    const result = await exportCleanData(mockPool, testOutDir);

    expect(result.donorsCount).toBe(1);
    expect(result.auditCount).toBe(1);
    expect(fs.existsSync(result.donorsFile)).toBe(true);
    expect(fs.existsSync(result.auditFile)).toBe(true);

    const donorsContent = fs.readFileSync(result.donorsFile, 'utf-8');
    expect(donorsContent).toContain('DNR-000001');
    expect(donorsContent).toContain('Nairobi');

    const auditContent = fs.readFileSync(result.auditFile, 'utf-8');
    expect(auditContent).toContain('accept');
    expect(auditContent).toContain('101');

    // Clean up test directory
    fs.rmSync(testOutDir, { recursive: true, force: true });
  });
});

