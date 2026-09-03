# API

Base path: `/api`

Success payloads are resource JSON. Errors use `{ success: false, message, code }` with the matching HTTP status.

## Auth

- `GET /auth/me`
- `PATCH /auth/me`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## Directory and community

- `GET /categories`
- `GET /businesses` search, category/district/village, sort, pagination
- `POST /businesses`
- `GET /businesses/:slug`
- `PATCH /businesses/:id`
- `POST /businesses/:id/join`
- `GET|POST /businesses/:id/posts`
- `PATCH|DELETE /posts/:id`
- `POST /posts/:id/like`
- `GET|POST /posts/:id/comments`
- `GET /community/feed`

## Dashboards

- `GET /dashboard/member`
- `GET /dashboard/business`
- `GET /dashboard/admin`

## Admin

- `GET /admin/users`
- `PATCH /admin/users/:id/status`
- `GET /admin/businesses`
- `PATCH /admin/businesses/:id/status`
- `GET /admin/posts`
- `PATCH /admin/posts/:id/status`

## Other

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `POST /uploads`
- `GET /payments/products`
- `POST /payments/checkout`
- `GET /payments/transactions`

Regenerate clients after OpenAPI edits:

`pnpm --filter @workspace/api-spec run codegen`
