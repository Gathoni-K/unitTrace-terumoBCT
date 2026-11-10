# Data Protection Impact Assessment (Lite)

> This is a lightweight DPIA summary for the UnitTrace hackathon prototype, prepared in the spirit of the Kenya Data Protection Act 2019 and ODPC guidance. A full DPIA would be required before production deployment.

---

## 1. Processing Activity

**System**: UnitTrace — a blood-bank data stewardship workbench.  
**Purpose**: Detect duplicate donor records, missing blood group data, implausible values, and cold-chain sensor glitches in blood transfusion datasets to improve patient safety.  
**Controller**: CODEINE / UnitTrace team.  
**Data subjects**: Blood donors and transfusion patients in the Kenya dataset.

---

## 2. Lawful Basis

| Basis | Provision |
|-------|-----------|
| Processing of special-category health data | Kenya Data Protection Act 2019, **s.46** — processing is necessary for health purposes (blood transfusion safety, a public health benefit) |
| Purpose limitation | Data is used solely to detect and correct data quality defects; no profiling, marketing, or secondary use |

Documented in [`docs/data-map.md`](./data-map.md).

---

## 3. Data Minimisation

Fields excluded from ingest and not stored in any application table:

| Excluded Field | Rationale |
|---------------|-----------|
| `preferred_channel` | Not required for data-quality detection |
| `consent_to_contact` | Out of scope for stewardship workbench |
| `national_id` / `passport_no` | Strong identifier — excluded to reduce breach risk |
| `full_phone_number` | Only last 4 digits (`phone_last4`) retained for fuzzy matching |
| `patient_name` | Patient names not needed for unit or transfer validation |

`phone_last4` is intentionally partial: it provides enough signal for the duplicate detector without storing a linkable identifier.

---

## 4. Local Processing — No External AI Services

All detection and matching is computed **locally** in TypeScript:

- Fuzzy name matching: `scripts/lib/fuzzy.ts` (`stringSimilarity` via Levenshtein)
- Birth date proximity: `birthDateScore()` in `scripts/lib/fuzzy.ts`
- All rule-based detectors: `scripts/detectors/`

**No personal data is sent to any external AI API or LLM.** The only external service dependency is the Africa's Talking SMS API, which receives a phone number and a short task summary message — no donor PII is transmitted.

This design means the system can be hosted on-premise inside a Ministry of Health data centre with no data leaving the country, satisfying data-residency requirements.

---

## 5. Key Risks and Mitigations

### Risk 1 — Shared workstation logins destroy audit trails

**Risk**: Multiple staff share a single login, making it impossible to attribute decisions to individuals.  
**Mitigation**: Every `submitDecision()` call records `ip_address`, `channel` (`web`/`sms`), and `user_role` in `public.audit_log.after_value`. SMS decisions additionally capture the sender's phone number as `actor`. Even under a shared login, the physical workstation and time can be identified.

**Residual risk**: Low. Per-decision IP capture provides individual accountability without requiring per-user login enforcement at the application layer.

### Risk 2 — PII exposure in review queue

**Risk**: Staff can see sensitive donor details (birth date, phone fragments) beyond what their role requires.  
**Mitigation**: `GET /api/tasks` and `GET /api/tasks/:id` return masked fields by default (`YYYY-XX-XX`, `XXXX`). Full data is available only via `POST /api/tasks/:id/reveal`, which writes to `public.access_log` (audited break-glass).

**Residual risk**: Low. Masking is applied server-side and cannot be bypassed by API clients.

### Risk 3 — Incorrect automated record merges

**Risk**: Automated merging of donor records could corrupt clinical data.  
**Mitigation**: The system **never merges records automatically**. All fuzzy-match findings are written as review tasks. `applyDecisionFix()` only executes after a human reviewer submits an explicit decision. Merge decisions (`duplicate_donor`) additionally require `user_role === 'supervisor'`.

**Residual risk**: None from automated action. Human error risk remains and is managed via the audit trail and supervisor requirement.

---

## 6. Data Retention

| Table | Retention policy |
|-------|-----------------|
| `public.tasks` | Retained until resolved; no auto-deletion in prototype |
| `public.audit_log` | Append-only, immutable, governed by RLS (no `UPDATE`/`DELETE`) |
| `public.access_log` | Append-only, immutable, governed by RLS |
| `*_clean` tables | Accumulate accepted corrections; no auto-purge in prototype |

A production deployment would define retention periods aligned with KDPA storage-limitation principles and blood-bank regulatory requirements.

---

## 7. ODPC Registration

Under the Kenya Data Protection Act 2019, data controllers processing sensitive personal data (health data) are required to register with the **Office of the Data Protection Commissioner (ODPC)**.

Before production deployment, the operating organisation must:
1. Register as a Data Controller with the ODPC.
2. File this DPIA (or a full version) with the registration.
3. Appoint a Data Protection Officer (DPO) if processing at scale.
4. Establish a subject-access-request (SAR) procedure for donors wishing to access or correct their records.

This is documented as a pre-production requirement in [`docs/data-map.md`](./data-map.md).

