# UnitTrace Architecture & Ecosystem Specification

UnitTrace (Data Quality Workbench) is an intelligent, privacy-preserving data quality inspection and human-in-the-loop remediation engine designed for national blood transfusion services.

---

## 1. High-Level Ecosystem Placement

The workbench sits as a resilient verification and remediation buffer between frontline medical devices/regional blood collection hubs and national health aggregation systems (such as DHIS2, Kenya Health Information System / KHIS, and Uganda eHMIS).

```mermaid
flowchart LR
    subgraph PointOfCare["Frontline Collection & Cold Chain"]
        T["Terumo BCT Devices<br/>(Apheresis / Phlebotomy)"]
        S["Cold Chain IoT Sensors<br/>(Fridge Loggers)"]
        H["Hospital Order Entry<br/>(Transfusion Requests)"]
    end

    subgraph Workbench["UnitTrace Workbench"]
        ING["Ingestion & Data Minimisation"]
        DET["Detection Engine<br/>(Rules + AI Matcher)"]
        WB["Human-in-the-Loop Review<br/>(Web App & SMS)"]
        CLEAN["Clean State Store<br/>(Validated Data)"]
    end

    subgraph NationalEcosystem["National Health Information Architecture"]
        DHIS2["DHIS2 / KHIS<br/>(Aggregate Reporting)"]
        FHIR["National Health HIE<br/>(HL7 FHIR Repositories)"]
        LOGISTICS["Regional Logistics Hubs<br/>(KEMSA / Joint Medical Store)"]
    end

    T -->|"Raw manifests"| ING
    S -->|"Telemetry logs"| ING
    H -->|"Clinical orders"| ING

    ING --> DET
    DET -->|"Flagged Tasks"| WB
    WB -->|"Decisions & Audit"| CLEAN

    CLEAN -->|"Normalized Facilities"| DHIS2
    CLEAN -->|"Patient & Product Bundles"| FHIR
    CLEAN -->|"Verified Custody Manifests"| LOGISTICS
```

---

## 2. End-to-End Processing & Governance Pipeline

```mermaid
flowchart TD
    subgraph Intake["1. Data Intake & Minimisation"]
        CSV["Raw CSV Files / Streams"] -->|"Strict Schema & PII Truncation"| STAGE["PostgreSQL Temp Staging"]
        STAGE -->|"Transactional Type-Casting"| DB[("Supabase / Postgres Core Tables")]
    end

    subgraph Detection["2. Multi-tier Detection Pipeline"]
        DB --> RULES["Rule-Based Detectors<br/>- Sensor Glitches (-99, 99.9)<br/>- Logger Blackouts (>6h)<br/>- Donation Too Soon (LAG gap)<br/>- Missing Blood Groups<br/>- Unconfirmed Transfers<br/>- Inconsistent Facility Names (DHIS2)<br/>- ISBT 128 Identifier Format"]
        DB --> AI["AI Fuzzy Duplicate Matcher<br/>- County Levenshtein<br/>- Day/Month Birthdate Proximity<br/>- Phone Last 4 Agreement<br/>- 99.56% Precision"]
        FALLBACK{"AI Online?"}
        FALLBACK -->|"Yes"| AI
        FALLBACK -->|"No (--no-ai)"| NAIVE["Naive Baseline<br/>(Phone Last-4 Match)"]
    end

    subgraph Store["3. Flag Store & Immutable Audit"]
        RULES -->|"Structured Findings"| TASKS[("public.tasks<br/>(Unique dedupe_key)")]
        AI -->|"High-Precision Merges"| TASKS
        NAIVE -->|"Baseline Alerts"| TASKS
    end

    subgraph API["4. Human-in-the-Loop Review & Security"]
        TASKS --> GET_TASKS["GET /api/tasks<br/>(Default Masked PII: YYYY-XX-XX, XXXX)"]
        GET_TASKS --> FRONTEND["Review Workbench UI"]
        FRONTEND --> DECISION["POST /api/tasks/:id/decision<br/>- Action: Accept / Change / Reject<br/>- RBAC: Supervisor required for merges<br/>- Clerk allowed for missing data"]
        FRONTEND --> REVEAL["POST /api/tasks/:id/reveal<br/>(Break-glass unmasking)"]
        REVEAL --> ACCESS_LOG[("public.access_log<br/>(User, Timestamp, Task ID)")]
        DECISION --> AUDIT_LOG[("public.audit_log<br/>(Before/After, Channel, IP, Role)")]
        DECISION --> DECISIONS[("public.decisions")]
    end

    subgraph CleanData["5. Clean Data & Standards Export"]
        DECISION -->|"Auto-remediate"| CLEAN_TABLES[("Clean Tables<br/>donors_clean<br/>requests_clean<br/>transfers_clean")]
        CLEAN_TABLES --> EXPORT_CSV["Export Clean CSVs<br/>(donors_clean.csv, audit_trail.csv)"]
        CLEAN_TABLES --> EXPORT_FHIR["Export HL7 FHIR<br/>(Patient & BiologicallyDerivedProduct)"]
    end
```

---

## 3. Layer Specifications

### 3.1 Country Configuration Layer (`config/country.<country>.json`)
- **Zero hardcoded rules**: Thresholds, temperature boundaries, minimum inter-donation days, phone regexes, and local translations live in external JSON files validated by Zod schema (`CountryConfig`).
- **Dynamic Country Swap**: CLI and services accept `--config=<path>` to run seamless multi-tenant deployments (e.g., Kenya vs Uganda blood bank rules).

### 3.2 Human-in-the-Loop & Person-in-Control Principle
- **No auto-merging**: Algorithmic predictions generate review tasks with explainable English rationales and proposed fixes.
- **Role Enforcement (RBAC)**: Clerks resolve missing operational data; high-consequence donor merges strictly require supervisor authorization (`x-user-role: supervisor`), returning HTTP 403 otherwise.
- **Anti-Shared-Login Audit**: Captures workstation IP address, client channel (`web`, `sms`), and actor role on every transaction.

### 3.3 Data Minimisation & Privacy by Design (ODPC & DPIA)
- Personal data is masked by default on all endpoints (`birth_date` → `YYYY-XX-XX`, `phone_last4` → `XXXX`).
- Non-essential fields (`preferred_channel`, `consent_to_contact`, raw national ID numbers) are omitted from persistent schemas.
- Unmasking events are logged as immutable security events in `public.access_log`.
