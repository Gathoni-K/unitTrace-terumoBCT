import type { PoolClient, Pool } from 'pg';

type Queryable = PoolClient | Pool;

export async function ensureCleanTables(client: Queryable): Promise<void> {
  // Create clean tables if they do not exist
  await client.query(`
    create table if not exists public.donors_clean (
      donor_id text primary key,
      sex text,
      birth_date date,
      blood_group text,
      home_county text,
      registration_date date,
      registration_site_id text,
      phone_last4 text,
      merged_into text null,
      resolution_status text default 'active'
    );

    create table if not exists public.requests_clean (
      request_id text primary key,
      facility_id text,
      facility_name_raw text,
      requested_at timestamp without time zone,
      urgency text,
      patient_blood_group text,
      resolution_status text default 'active'
    );

    create table if not exists public.transfers_clean (
      transfer_id text primary key,
      unit_id text,
      from_facility_id text,
      to_facility_id text,
      dispatched_at timestamp without time zone,
      received_at timestamp without time zone,
      resolution_status text default 'active'
    );
  `);

  // Initialise clean tables from source tables if empty
  await client.query(`
    insert into public.donors_clean (donor_id, sex, birth_date, blood_group, home_county, registration_date, registration_site_id, phone_last4)
    select donor_id, sex, birth_date, blood_group, home_county, registration_date, registration_site_id, phone_last4
    from public.donors
    on conflict (donor_id) do nothing;

    insert into public.requests_clean (request_id, facility_id, facility_name_raw, requested_at, urgency, patient_blood_group)
    select request_id, facility_id, facility_name_raw, requested_at, urgency, patient_blood_group
    from public.requests
    on conflict (request_id) do nothing;

    insert into public.transfers_clean (transfer_id, unit_id, from_facility_id, to_facility_id, dispatched_at, received_at)
    select transfer_id, unit_id, from_facility_id, to_facility_id, dispatched_at, received_at
    from public.transfers
    on conflict (transfer_id) do nothing;
  `);
}

export async function applyDecisionFix(
  client: Queryable,
  task: {
    task_id: number | string;
    type: string;
    record_ids: unknown;
    suggestion: unknown;
  },
  action: 'accept' | 'change' | 'reject',
  fixValue: unknown,
): Promise<void> {
  if (action === 'reject') {
    return; // Rejections leave the clean data unmodified
  }

  const recordIds: string[] = Array.isArray(task.record_ids)
    ? task.record_ids
    : typeof task.record_ids === 'string'
      ? JSON.parse(task.record_ids)
      : [];

  const fixObj = (typeof fixValue === 'object' && fixValue !== null ? fixValue : {}) as Record<string, unknown>;

  if (task.type === 'duplicate_donor') {
    // When duplicate donor task is accepted, merge the secondary donors into the primary donor
    const primaryId = (fixObj.primaryDonorId as string) || recordIds[0];
    const duplicates = (fixObj.duplicateDonorIds as string[]) || recordIds.slice(1);

    for (const dupId of duplicates) {
      if (dupId !== primaryId) {
        await client.query(
          `update public.donors_clean
           set merged_into = $1, resolution_status = 'merged'
           where donor_id = $2`,
          [primaryId, dupId],
        );
      }
    }
  } else if (task.type === 'missing_donor_blood_group') {
    const donorId = recordIds[0];
    const bloodGroup = (fixObj.bloodGroup as string) || (fixObj.blood_group as string) || 'O+';
    await client.query(
      `update public.donors_clean
       set blood_group = $1, resolution_status = 'updated'
       where donor_id = $2`,
      [bloodGroup, donorId],
    );
  } else if (task.type === 'unconfirmed_transfer') {
    const transferId = recordIds[0];
    const receivedAt = (fixObj.received_at as string) || new Date().toISOString();
    await client.query(
      `update public.transfers_clean
       set received_at = $1, resolution_status = 'confirmed'
       where transfer_id = $2`,
      [receivedAt, transferId],
    );
  } else if (task.type === 'unknown_patient_blood_group') {
    const requestId = recordIds[0];
    const patientBloodGroup = (fixObj.patient_blood_group as string) || 'O+';
    await client.query(
      `update public.requests_clean
       set patient_blood_group = $1, resolution_status = 'updated'
       where request_id = $2`,
      [patientBloodGroup, requestId],
    );
  } else if (task.type === 'implausible' || task.type === 'facility_name') {
    const requestId = recordIds[0];
    const expectedName =
      (fixObj.expected_name as string) || (fixObj.facility_name as string) || (fixObj.name as string);
    if (requestId && expectedName) {
      await client.query(
        `update public.requests_clean
         set facility_name_raw = $1, resolution_status = 'normalized'
         where request_id = $2`,
        [expectedName, requestId],
      );
    }
  }
}
