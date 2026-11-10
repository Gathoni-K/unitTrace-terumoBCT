# Data Quality Workbench

## Problem and user

Blood bank records officers need a safe way to review suspicious records without automatic edits.

## What it does

It will surface review tasks for duplicate donors, facility names, sensor glitches, logger gaps, and missing values. Officers Accept, Change, or Reject suggestions.

## How to run

```sh
npm install
npm run db:start
npm run db:reset
npm run db:types
npm run ingest
npm run detect
npm run dev
```

## Architecture

See [docs/architecture.md](docs/architecture.md). The UI depends on the typed `DataClient` interface.

## Baseline versus smart result

| Method | Result |
| --- | --- |
| Baseline rules | TODO |
| Smart matching | TODO |

## Human control and fallback

Nothing is fixed automatically. Rule-only mode remains available when smart matching is offline.

## Offline and SMS

Decisions have an offline Dexie queue stub. SMS parsing is pure and documented for a future webhook.

## Country configuration

Country packs are validated with the shared zod schema.

## Data and licensing

The dataset is synthetic for the hackathon. Raw files are not committed.

## AI tools used and what for

- GitHub Copilot: scaffolding and typed placeholder generation.

