import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  // TODO: cover missing donor blood groups, unknown emergency patient groups, and unconfirmed transfers.
  void pool; void config;
  return [];
}
