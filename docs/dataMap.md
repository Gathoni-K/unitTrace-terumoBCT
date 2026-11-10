# Data Minimisation and PII Access Map

This document establishes the data governance, minimisation policy, sensitivity classification, role-based access control (RBAC) boundaries, and Kenya ODPC / DPIA compliance posture for all entities loaded into UnitTrace.

---

## 1. Governance Principles & Security Evidence

1. **Minimisation at Ingestion**: Only fields strictly required for donor safety, clinical compatibility, cold chain monitoring, or blood logistics are ingested into persistent application tables.
2. **Masking by Default**: All API views presented to frontline operators mask personal identifiers:
   - `birth_date`: Masked to year only (`1995-01-01` → `1995-XX-XX`).
   - `phone_last4`: Masked to generic placeholder (`XXXX`).
3. **Audited Break-Glass Reveal**: Full PII is accessible strictly through an auditable reveal endpoint (`POST /api/tasks/:id/reveal`), which immutably logs the accessing user UUID, timestamp, event type, and target entity into `public.access_log`.
4. **Separation of Roles & Shared Login Mitigation**:
   - **Clerk**: Can review missing data and format issues (`missing_donor_blood_group`, `unknown_patient_blood_group`, `unconfirmed_transfer`, `inconsistent_facility_name`). **Forbidden (HTTP 403)** from merging duplicate donors.
   - **Supervisor**: Authorized to adjudicate duplicate donor merges, approve facility aliases, and trigger break-glass PII unmasking.
   - **Auditor / System**: Read-only oversight of `public.audit_log` and `public.access_log`.
5. **ODPC Registration & DPIA Compliance**:
   - Aligned with the **Kenya Data Protection Act (2019)** regulations enforced by the Office of the Data Protection Commissioner (ODPC).
   - Data Protection Impact Assessment (DPIA) conducted to eliminate the audit trail vulnerability of shared hospital workstations by tracking `ip_address`, `user_role`, and `channel` on every decision.
   - Cryptographic safeguards: **TLS 1.3** in transit and **AES-256** encryption at rest.

---

## 2. Excluded Fields (Data Minimisation by Design)

To uphold the principle of storage limitation and privacy-by-design, UnitTrace intentionally excludes superfluous personal fields present in legacy health datasets:

| Excluded Field | Source Presence | Reason for Exclusion / Minimisation |
|---|---|---|
| `preferred_channel` | Legacy donor forms | Excluded; notifications strictly follow verified institutional registry channels. |
| `consent_to_contact`| Physical intake records | Managed at collection point phlebotomy; not persisted in processing workbench. |
| `national_id` / `passport_no` | Government ID | Never ingested; replaced with pseudonymised `donor_id` (`DNR-XXXXXX`). |
| `full_phone_number` | Raw donor contact | Truncated to `phone_last4` at intake to prevent mass exfiltration. |
| `patient_name` | Hospital orders | Never captured; requests reference only `patient_blood_group` and `clinical_indication`. |

---

## 3. Table-by-Table Data Dictionary & Access Classification

### 3.1 `public.donors` & `public.donors_clean`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility | Role Permitted to Unmask |
|---|---|---|---|---|---|
| `donor_id` | `text` (PK) | Unique national donor identifier | Internal ID | Unmasked (`DNR-000001`) | All |
| `sex` | `text` | Donation interval calculation (3 mo male, 4 mo female) | Low | Unmasked (`M`, `F`) | All |
| `birth_date` | `date` | Age eligibility & fuzzy duplicate detection | **PII (High)** | **Masked** (`YYYY-XX-XX`) | Supervisor via Reveal |
| `blood_group` | `text` | Clinical compatibility checking & inventory | Clinical Sensitive | Unmasked (`A+`, `O-`, etc.) | All |
| `home_county` | `text` | Regional rebalancing & duplicate disambiguation | Low | Unmasked (County name) | All |
| `registration_date` | `date` | Donor history and seniority | Low | Unmasked (`YYYY-MM-DD`) | All |
| `registration_site_id` | `text` | Source facility reference | Internal | Unmasked (`RBTC-NBO`) | All |
| `phone_last4` | `text` | SMS notification routing & duplicate matching | **PII (Medium)** | **Masked** (`XXXX`) | Supervisor via Reveal |
| `merged_into` | `text` | Target donor ID following duplicate consolidation | Internal | Unmasked | All |
| `resolution_status` | `text` | Active / Merged lifecycle state | Internal | Unmasked | All |

---

### 3.2 `public.requests` & `public.requests_clean`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `request_id` | `text` (PK) | Hospital order number | Internal | Unmasked |
| `facility_id` | `text` | Ordering hospital or transfusion centre | Internal | Unmasked |
| `facility_name_raw` | `text` | Raw text input from hospital clerks | Low | Unmasked |
| `requested_at` | `timestamp` | Clinical urgency & response time tracking | Low | Unmasked |
| `urgency` | `text` | Triage priority (`routine`, `emergency`) | Clinical | Unmasked |
| `patient_blood_group` | `text` | Required ABO/Rh match for patient | Clinical Sensitive | Unmasked |

---

### 3.3 `public.transfers` & `public.transfers_clean`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `transfer_id` | `text` (PK) | Logistics movement identifier | Internal | Unmasked |
| `unit_id` | `text` | ISBT 128 unit barcode label | Internal | Unmasked |
| `from_facility_id` | `text` | Dispatching regional centre / hub | Internal | Unmasked |
| `to_facility_id` | `text` | Receiving hospital / bank | Internal | Unmasked |
| `dispatched_at` | `timestamp` | Chain-of-custody departure timestamp | Low | Unmasked |
| `received_at` | `timestamp` | Custody confirmation timestamp (null = unconfirmed) | Low | Unmasked |

---

### 3.4 `public.units` & `public.donations`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `unit_id` | `text` (PK) | ISBT 128 unit identifier | Internal | Unmasked |
| `donation_id` | `text` | Link to collection session | Internal | Unmasked |
| `blood_group` | `text` | Confirmatory tested unit blood group | Clinical Sensitive | Unmasked |
| `donor_id` | `text` | Associated donor record | Internal | Unmasked |
| `collection_date` | `date` | Phlebotomy date | Low | Unmasked |
| `outcome` | `text` | Collection result (`collected`, `deferred`) | Clinical | Unmasked |

---

### 3.5 `public.temperature_logs`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `facility_id` | `text` | Monitored storage facility | Operational | Unmasked |
| `recorded_at` | `timestamp` | Cold-chain reading timestamp | Operational | Unmasked |
| `temp_c` | `numeric` | Cold storage temperature reading | Operational | Unmasked |

---

### 3.6 `public.access_log` & `public.audit_log`

| Table | Purpose | Tracked Fields | Retention & Access Policy |
|---|---|---|---|
| `public.access_log` | Logs every PII unmasking event (`task_pii_reveal`). | `id`, `at`, `user_id`, `event`, `record_type`, `record_id` | Append-only. RLS restricted to supervisor and compliance auditor roles. |
| `public.audit_log` | Records state transitions, workbench decisions (accept, change, reject), and before/after payloads. | `id`, `at`, `user_id`, `action`, `task_id`, `before_value`, `after_value` (includes `channel`, `ip_address`, `user_role`) | Immutable audit trail. Exported for national health governance & DHIS2 compliance. |
