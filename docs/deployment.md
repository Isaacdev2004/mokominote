# Deployment

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
