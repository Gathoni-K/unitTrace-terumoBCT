import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

interface TransferRow {
  transfer_id: string;
  to_facility_id: string;
  dispatched_at: string;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const result = await pool.query<TransferRow>(`
    select transfer_id, to_facility_id, dispatched_at::text as dispatched_at
    from public.transfers
    where received_at is null
    order by dispatched_at, transfer_id;
  `);

  return result.rows.map((row): Finding => ({
    type: 'unconfirmed_transfer',
    recordIds: [row.transfer_id],
    suggestion: { action: 'confirm_transfer_receipt', transferId: row.transfer_id },
    reason: `Transfer ${row.transfer_id} to facility ${row.to_facility_id} was never confirmed received.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `unconfirmed_transfer:${row.transfer_id}`,
  }));
}

