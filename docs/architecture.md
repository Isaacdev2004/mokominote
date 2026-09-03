# Architecture

MoKominoté is a pnpm workspace with a React frontend and an Express API sharing PostgreSQL through Drizzle.

## Request flow

1. The browser calls `/api/*` with `credentials: include`.
2. Vite (or the Replit router) proxies `/api` to the API server.
3. Cookie session middleware resolves the user from `mokominote_sessions`.
4. Route handlers check authentication and role on the server.
5. Domain helpers map database rows into public view models.

## Layers

- **Routes** (`artifacts/api-server/src/routes`) stay thin: parse input, call helpers, return JSON.
- **Auth** (`lib/auth.ts`) owns sessions, Clerk fallback, and role gates.
- **Domain** (`lib/mokominote.ts`) owns listing filters, post views, notifications, and analytics events.
- **Services** isolate payments and file storage so providers can change later.
- **Frontend** uses generated React Query hooks plus a small `extra.ts` client for newer endpoints.

## Roles

| Role | Access |
| --- | --- |
| member | Directory, join communities, react, comment, profile |
| owner | Own business profile, posts, members, analytics |
| admin | Users, businesses, content moderation, platform stats |

Owners can only mutate businesses they own. Admins are checked on every `/api/admin/*` request.

## Future expansion

The core chain stays:

Business → Community → Members → Posts → Engagement

Jobs, bookings, rewards, investor tools, and advanced ads should attach to this chain rather than replace it.
