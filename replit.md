# MoKominoté

Community-driven local business directory for Mauritius.

## Run

- `pnpm --filter @workspace/api-server run dev` — API (port 8080 locally)
- `pnpm --filter @workspace/mokominote run dev` — frontend
- `pnpm --filter @workspace/db run push` — apply schema
- `pnpm --filter @workspace/scripts run seed` — development data
- `pnpm run typecheck`

Required env: `DATABASE_URL` (Supabase Session pooler URI)

Project: https://golqbahhzteuokrapzcu.supabase.co

## Architecture

Local session auth is primary (scrypt password hashes + HTTP-only cookies). Clerk remains optional for later OAuth. Payments and uploads are provider-abstracted; development mode never fakes a successful live payment.

## Product

Public directory, business profiles, member/owner/admin dashboards, community posts, notifications, and basic analytics on Supabase Postgres.
