import { countryConfigSchema, type CountryConfig } from '@workbench/shared';
export async function loadCountryConfig(countryCode: string): Promise<CountryConfig> {
  const response = await fetch(`/config/country.${countryCode.toLowerCase()}.json`);
  if (!response.ok) throw new Error(`Could not load country configuration: ${response.status}`);
  return countryConfigSchema.parse(await response.json());
}
