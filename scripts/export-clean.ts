import fs from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';
import { ensureCleanTables } from './api/cleanTables.js';

interface DonorRow {
  donor_id: string;
  sex: string;
  birth_date: string;
  blood_group: string | null;
  home_county: string;
  registration_date: string;
  registration_site_id: string;
  phone_last4: string;
  merged_into: string | null;
  resolution_status: string;
}

interface AuditRow {
  id: string;
  at: string;
  user_id: string | null;
  action: string;
  task_id: string | number;
  before_value: string;
  after_value: string;
}

export async function exportCleanData(pool: Pool, outputDir = 'data/clean'): Promise<{ donorsCount: number; auditCount: number; donorsFile: string; auditFile: string }> {
  // Ensure destination directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Ensure clean tables are created and populated
  await ensureCleanTables(pool);

  // 1. Export Clean Donors
  // Query donors_clean excluding records that were merged into another primary donor
  const donorsRes = await pool.query<DonorRow>(`
    select
      donor_id,
      sex,
      birth_date::text as birth_date,
      blood_group,
      home_county,
      registration_date::text as registration_date,
      registration_site_id,
      phone_last4,
      merged_into,
      resolution_status
    from public.donors_clean
    where merged_into is null
    order by donor_id asc;
  `);

  const donorsFile = path.join(outputDir, 'donors_clean.csv');
  const donorHeader = 'donor_id,sex,birth_date,blood_group,home_county,registration_date,registration_site_id,phone_last4,merged_into,resolution_status\n';
  const donorRows = donorsRes.rows.map((r) =>
    [
      r.donor_id,
      r.sex ?? '',
      r.birth_date ?? '',
      r.blood_group ?? '',
      `"${(r.home_county ?? '').replace(/"/g, '""')}"`,
      r.registration_date ?? '',
      r.registration_site_id ?? '',
      r.phone_last4 ?? '',
      r.merged_into ?? '',
      r.resolution_status ?? 'active',
    ].join(','),
  );

  fs.writeFileSync(donorsFile, donorHeader + donorRows.join('\n') + '\n', 'utf-8');

  // 2. Export Audit Trail
  const auditRes = await pool.query<AuditRow>(`
    select
      id::text as id,
      at::text as at,
      user_id::text as user_id,
      action,
      task_id::text as task_id,
      before_value::text as before_value,
      after_value::text as after_value
    from public.audit_log
    order by id asc;
  `);

  const auditFile = path.join(outputDir, 'audit_trail.csv');
  const auditHeader = 'id,timestamp,user_id,action,task_id,before_value,after_value\n';
  const auditRows = auditRes.rows.map((r) =>
    [
      r.id,
      r.at,
      r.user_id ?? '',
      r.action,
      r.task_id,
      `"${(r.before_value ?? '').replace(/"/g, '""')}"`,
      `"${(r.after_value ?? '').replace(/"/g, '""')}"`,
    ].join(','),
  );

  fs.writeFileSync(auditFile, auditHeader + auditRows.join('\n') + '\n', 'utf-8');

  return {
    donorsCount: donorsRes.rows.length,
    auditCount: auditRes.rows.length,
    donorsFile,
    auditFile,
  };
}

async function main(): Promise<void> {
  const { pool } = await import('./lib/db.js');
  console.log('Exporting clean dataset and audit trail...');
  const result = await exportCleanData(pool);

  console.log(`✓ Clean donors exported: ${result.donorsCount.toLocaleString()} records -> ${result.donorsFile}`);
  console.log(`✓ Audit trail exported: ${result.auditCount.toLocaleString()} events -> ${result.auditFile}`);
  console.log('\nData is clean, deduplicated, and ready for handoff to national health systems (DHIS2).');

  await pool.end();
}

if (process.argv[1]?.endsWith('export-clean.ts') || process.argv[1]?.endsWith('export-clean.js')) {
  main().catch((err) => {
    console.error('Failed to export clean data:', err);
    process.exit(1);
  });
}
