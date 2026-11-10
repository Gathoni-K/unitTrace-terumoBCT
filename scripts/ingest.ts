import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { pipeline } from 'node:stream/promises';
import type { PoolClient } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { pool } from './lib/db.js';
import { parseCsvHeaderLine, validateCsvHeaders } from './lib/headers.js';
import { evaluateRowCounts } from './lib/counts.js';
import { requestConfirmation, resolveProjectRef } from './lib/confirm.js';

interface ColumnSpec {
  name: string;
  type: 'text' | 'date' | 'timestamp' | 'numeric';
}

const tableDefinitions: Record<string, ColumnSpec[]> = {
  donors: [
    { name: 'donor_id', type: 'text' },
    { name: 'sex', type: 'text' },
    { name: 'birth_date', type: 'date' },
    { name: 'blood_group', type: 'text' },
    { name: 'home_county', type: 'text' },
    { name: 'registration_date', type: 'date' },
    { name: 'registration_site_id', type: 'text' },
    { name: 'phone_last4', type: 'text' },
  ],
  requests: [
    { name: 'request_id', type: 'text' },
    { name: 'facility_id', type: 'text' },
    { name: 'facility_name_raw', type: 'text' },
    { name: 'requested_at', type: 'timestamp' },
    { name: 'urgency', type: 'text' },
    { name: 'patient_blood_group', type: 'text' },
  ],
  transfers: [
    { name: 'transfer_id', type: 'text' },
    { name: 'unit_id', type: 'text' },
    { name: 'from_facility_id', type: 'text' },
    { name: 'to_facility_id', type: 'text' },
    { name: 'dispatched_at', type: 'timestamp' },
    { name: 'received_at', type: 'timestamp' },
  ],
  temperature_logs: [
    { name: 'facility_id', type: 'text' },
    { name: 'recorded_at', type: 'timestamp' },
    { name: 'temp_c', type: 'numeric' },
  ],
  facilities: [
    { name: 'facility_id', type: 'text' },
    { name: 'name', type: 'text' },
    { name: 'county', type: 'text' },
    { name: 'connectivity', type: 'text' },
    { name: 'grid_reliability', type: 'numeric' },
  ],
  donations: [
    { name: 'donation_id', type: 'text' },
    { name: 'donor_id', type: 'text' },
    { name: 'collection_date', type: 'date' },
    { name: 'outcome', type: 'text' },
  ],
  units: [
    { name: 'unit_id', type: 'text' },
    { name: 'donation_id', type: 'text' },
    { name: 'blood_group', type: 'text' },
  ],
};

const expectedRowCounts: Record<string, number> = {
  donors: 43363,
  requests: 17430,
  transfers: 35181,
  temperature_logs: 399280,
  facilities: 47,
};

async function readHeaderLine(filePath: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      return line;
    }
    throw new Error(`CSV file ${filePath} is empty.`);
  } finally {
    rl.close();
    fileStream.destroy();
  }
}

async function ingestTable(client: PoolClient, tableName: string): Promise<void> {
  const specs = tableDefinitions[tableName];
  if (!specs) {
    throw new Error(`No column specification defined for table "${tableName}".`);
  }

  const filePath = path.resolve('data/raw', `${tableName}.csv`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }

  const headerLine = await readHeaderLine(filePath);
  const actualHeaders = parseCsvHeaderLine(headerLine);
  const requiredColumns = specs.map((col) => col.name);

  const validation = validateCsvHeaders(actualHeaders, requiredColumns, tableName);
  if (!validation.valid) {
    throw new Error(validation.errorMessage);
  }

  const stagingTable = `staging_${tableName}`;
  const stagingColsDef = actualHeaders.map((col) => `"${col}" text`).join(', ');
  const quotedActualHeaders = actualHeaders.map((col) => `"${col}"`).join(', ');

  await client.query(`drop table if exists ${stagingTable};`);
  await client.query(`create temp table ${stagingTable} (${stagingColsDef});`);

  try {
    const copyQuery = `copy ${stagingTable} (${quotedActualHeaders}) from stdin with (format csv, header true, null '')`;
    const copyStream = client.query(copyFrom(copyQuery));
    const fileStream = fs.createReadStream(filePath);

    try {
      await pipeline(fileStream, copyStream);
    } catch (copyErr) {
      throw new Error(
        `Failed to COPY data from ${filePath} into temp table ${stagingTable}: ${
          copyErr instanceof Error ? copyErr.message : String(copyErr)
        }`,
      );
    }

    const targetCols = specs.map((col) => `"${col.name}"`).join(', ');
    const selectCols = specs.map((col) => `"${col.name}"::${col.type}`).join(', ');
    const insertQuery = `insert into public.${tableName} (${targetCols}) select ${selectCols} from ${stagingTable};`;

    await client.query(insertQuery);
  } finally {
    try {
      await client.query(`drop table if exists ${stagingTable};`);
    } catch {
      // Transaction is already aborted; cleanup is handled upon rollback
    }
  }
}

