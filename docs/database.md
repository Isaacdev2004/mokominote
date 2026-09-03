# Database

MoKominoté uses **Supabase Postgres**. That is still PostgreSQL — Drizzle talks to it with a normal connection string. You do not need a local Postgres install.

Project: [https://golqbahhzteuokrapzcu.supabase.co](https://golqbahhzteuokrapzcu.supabase.co)

Schema source: `lib/db/src/schema/mokominote.ts`.

## Connect

1. Open the Supabase project → **Project Settings → Database**.
2. Open **Connect** and copy the **Session pooler** URI (port **5432**).
3. Put it in the workspace `.env` as `DATABASE_URL`.
4. Apply schema: `pnpm --filter @workspace/db run push`
5. Seed development data: `pnpm --filter @workspace/scripts run seed`

Use Session mode (5432) for this Express API. Transaction mode (6543) is for serverless and can break Drizzle schema push.

Example shape (replace password and region from the dashboard):

```
DATABASE_URL=postgresql://postgres.golqbahhzteuokrapzcu:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
```

## Tables

- `mokominote_users` — accounts, hashed passwords, roles, status
- `mokominote_sessions` — HTTP-only session token hashes
- `mokominote_password_reset_tokens` — hashed, expiring reset tokens
- `mokominote_categories` — admin-manageable business niches
- `mokominote_businesses` — listings, location, hours, social links, approval status
- `mokominote_business_members` — unique `(business_id, user_id)`
- `mokominote_posts` — announcement / deal / event
- `mokominote_comments`
- `mokominote_reactions` — unique like per user/post
- `mokominote_notifications`
- `mokominote_analytics_events` — profile views, joins, likes, comments
- `mokominote_audit_logs` — admin/security actions
- `mokominote_transactions` — payment records

## Indexes

Unique: user email, user clerk id, business slug, category slug, membership pair, reaction pair, session token, reset token.

Filtered/list indexes: business owner, category, district, village, status, post business and created_at, analytics business/type/created_at.

## Seed

`pnpm --filter @workspace/scripts run seed` loads Mauritius-oriented categories, four development users, four approved businesses, and sample community posts. Seed passwords are development-only.
