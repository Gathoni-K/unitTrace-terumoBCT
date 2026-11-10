import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  // TODO: compare temperature logs with CountryConfig safe range and glitch values.
  void pool; void config;
  return [];
}
