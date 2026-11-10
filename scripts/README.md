# Backend scripts

The scripts require `DATABASE_URL` in a local environment and a configured Supabase/Postgres database.

1. `npm run db:start`
2. `npm run db:reset`
3. `npm run ingest`
4. `npm run detect`

Ingestion and detector implementations are intentionally TODO stubs. The detector runner is ordered and validates the Kenya country pack before invoking them.
