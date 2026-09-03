# Deployment

## Vercel (frontend + API on one project)

Use **one** Vercel project pointed at the GitHub repo. Do not deploy the Express app as a second static/API-only project.

1. Root Directory: leave empty (repository root). If you already set it to `artifacts/mokominote`, that also works.
2. Framework: Vite
3. Build Command: `pnpm --filter @workspace/mokominote run build`
4. Output Directory: `artifacts/mokominote/dist/public`
5. Add these **server** environment variables on that same project:

| Variable | Required |
|---|---|
| `DATABASE_URL` | Yes — Supabase transaction pooler (`:6543`) |
| `SESSION_SECRET` | Yes — long random string |
| `NODE_ENV` | Yes — `production` |
| `APP_URL` | Yes — your Vercel URL, e.g. `https://mokominote-api-server.vercel.app` |
| `DIRECT_URL` | Optional — only for migrations |
| `SUPABASE_URL` | Optional |

Do **not** add `VITE_API_URL`. The browser calls `/api` on the same domain.

`/businesses` is a frontend route. Open it on the Vercel site URL, not as a standalone API host path.

## Fresh environment

1. `pnpm install`
2. Set `DATABASE_URL` to the Supabase Session pooler URI (see `.env.example`)
3. `pnpm --filter @workspace/db run push`
4. `pnpm --filter @workspace/scripts run seed` (development only)
5. Build: `pnpm run build`
6. Start API: `pnpm --filter @workspace/api-server run start`
7. Serve the frontend build (`artifacts/mokominote/dist/public`)

On Replit, artifacts already declare their ports and the workspace router sends `/api` to the API server.

## Required environment

- `DATABASE_URL`
- `PORT` (API defaults to 8080 locally)
- `NODE_ENV`
- `APP_URL` / `API_URL` / `BASE_PATH` for local frontend

Optional: Clerk keys, Whop keys, Cloudinary keys, email keys.

## Security notes

- Never commit real credentials
- Never put secret API keys in frontend code
- Superadmin routes are enforced on the server
- Seed accounts must not be used in production
