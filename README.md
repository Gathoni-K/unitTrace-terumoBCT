# UnitTrace: Data Quality Workbench

> **A data steward's workbench that finds duplicate, missing and implausible records across national blood transfusion networks, placing human clinicians in control with explainable AI, strict data privacy, and verifiable audit trails.**

---

## 1. Overview

UnitTrace is built for national blood transfusion services (such as the Kenya National Blood Transfusion Service / KNBTS and Uganda Blood Transfusion Service). It monitors phlebotomy intake, hospital requests, inter-facility cold chain transit, and storage fridges to guarantee that contaminated, expired, unconfirmed, or duplicate blood records never compromise clinical care.

### Key Capabilities
- **Person in Control (No Auto-Merges)**: The system never silently alters clinical or donor data. Findings surface as human-in-the-loop review tasks with plain-English rationales.
- **Rule Engines & Explainable AI**: Detects sensor glitches, logger dropout blackouts, premature donation intervals, unconfirmed transfers, missing blood groups, and DHIS2 facility name discrepancies.
- **AI-Powered Duplicate Resolution**: Eliminates 99.5% of false-positive merge alerts compared to naive heuristics.
- **Data Minimisation & ODPC Compliance**: Frontline operators see masked personal data by default (`YYYY-XX-XX`, `XXXX`). Unmasking is strictly audited.
- **Multi-Country Agility**: External Zod-validated configuration enables instant hot-swapping between national operational policies (e.g., Kenya vs Uganda).
- **Standards-Ready**: Validates ISBT 128 donation numbers and exports validated records directly to HL7 FHIR (R4/R5) Patient and BiologicallyDerivedProduct bundles.

---

## 2. AI vs. Baseline Performance

To evaluate our machine learning and fuzzy-matching capability against real-world blood bank operations, we benchmarked the AI Fuzzy Matcher against a naive exact-match baseline on the planted dataset (452 ground-truth duplicate donor pairs):

| Metric | Naive Baseline (`phone_last4` only) | UnitTrace AI Fuzzy Matcher | Practical Impact |
|---|---|---|---|
| **Detected Pairs** | 94,439 | **454** | Reduces review backlog by **99.5%** |
| **True Positives (TP)** | 452 | **452** | 100% recall of actual duplicate donors |
| **False Positives (FP)** | 93,987 | **2** | Eliminates 93,985 erroneous merge suggestions |
| **False Negatives (FN)** | 0 | **0** | Zero missed duplicates |
| **Precision** | **0.48%** | **99.56%** | **+99.08 percentage points precision gain** |
| **Recall** | **100.0%** | **100.0%** | Comprehensive coverage |
| **F1 Score** | **0.0095** | **0.9978** | Operational viability for national deployment |

> Run `npm run measure:baseline` to reproduce this benchmark from the live database.

---

## 3. Built for the Real World (Expert Feedback Integration)

Direct feedback from Kenyan health-data expert **Richard Odongo** shaped our production resilience features:

### 1. Inconsistent Facility Name Normalization (DHIS2 / KHIS Aggregation)
> *"Facility names differ between counties, so national dashboards like DHIS2 aggregate data that doesn't quite match."*
- **Solution**: Implemented `inconsistentFacilityName.ts` joining hospital orders with the canonical master registry. Detects county abbreviations (e.g. `Kiambu CRH` vs `Kiambu County Referral Hospital`), and auto-normalizes clean records upon supervisor approval.

### 2. Role-Based Access Control (RBAC) & Anti-Shared-Login Audit
> *"Shared logins so a whole shift can use one account. This destroys your audit trail."*
- **Solution**: Strict role boundary enforcement via `x-user-role`. Frontline clerks are blocked with **HTTP 403 Forbidden** if they attempt to merge donor identities (only supervisors may merge). Every decision logs the client workstation IP address (`ip_address`), client channel (`web`, `sms`), and actor role into the immutable `public.audit_log`.

### 3. Data Minimisation, PII Masking & ODPC Registration
> *"They need to see... security evidence: encryption, role-based access, audit logs... ODPC registration and DPIA."*
- **Solution**: Designed to comply with the Kenya Data Protection Act 2019 and Office of the Data Protection Commissioner (ODPC) guidelines. All task queries mask `birth_date` to year (`1995-XX-XX`) and `phone_last4` to `XXXX`. Break-glass unmasking (`POST /api/tasks/:id/reveal`) immutably logs the accessor and timestamp to `public.access_log`. Excluded unnecessary form fields (`preferred_channel`, `consent_to_contact`, raw national ID numbers) from intake.

---

## 4. Multi-Country Configuration

UnitTrace features zero hardcoded country assumptions. Policies, donation intervals, and language strings reside in external JSON configuration files:

- **Kenya Configuration**: [`config/country.kenya.json`](config/country.kenya.json) (4-month donation interval for females, Swahili/English templates, Safaricom/Airtel phone regex).
- **Uganda Configuration**: [`config/country.uganda.json`](config/country.uganda.json) (3-month donation interval for females, Luganda/English templates, MTN/Airtel Uganda phone regex).

To switch countries dynamically:
```bash
# Run with Uganda national rules
npm run detect -- --config=config/country.uganda.json

# Run with Kenya national rules (default)
npm run detect
```

---

## 5. Getting Started & How to Run

### Prerequisites
- Node.js v20+
- PostgreSQL / Supabase project configured via `.env` (copy from `.env.example`)

### Quickstart Commands

```bash
# 1. Install dependencies
npm install

# 2. Ingest raw CSV data into PostgreSQL with transaction verification
npm run ingest

# 3. Run the automated data quality detection engine
npm run detect

# 3b. Run in rule-only fallback mode (when AI is offline)
npm run detect -- --no-ai

# 3c. Run with Uganda country configuration
npm run detect -- --config=config/country.uganda.json

# 4. Launch the Task Management & Remediation REST API server (port 3000)
npm run server

# 5. Review before/after data quality metrics and impact reporting
npm run metrics:before-after

# 6. Export verified clean datasets and HL7 FHIR bundles
npm run export:clean
npm run export:fhir
```

### Running Tests & Quality Verification

```bash
# Run comprehensive test suite (74 tests across 21 test files)
npm test

# Run strict TypeScript compiler check
npm run typecheck

# Run ESLint
npm run lint
```

---

## 6. Architecture & Data Documentation

- **Architecture Specification & Ecosystem Diagrams**: [`docs/architecture.md`](docs/architecture.md)
- **Data Minimisation & Governance Map**: [`docs/data-map.md`](docs/data-map.md)
- **HL7 FHIR Interoperability Guide**: [`docs/fhir-mapping.md`](docs/fhir-mapping.md)
- **SMS & USSD Decision Webhook**: [`docs/sms-webhook.md`](docs/sms-webhook.md)
- **Detector Expansion Backlog**: [`docs/detector-backlog.md`](docs/detector-backlog.md)

---

## 7. AI Tools Used

UnitTrace was built with the assistance of **Google Antigravity** powered by advanced Gemini & Claude frontier models working in pair-programming mode:
- **Test-Driven Architecture**: Crafting comprehensive unit and integration suites with Vitest (mocked PostgreSQL pools, transactional rollbacks, edge conditions).
- **Algorithmic Design**: Designing the multi-factor duplicate scoring algorithm (Levenshtein distance, date-of-birth day/month proximity indexing, phone agreement weighting).
- **Interoperability & Standards**: Mapping relational health tables to HL7 FHIR Release 4/5 resource definitions and ISBT 128 blood barcode specifications.
