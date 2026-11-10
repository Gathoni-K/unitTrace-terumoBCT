# Detector Backlog: Planted Data Quality Defects

Derived from the official Starter Dataset README (`data/raw/README.md`, section *Deliberate data quality problems*).

## Backlog Table

| Planted Problem (Verbatim from README) | Defect Type (duplicate / missing / implausible) | Table(s) Involved | Expected Count from README (if stated) | Proposed Detector Filename | Proposed dedupeKey Pattern | Priority (1 = build first) |
|---|---|---|---|---|---|---|
| About 450 donors (1%) are registered twice under different IDs (same birth date, sex, county and phone last 4 digits). | duplicate | `donors` | About 450 donors (1%) | `scripts/detectors/duplicateDonors.ts` | `duplicate_donor:<sorted_donor_ids>` | 1 |
| About 1.2% of donor records have no blood group. | missing | `donors` | About 1.2% of donor records | `scripts/detectors/missingDonorBloodGroup.ts` | `missing_donor_blood_group:<donor_id>` | 2 |
| 5% of emergency requests record the patient blood group as unknown. | missing | `requests` | 5% of emergency requests | `scripts/detectors/unknownPatientBloodGroup.ts` | `unknown_patient_blood_group:<request_id>` | 3 |
| About 3% of transfers have no received_at time (the receiving hospital never confirmed). | missing | `transfers` | About 3% of transfers | `scripts/detectors/unconfirmedTransfers.ts` | `unconfirmed_transfer:<transfer_id>` | 4 |
| Temperature loggers drop out for hours at a time, more often where connectivity is 2G or 3G. | missing | `temperature_logs`, `facilities` | Not stated ("for hours at a time") | `scripts/detectors/loggerGaps.ts` | `logger_gap:<facility_id>:<gap_start>:<gap_end>` | 5 |
| 60 temperature readings are sensor glitches (-99.0, 99.9 or 0.0). | implausible | `temperature_logs` | 60 temperature readings | `scripts/detectors/sensorGlitches.ts` | `sensor_glitch:<facility_id>:<recorded_at>` | Built (Reference) |
| Some donors gave blood again before the minimum gap (3 months for men, 4 for women). | implausible | `donations`, `donors` | Not stated ("Some donors") | `scripts/detectors/donationTooSoon.ts` | `donation_too_soon:<donation_id>` | 6 |

---

## Not Building

- **"14% of requests have the facility name typed differently (upper case, abbreviations, extra spaces). Use facility_id as the truth."**
  - **Reason**: This is a string formatting / casing variation and abbreviation inconsistency on a raw input text field (`requests.facility_name_raw`), rather than a **duplicate** record, **missing** value, or physically **implausible** measurement. Because the hackathon brief mandates that defect types must be strictly *duplicate*, *missing*, or *implausible*, text normalization does not fit the three defect categories.

---

## Ground Truth for Baseline

- **Table**: `public.donors` (and `data/raw/donors.csv`)
- **Identifying Columns**: The composite natural identity tuple `(birth_date, sex, home_county, phone_last4)`.
- **Generation Logic** (verified in `data/raw/gen.py` lines 608–613):
  The generator sampled 1.8% of donors, assigned them new sequential IDs (`DNR-046...`), bumped their `registration_date` forward by 30–300 days while keeping `(birth_date, sex, home_county, phone_last4)` identical, and retained entries within the simulation window.
- **Planted Duplicates Count in Dataset**:
  - Exactly **452 duplicate groups** exist in `data/raw/donors.csv`.
  - Every duplicate group is a pair of size 2 (an original registration and a planted second registration).
  - Exactly **904 total records** belong to duplicate groups.
  - Exactly **452 redundant / planted secondary donor registrations** exist in the dataset.

