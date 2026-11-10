import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

interface DonationTooSoonRow {
  donation_id: string;
  donor_id: string;
  collection_date: string;
  prev_collection_date: string;
  gap_days: number;
  sex: 'M' | 'F';
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  const maleMinDays = config.minDonationGapMonths?.male ? config.minDonationGapMonths.male * 30 : 90;
  const femaleMinDays = config.minDonationGapMonths?.female ? config.minDonationGapMonths.female * 30 : 120;

  const query = `
    with ranked_donations as (
      select
        d.donation_id,
        d.donor_id,
        d.collection_date,
        lag(d.collection_date) over (partition by d.donor_id order by d.collection_date asc, d.donation_id asc) as prev_collection_date,
        dr.sex
      from public.donations d
      join public.donors dr on dr.donor_id = d.donor_id
      where d.outcome = 'collected'
        and dr.sex in ('M', 'F')
    )
    select
      donation_id,
      donor_id,
      collection_date::text as collection_date,
      prev_collection_date::text as prev_collection_date,
      (collection_date - prev_collection_date)::int as gap_days,
      sex
    from ranked_donations
    where prev_collection_date is not null
      and (
        (sex = 'M' and (collection_date - prev_collection_date) < $1)
        or
        (sex = 'F' and (collection_date - prev_collection_date) < $2)
      )
    order by collection_date asc, donation_id asc;
  `;

  const result = await pool.query<DonationTooSoonRow>(query, [maleMinDays, femaleMinDays]);

  return result.rows.map((row): Finding => {
    const requiredMin = row.sex === 'M' ? maleMinDays : femaleMinDays;
    return {
      type: 'donation_too_soon',
      recordIds: [row.donation_id, row.donor_id],
      suggestion: {
        action: 'review_donor_deferral',
        donationId: row.donation_id,
        donorId: row.donor_id,
        gapDays: row.gap_days,
        minimumRequiredDays: requiredMin,
      },
      reason: `Donation ${row.donation_id} occurred ${row.gap_days} days after previous donation on ${row.prev_collection_date}, below the minimum interval of ${requiredMin} days for sex "${row.sex}".`,
      confidence: 'rule',
      source: 'rule',
      dedupeKey: `donation_too_soon:${row.donation_id}`,
    };
  });
}

