import fs from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { ensureCleanTables } from './api/cleanTables.js';

export interface FhirTelecom {
  system: 'phone' | 'email' | 'fax' | 'pager' | 'url' | 'sms' | 'other';
  value: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
}

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FhirExtension {
  url: string;
  valueString?: string;
  valueDate?: string;
  valueBoolean?: boolean;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{
    system: string;
    value: string;
  }>;
  active: boolean;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: FhirAddress[];
  telecom?: FhirTelecom[];
  extension?: FhirExtension[];
}

export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirPatient;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection';
  timestamp: string;
  total: number;
  entry: FhirBundleEntry[];
}

interface CleanDonorRow {
  donor_id: string;
  sex: string | null;
  birth_date: string | null;
  blood_group: string | null;
  home_county: string | null;
  registration_date: string | null;
  registration_site_id: string | null;
  phone_last4: string | null;
}

export function donorToFhirPatient(row: CleanDonorRow): FhirPatient {
  const genderMap: Record<string, FhirPatient['gender']> = {
    M: 'male',
    m: 'male',
    F: 'female',
    f: 'female',
  };

  const patient: FhirPatient = {
    resourceType: 'Patient',
    id: row.donor_id,
    identifier: [
      {
        system: 'https://kenya.health.gov/identifiers/donors',
        value: row.donor_id,
      },
    ],
    active: true,
    gender: row.sex ? (genderMap[row.sex] ?? 'unknown') : 'unknown',
  };

  if (row.birth_date) {
    patient.birthDate = row.birth_date.slice(0, 10);
  }

  if (row.home_county) {
    patient.address = [
      {
        use: 'home',
        district: row.home_county,
        country: 'KE',
      },
    ];
  }

  if (row.phone_last4) {
    patient.telecom = [
      {
        system: 'phone',
        value: `XXXXX${row.phone_last4}`,
        use: 'mobile',
      },
    ];
  }

  const extensions: FhirExtension[] = [];
  if (row.blood_group) {
    extensions.push({
      url: 'http://hl7.org/fhir/StructureDefinition/patient-bloodGroup',
      valueString: row.blood_group,
    });
  }
  if (row.registration_date) {
    extensions.push({
      url: 'https://kenya.health.gov/fhir/StructureDefinition/donor-registration-date',
      valueDate: row.registration_date.slice(0, 10),
    });
  }
  if (extensions.length > 0) {
    patient.extension = extensions;
  }

  return patient;
}

export async function exportFhirBundle(pool: Pool, outputPath: string, limit = 5): Promise<FhirBundle> {
  await ensureCleanTables(pool);

  const result = await pool.query<CleanDonorRow>(
    `select
       donor_id,
       sex,
       birth_date::text as birth_date,
       blood_group,
       home_county,
       registration_date::text as registration_date,
       registration_site_id,
       phone_last4
     from public.donors_clean
     where blood_group is not null and blood_group != ''
     order by donor_id asc
     limit $1`,
    [limit],
  );

  const entries: FhirBundleEntry[] = result.rows.map((row) => ({
    fullUrl: `urn:uuid:donor-${row.donor_id}`,
    resource: donorToFhirPatient(row),
  }));

  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    id: 'unittrace-clean-donors-bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(bundle, null, 2), 'utf-8');

  return bundle;
}

async function main(): Promise<void> {
  const { pool } = await import('./lib/db.js');
  const targetPath = path.resolve(process.cwd(), 'data/clean/fhir_bundle.json');

  console.log(`Exporting 5 clean donors to FHIR Bundle at ${targetPath}...`);
  const bundle = await exportFhirBundle(pool, targetPath, 5);
  console.log(`FHIR Bundle successfully written with ${bundle.total} Patient resources.`);

  await pool.end();
}

if (process.argv[1] && (process.argv[1].endsWith('export-fhir.ts') || process.argv[1].endsWith('export-fhir.js'))) {
  void main();
}

