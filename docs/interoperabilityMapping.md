# Interoperability Mapping

## Overview

UnitTrace is designed to integrate with the two standards that dominate African blood-bank and health-ministry workflows: **HL7 FHIR R4** (clinical record exchange) and **DHIS2** (national aggregate reporting). It also validates donation identifiers against the **ISBT 128** international standard.

---

## 1. HL7 FHIR R4 Mapping

Full mapping detail is in [`docs/fhirMapping.md`](./fhirMapping.md). Summary below.

| UnitTrace Table | FHIR Resource | Key Identifier |
|-----------------|--------------|----------------|
| `donors` | `Patient` | `identifier.system = "https://kenya.health.gov/identifiers/donors"` |
| `units` | `BiologicallyDerivedProduct` | ISBT 128 `unit_id` |
| `transfers` | `SupplyDelivery` | `transfer_id` |
| `requests` | `ServiceRequest` | `request_id` |
| `facilities` | `Location` / `Organization` | `facility_id` |
| `temperature_logs` | `Observation` | `log_id` |

### FHIR Export

`scripts/export-fhir.ts` reads 5 clean donor records from `donors_clean`, maps each to a FHIR `Patient` resource via `donorToFhirPatient()`, wraps them in a FHIR `Bundle` of type `collection`, and writes the result to `data/clean/fhir_bundle.json`.

```bash
npm run export:fhir
```

The bundle uses `resourceType: "Bundle"` with `entry[]` containing the mapped resources, ready for import into any FHIR-compliant system (e.g., OpenMRS, OpenHIE, KHIS FHIR gateway).

---

## 2. ISBT 128 Validation (`scripts/detectors/invalidIsbt128.ts`)

ISBT 128 is the international standard for labelling blood products. Each `unit_id` or `donation_id` in the `units` / `donations` table is validated against the regex stored in `config/country.kenya.json`:

```json
{ "isbt128Regex": "^(U\\d{4}-[A-Z0-9]{3,4}-\\d{6}-(RBC|WB|PLT|FFP|CRYO)|W\\d{4}\\s\\d{2}\\s\\d{6})$" }
```

Malformed IDs are flagged as:
- **type**: `implausible`
- **dedupeKey**: `invalid_isbt128:<id>`
- **suggestion**: `{ action: 'flag_invalid_isbt128' }`

This prevents incorrectly labelled units from propagating into clinical or reporting systems.

---

## 3. DHIS2 Facility Name Normalisation

> *"Facility names differ between counties, so national dashboards like DHIS2 aggregate data that doesn't quite match."*  
> — Richard Odongo, Kenyan health-data expert

DHIS2 aggregates data by facility name. When `requests.facility_name_raw` (free-text, as entered by field staff) does not match the canonical name in the `facilities` registry, records are silently lost from national dashboards.

### Solution: `inconsistentFacilityName` Detector

`scripts/detectors/inconsistentFacilityName.ts` performs a SQL join of `requests` against `facilities` and compares field names case-insensitively:

```sql
SELECT r.id, r.facility_name_raw, f.facility_name AS canonical_name
FROM requests r
JOIN facilities f ON r.facility_id = f.id
WHERE lower(trim(r.facility_name_raw)) != lower(trim(f.facility_name))
```

Each mismatch is flagged as:
- **type**: `implausible`
- **reason**: `"Facility name '{raw}' does not match the canonical facility registry '{canonical}'. This breaks DHIS2 aggregation."`
- **suggestion**: `{ action: 'fix_facility_name', suggested_facility_id: <id>, expected_name: <canonical_name> }`
- **dedupeKey**: `inconsistent_facility_name:<request_id>`

**710 mismatches** were detected on the Kenya dataset.

When a reviewer accepts the fix, `applyDecisionFix()` writes the canonical name to `requests_clean.facility_name_raw` with `resolution_status = 'normalized'`. DHIS2 reads from the normalised clean tables, so accepted fixes immediately improve dashboard accuracy.

---

## 4. Multi-Country Configuration

Interoperability settings are country-specific and stored in `config/country.<country>.json`, validated at startup via a Zod schema (`countryConfigSchema`).

| Setting | Kenya | Uganda |
|---------|-------|--------|
| `branding_name` | "Kenya Blood Workbench" | "Uganda Blood Workbench" |
| `phone_format_regex` | `^\+254\d{9}$` | `^\+256\d{9}$` |
| `min_donation_interval_days_male` | 90 | 90 |
| `min_donation_interval_days_female` | 90 | 90 |
| `enable_fuzzy_matching` | `true` | `true` |

Switch country at runtime:
```bash
npm run detect -- --config=config/country.uganda.json
```

No code changes are required. All detector thresholds, regex patterns, and weights are read from the config file at startup.

