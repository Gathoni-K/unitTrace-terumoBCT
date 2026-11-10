# AI Methodology — Duplicate Donor Detection

## Overview

UnitTrace uses a two-tier approach to duplicate donor detection: a naive rule-based baseline and an AI-enhanced fuzzy matcher. Both are configurable and either can run independently.

---

## 1. Baseline Detector (`scripts/detectors/duplicateDonors.ts`)

The naive baseline groups donor records solely by `phone_last4` (exact match). Any two donors sharing the same last four digits of their phone number are flagged as a potential duplicate pair.

**Benchmark results** (measured via `scripts/measure-baseline.ts` on the Kenya dataset):

| Metric    | Baseline                         |
|-----------|----------------------------------|
| Pairs detected | 94,439                      |
| True positives (TP) | 452                   |
| False positives (FP) | 93,987               |
| **Precision** | **0.48%**                |
| Recall    | 100%                             |
| F1 score  | 0.0095                           |

The baseline floods reviewers with false positives — nearly every flag is wrong. This is the problem the AI matcher solves.

---

## 2. AI Fuzzy Matcher (`scripts/detectors/fuzzyDuplicates.ts`)

The AI matcher computes a **composite similarity score** across three signals for every candidate donor pair:

```
score = weightBirthDate × birthDateScore + weightCounty × countySimilarity + weightPhone × phoneLast4Match
```

### Signal Details

| Signal | Implementation | Source |
|--------|---------------|--------|
| **Birth date proximity** | `birthDateScore()` in `scripts/lib/fuzzy.ts` — year match = 1.0, ±1 month = 0.8, ±2 months = 0.5, else 0.0 | `fuzzyDuplicates.ts` |
| **County name similarity** | `stringSimilarity()` — Levenshtein edit distance normalised by `max(len_a, len_b)` | `scripts/lib/fuzzy.ts` |
| **Phone last 4 match** | Exact string match of `phone_last4` → 1.0, else 0.0 | `fuzzyDuplicates.ts` |

### Kenya Default Weights (`config/country.kenya.json`)

```json
{
  "smartMatchThreshold": 0.85,
  "weightBirthDate": 0.5,
  "weightCounty": 0.3,
  "weightPhone": 0.2
}
```

A pair is flagged only when `score ≥ smartMatchThreshold`. Pairs below the threshold are discarded silently.

**Benchmark results** (same Kenya dataset):

| Metric    | AI Fuzzy Matcher                |
|-----------|---------------------------------|
| Pairs detected | 454                        |
| True positives (TP) | 452                 |
| False positives (FP) | 2                  |
| **Precision** | **99.56%**             |
| Recall    | 100%                            |
| F1 score  | 0.9978                          |

The AI matcher reduces false positives from 93,987 to 2 — a **46,994× reduction** — while maintaining 100% recall.

---

## 3. No Auto-Merge Principle

> *"They need to see security evidence: encryption, role-based access, audit logs… ODPC registration and DPIA."*  
> — Richard Odongo, Kenyan health-data expert

The detector **never merges records automatically**. Every flagged pair is written to `public.tasks` as a review item. A human reviewer (Clerk or Supervisor, depending on task type) must call `POST /api/tasks/:id/decision` explicitly before any fix is applied. `applyDecisionFix()` in `scripts/api/tasksService.ts` runs only after a decision is submitted.

This design is intentional: clinical safety requires a human in the loop on every merge decision.

---

## 4. AI-Off Fallback

Two mechanisms can disable the AI matcher:

### 4a. Config flag (`config/country.kenya.json`)
```json
{ "enable_fuzzy_matching": false }
```
When `false`, `detect.ts` skips `fuzzyDuplicates.ts` and loads `duplicateDonors.ts` (the naive baseline) instead.

### 4b. CLI flag
```bash
npm run detect -- --no-ai
```

In both cases, the console prints:
```
⚠️ AI offline. Running rule-based detectors and naive baseline only.
```

This ensures the system remains operational even when the fuzzy matching component cannot run (e.g., performance-constrained environments).

