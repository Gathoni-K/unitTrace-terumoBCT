# Security & Compliance

## Overview

UnitTrace handles personal health data under the Kenya Data Protection Act 2019. This document describes the four security controls implemented in the codebase: role-based access control, PII masking by default, audited break-glass reveal, and enriched audit logging to mitigate shared-login risk.

---

## 1. Role-Based Access Control (RBAC)

### Header-Based Role Identification

Every API request is expected to include the `x-user-role` header. Extraction occurs in `scripts/api/app.ts`:

```typescript
const userRole = req.headers['x-user-role'] ?? 'clerk';
```

If the header is absent, the caller is treated as a `clerk`. Supported values: `'clerk'`, `'supervisor'`.

### Merge Decision Restriction

Tasks of type `duplicate_donor` (record merges) require supervisor approval. This check is enforced in `scripts/api/tasksService.ts`:

```typescript
if (task.type === 'duplicate_donor' && payload.user_role !== 'supervisor') {
  // HTTP 403 returned
}
```

A `clerk` attempting to submit a merge decision receives **HTTP 403**. All other task types (`missing_blood_group`, `format_error`, `cold_chain`, etc.) are accessible to clerks.

### SMS Channel RBAC

The same restriction applies to SMS decisions routed through the Africa's Talking webhook (`POST /api/webhooks/africastalking/sms`). The webhook reads the sender's phone number and routes into the same `submitDecision()` function. If the sender is not a supervisor, merge decisions are rejected with an error SMS reply.

---

## 2. PII Masking by Default

All task list and task detail responses are masked before leaving the server. Masking is applied in `scripts/lib/pii.ts` via `maskTaskPii()`.

| Field | Masked Value |
|-------|-------------|
| `birth_date` | `YYYY-XX-XX` (year retained, month and day hidden) |
| `phone_last4` | `XXXX` |

`maskTaskPii()` is called on every response from `GET /api/tasks` and `GET /api/tasks/:id`. Reviewers see enough context to assess plausibility without exposing exact dates or phone fragments.

---

## 3. Break-Glass Reveal (Audited)

When a reviewer requires the full record to make a decision, they call:

```
POST /api/tasks/:id/reveal
```

`revealTask()` in `scripts/api/tasksService.ts`:
1. Fetches the task row with `getTask(pool, taskId, false)` — bypassing masking.
2. Inserts a row into `public.access_log`:

```
user_id, event: 'task_pii_reveal', record_type: 'task', record_id: <taskId>, at: <timestamp>
```

3. Returns the unmasked task.

Every PII access is therefore individually logged and auditable. `public.access_log` is append-only and protected by RLS (`INSERT` restricted to own `user_id`; no `UPDATE` or `DELETE` permitted).

---

## 4. Enriched Audit Log — Shared Login Mitigation

> *"Shared logins so a whole shift can use one account. This destroys your audit trail."*  
> — Richard Odongo, Kenyan health-data expert

A common failure mode in Kenyan health facilities is a single shared login credential used by an entire shift. This makes the audit log useless for accountability.

### Solution

Every `submitDecision()` call writes the following fields into `public.audit_log.after_value` (JSONB), in addition to the decision payload:

| Field | Source | Purpose |
|-------|--------|---------|
| `channel` | `'web'` or `'sms'` | Distinguishes browser vs phone decisions |
| `ip_address` | `x-forwarded-for` header or `socket.remoteAddress` | Identifies workstation even with shared login |
| `user_role` | `x-user-role` header | Records the role claimed at time of decision |
| `actor` | Username or SMS phone number | Additional identity signal for SMS decisions |

Even if a shared login is used, the IP address and channel pinpoint the physical workstation and time of decision. SMS decisions additionally capture the sender's phone number as `actor`, providing strong individual accountability.

### Schema References

- `public.audit_log` — defined in `supabase/migrations/002_app_tables.sql`
- `public.access_log` — defined in `supabase/migrations/002_app_tables.sql`
- RLS policies — defined in `supabase/migrations/003_rls_and_audit.sql`

---

## 5. Encryption

| Layer | Control |
|-------|---------|
| Data in transit | TLS 1.3 (Supabase default) |
| Data at rest | AES-256 (Supabase default) |

Documented in [`docs/dataMap.md`](./dataMap.md).