interface SanityChecks {
  nullDonorBloodGroups: number;
  nullTransferReceivedAt: number;
  unknownPatientBloodGroups: number;
  duplicateDonorGroups: number;
}

async function runSanityChecks(client: PoolClient): Promise<SanityChecks> {
  const [bloodGroupRes, transferRes, requestRes, donorDupRes] = await Promise.all([
    client.query<{ count: string }>('select count(*)::text as count from public.donors where blood_group is null;'),
    client.query<{ count: string }>('select count(*)::text as count from public.transfers where received_at is null;'),
    client.query<{ count: string }>(
      "select count(*)::text as count from public.requests where lower(patient_blood_group) = 'unknown';",
    ),
    client.query<{ count: string }>(`
      select count(*)::text as count from (
        select birth_date, sex, home_county, phone_last4
        from public.donors
        group by birth_date, sex, home_county, phone_last4
        having count(*) > 1
      ) t;
    `),
  ]);

  return {
    nullDonorBloodGroups: Number(bloodGroupRes.rows[0].count),
    nullTransferReceivedAt: Number(transferRes.rows[0].count),
    unknownPatientBloodGroups: Number(requestRes.rows[0].count),
    duplicateDonorGroups: Number(donorDupRes.rows[0].count),
  };
}

async function verifyIngestion(client: PoolClient): Promise<boolean> {
  const actualCounts: Record<string, number> = {};

  for (const table of Object.keys(tableDefinitions)) {
    const res = await client.query<{ count: string }>(`select count(*)::text as count from public.${table};`);
    actualCounts[table] = Number(res.rows[0].count);
  }

  const report = evaluateRowCounts(actualCounts, expectedRowCounts, 1.0);

  console.log('\n--- Ingestion Verification Report ---');
  console.table(
    report.results.map((r) => ({
      table: r.table,
      actual: r.actual,
      expected: r.expected,
      diff: r.diff,
      percentDiff: `${r.percentDiff.toFixed(2)}%`,
      status: r.passes ? 'PASS' : 'FAIL (>1%)',
    })),
  );

  console.log(`Additional loaded tables:`);
  console.log(`  donations: ${actualCounts.donations ?? 0} rows`);
  console.log(`  units: ${actualCounts.units ?? 0} rows`);

  const sanity = await runSanityChecks(client);
  console.log('\n--- Sanity Checks (informational) ---');
  console.log(`- Donors with blood_group null: ${sanity.nullDonorBloodGroups}`);
  console.log(`- Transfers with received_at null: ${sanity.nullTransferReceivedAt}`);
  console.log(`- Requests with patient_blood_group = 'unknown': ${sanity.unknownPatientBloodGroups}`);
  console.log(
    `- Duplicate donor groups (birth_date, sex, home_county, phone_last4 with count > 1): ${sanity.duplicateDonorGroups}`,
  );

  return report.allPassed;
}

async function main(): Promise<void> {
  const projectRef = resolveProjectRef();
  const confirmed = await requestConfirmation(projectRef);
  if (!confirmed) {
    console.error('Confirmation failed or aborted. Exiting without modifying tables.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('Starting ingestion inside a single transaction...');
    await client.query('begin;');

    console.log('Truncating source tables...');
    await client.query(`
      truncate table
        public.donors,
        public.requests,
        public.transfers,
        public.temperature_logs,
        public.facilities,
        public.donations,
        public.units;
    `);

    for (const table of Object.keys(tableDefinitions)) {
      console.log(`Ingesting table ${table}...`);
      await ingestTable(client, table);
    }

    console.log('Verifying row counts and running sanity checks...');
    const allPassed = await verifyIngestion(client);

    if (!allPassed) {
      await client.query('rollback;');
      console.error('\nVerification failed: row count difference exceeds 1%. Rolled back transaction.');
      process.exit(1);
    }

    await client.query('commit;');
    console.log('\nIngestion committed successfully.');
  } catch (err) {
    await client.query('rollback;');
    console.error(`\nIngestion aborted and rolled back due to error:\n${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
