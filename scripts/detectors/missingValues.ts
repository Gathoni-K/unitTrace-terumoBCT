import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

export interface MissingDonorRow {
  donor_id: string;
  registration_date: string;
  registration_site_id: string;
}

export interface UnknownRequestRow {
  request_id: string;
  facility_id: string;
  requested_at: string;
  urgency: string;
}

export interface UnconfirmedTransferRow {
  transfer_id: string;
  unit_id: string;
  from_facility_id: string;
  to_facility_id: string;
  dispatched_at: string;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const [donorsRes, requestsRes, transfersRes] = await Promise.all([
    pool.query<MissingDonorRow>(`
      select
        donor_id,
        registration_date::text as registration_date,
        registration_site_id
      from public.donors
      where blood_group is null
      order by registration_date asc, donor_id asc;
    `),
    pool.query<UnknownRequestRow>(`
      select
        request_id,
        facility_id,
        requested_at::text as requested_at,
        urgency
      from public.requests
      where lower(patient_blood_group) = 'unknown'
      order by requested_at asc, request_id asc;
    `),
    pool.query<UnconfirmedTransferRow>(`
      select
        transfer_id,
        unit_id,
        from_facility_id,
        to_facility_id,
        dispatched_at::text as dispatched_at
      from public.transfers
      where received_at is null
      order by dispatched_at asc, transfer_id asc;
    `),
  ]);

  const donorFindings: Finding[] = donorsRes.rows.map((row) => ({
    type: 'missing_donor_blood_group',
    recordIds: [row.donor_id],
    suggestion: {
      action: 'request_confirmatory_typing',
      donorId: row.donor_id,
    },
    reason: `Donor ${row.donor_id} is registered without a confirmed blood group.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `missing_donor_blood_group:${row.donor_id}`,
  }));

  const requestFindings: Finding[] = requestsRes.rows.map((row) => ({
    type: 'unknown_patient_blood_group',
    recordIds: [row.request_id],
    suggestion: {
      action: 'verify_patient_blood_group',
      requestId: row.request_id,
    },
    reason: `Request ${row.request_id} recorded with urgency "${row.urgency}" and unknown patient blood group.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `unknown_patient_blood_group:${row.request_id}`,
  }));

  const transferFindings: Finding[] = transfersRes.rows.map((row) => ({
    type: 'unconfirmed_transfer',
    recordIds: [row.transfer_id],
    suggestion: {
      action: 'confirm_transfer_receipt',
      transferId: row.transfer_id,
    },
    reason: `Transfer ${row.transfer_id} for unit ${row.unit_id} dispatched at ${row.dispatched_at} is missing a receipt confirmation timestamp.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `unconfirmed_transfer:${row.transfer_id}`,
  }));

  return [...donorFindings, ...requestFindings, ...transferFindings];
}
