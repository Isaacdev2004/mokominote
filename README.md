# MoKominoté MVP

MoKominoté is a community-driven local business directory for Mauritius. People discover independent businesses, join their communities, and stay close to announcements, deals, and events. Business owners manage a public profile and community. Platform admins review listings and keep the directory trustworthy.

This is a small but working product: real Supabase Postgres data, hashed passwords, HTTP-only sessions, and role-checked APIs.

## Tech stack

- React 19, TypeScript, Vite, Tailwind CSS, Wouter, TanStack Query
- Express 5 API
- Supabase Postgres + Drizzle ORM
- OpenAPI → Orval (Zod + React Query client)
- pnpm workspaces

## Architecture

```
artifacts/mokominote     Public site + dashboards
artifacts/api-server     REST API, auth, payments, storage
lib/db                   Drizzle schema and database client
lib/api-spec             OpenAPI contract
lib/api-zod              Generated request validation
lib/api-client-react     Generated React Query hooks
scripts                  Seed and security tests
```

Business logic lives in API services. The frontend talks to `/api` with cookie sessions.

## How to run

1. Install: `pnpm install`
2. Copy `.env.example` to `.env`
3. Paste your Supabase **Session pooler** URI into `DATABASE_URL` (project: https://golqbahhzteuokrapzcu.supabase.co)
4. Push schema: `pnpm --filter @workspace/db run push`
5. Seed development data: `pnpm --filter @workspace/scripts run seed`
6. Start API: `pnpm --filter @workspace/api-server run dev`
7. Start frontend: `pnpm --filter @workspace/mokominote run dev`

Development seed logins (never use in production):

- `admin@mokominote.dev` / `DevPass123!`
- `asha@mokominote.dev` / `DevPass123!` (business owner)
- `noah@mokominote.dev` / `DevPass123!` (business owner)
- `leila@mokominote.dev` / `DevPass123!` (member)

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run typecheck` | Typecheck the workspace |
| `pnpm run build` | Typecheck + build |
| `pnpm --filter @workspace/db run push` | Apply schema to Supabase Postgres |
| `pnpm --filter @workspace/scripts run seed` | Load Mauritius sample data |
| `pnpm --filter @workspace/scripts run test` | Auth hashing tests |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API client/Zod from OpenAPI |

## Authentication

Email/password registration and login create a server session stored as an HTTP-only cookie (`mk_session`). Passwords are hashed with scrypt. Roles come from the database, never from the browser. Clerk remains an optional later OAuth path when `CLERK_PUBLISHABLE_KEY` is set.

Password reset tokens are stored hashed and expire after one hour. Email sending is not wired yet; in development the forgot-password response may include `devResetToken`.

## Payments

`PAYMENT_PROVIDER=dev` records pending transactions and does **not** mark them paid. Live Whop checkout requires `PAYMENT_PROVIDER=whop` plus official credentials, and still refuses to pretend a payment succeeded.

## Storage

Uploads are validated (JPEG/PNG/WebP/GIF, 2MB) and stored locally under `uploads/` in development. Cloudinary is reserved behind `STORAGE_PROVIDER=cloudinary`.

## Known limitations

- Email delivery is not connected
- Google Maps is a placeholder until an API key is configured
- Live Whop charges are not enabled without credentials
- Cloudinary is not connected
- Automated API integration tests still need a dedicated test database

See `docs/` for architecture, database, API, payments, and deployment notes.
