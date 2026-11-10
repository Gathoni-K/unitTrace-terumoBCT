import { pool } from './lib/db.js';
import { copyFrom } from 'pg-copy-streams';

const tableColumns = {
  donors: ['donor_id', 'sex', 'birth_date', 'blood_group', 'home_county', 'registration_date', 'registration_site_id', 'phone_last4'],
  requests: ['request_id', 'facility_id', 'facility_name_raw', 'requested_at', 'urgency', 'patient_blood_group'],
  transfers: ['transfer_id', 'unit_id', 'from_facility_id', 'to_facility_id', 'dispatched_at', 'received_at'],
  temperature_logs: ['facility_id', 'recorded_at', 'temp_c'],
  facilities: ['facility_id', 'name', 'county', 'connectivity', 'grid_reliability'],
  donations: ['donation_id', 'donor_id', 'collection_date', 'outcome'],
  units: ['unit_id', 'donation_id', 'blood_group'],
} as const;

const expectedRowCounts: Partial<Record<keyof typeof tableColumns, number>> = {
  donors: 43363,
  requests: 17430,
  transfers: 35181,
  temperature_logs: 399280,
  facilities: 47,
};

async function ingestTable(table: keyof typeof tableColumns): Promise<void> {
  // TODO: stream data/raw/<table>.csv with COPY ... FROM STDIN, CSV HEADER, NULL ''.
  // Use explicit columns or a staging table: real CSVs may contain extra columns.
  const columns = tableColumns[table].join(', ');
  const copyStream = copyFrom(`COPY public.${table} (${columns}) FROM STDIN WITH (FORMAT csv, HEADER true, NULL '')`);
  void copyStream;
  void table;
}

async function verifyCounts(): Promise<void> {
  // TODO: compare database counts with expectedRowCounts after ingestion.
  void expectedRowCounts;
}

async function main(): Promise<void> {
  for (const table of Object.keys(tableColumns) as Array<keyof typeof tableColumns>) {
    await ingestTable(table);
  }
  await verifyCounts();
  await pool.end();
}

void main();
