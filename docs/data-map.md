# Data Minimisation and PII Access Map

This document establishes the data governance, minimisation policy, sensitivity classification, and role-based access control (RBAC) boundaries for all entities loaded into UnitTrace.

---

## 1. Governance Principles

1. **Minimisation at Ingestion**: Only fields required for identification, blood safety, cold chain monitoring, or logistics are loaded into persistent application tables.
2. **Masking by Default**: All API views presented to frontline clerks mask personal identifiers (`birth_date` -> `YYYY-XX-XX`, `phone_last4` -> `XXXXXNNNN`).
3. **Audited Break-Glass Reveal**: Full PII is accessible strictly through an auditable reveal endpoint (`POST /api/tasks/:id/reveal`), which immutably logs the accessing user ID, timestamp, and target entity into `public.access_log`.
4. **Separation of Roles**:
   - **Clerk**: Operational review of tasks, accepting/rejecting suggestions with masked PII.
   - **Supervisor**: Escalation review, approval of facility aliases, unmasking donor PII for identity dispute resolution.
   - **Auditor / System**: Read-only oversight of `public.audit_log` and `public.access_log`.

---

## 2. Table-by-Table Data Dictionary & Access Classification

### 2.1 `public.donors` & `public.donors_clean`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility | Role Permitted to Unmask |
|---|---|---|---|---|---|
| `donor_id` | `text` (PK) | Unique national donor identifier | Internal ID | Unmasked (`DNR-000001`) | All |
| `sex` | `text` | Donation interval calculation (3 mo male, 4 mo female) | Low | Unmasked (`M`, `F`) | All |
| `birth_date` | `date` | Age eligibility & fuzzy duplicate detection | **PII (High)** | **Masked** (`YYYY-XX-XX`) | Supervisor via Reveal |
| `blood_group` | `text` | Clinical compatibility checking & inventory | Clinical Sensitive | Unmasked (`A+`, `O-`, etc.) | All |
| `home_county` | `text` | Regional rebalancing & duplicate disambiguation | Low | Unmasked (County name) | All |
| `registration_date` | `date` | Donor history and seniority | Low | Unmasked (`YYYY-MM-DD`) | All |
| `registration_site_id` | `text` | Source facility reference | Internal | Unmasked (`RBTC-NBO`) | All |
| `phone_last4` | `text` | SMS notification routing & duplicate matching | **PII (Medium)** | **Masked** (`XXXXX1234`) | Supervisor via Reveal |
| `merged_into` | `text` | Target donor ID following duplicate consolidation | Internal | Unmasked | All |
| `resolution_status` | `text` | Active / Merged lifecycle state | Internal | Unmasked | All |

---

### 2.2 `public.requests` & `public.requests_clean`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `request_id` | `text` (PK) | Hospital order number | Internal | Unmasked |
| `facility_id` | `text` | Ordering hospital or transfusion centre | Internal | Unmasked |
| `facility_name_raw` | `text` | Raw text input from hospital clerks | Low | Unmasked |
| `requested_at` | `timestamp` | Clinical urgency & response time tracking | Low | Unmasked |
| `urgency` | `text` | Triage priority (`routine`, `emergency`) | Clinical | Unmasked |
| `patient_blood_group` | `text` | Required ABO/Rh match for patient | Clinical Sensitive | Unmasked |

---

### 2.3 `public.transfers` & `public.transfers_clean`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `transfer_id` | `text` (PK) | Logistics movement identifier | Internal | Unmasked |
| `unit_id` | `text` | ISBT 128 unit barcode label | Internal | Unmasked |
| `from_facility_id` | `text` | Dispatching regional centre / hub | Internal | Unmasked |
| `to_facility_id` | `text` | Receiving hospital / bank | Internal | Unmasked |
| `dispatched_at` | `timestamp` | Chain-of-custody departure timestamp | Low | Unmasked |
| `received_at` | `timestamp` | Custody confirmation timestamp (null = unconfirmed) | Low | Unmasked |

---

### 2.4 `public.units` & `public.donations`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `unit_id` | `text` (PK) | ISBT 128 unit identifier | Internal | Unmasked |
| `donation_id` | `text` | Link to collection session | Internal | Unmasked |
| `blood_group` | `text` | Confirmatory tested unit blood group | Clinical Sensitive | Unmasked |
| `donor_id` | `text` | Associated donor record | Internal | Unmasked |
| `collection_date` | `date` | Phlebotomy date | Low | Unmasked |
| `outcome` | `text` | Collection result (`collected`, `deferred`) | Clinical | Unmasked |

---

### 2.5 `public.temperature_logs`

| Field | Data Type | Purpose | Sensitivity | Default API Visibility |
|---|---|---|---|---|
| `facility_id` | `text` | Monitored storage facility | Operational | Unmasked |
| `recorded_at` | `timestamp` | Cold-chain reading timestamp | Operational | Unmasked |
| `temp_c` | `numeric` | Cold storage temperature reading | Operational | Unmasked |

---

### 2.6 `public.access_log` & `public.audit_log`

| Table | Purpose | Retention & Access Policy |
|---|---|---|
| `public.access_log` | Logs every PII unmasking event (`task_pii_reveal`), including actor user UUID, timestamp, and target task ID. | Append-only. RLS restricted to supervisor and auditor roles. |
| `public.audit_log` | Records state transitions, workbench decisions (accept, change, reject), and before/after payloads. | Immutable audit trail. Exported for national compliance. |

