import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  // TODO: implement facility alias and similarity checks from CountryConfig.
  void pool; void config;
  return [];
}
