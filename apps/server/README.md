# Vetply server

NestJS API with PostgreSQL (TypeORM), Redis / BullMQ, Zod config validation, and Sentry error reporting.

## Setup

From the repo root:

```bash
yarn
yarn workspace @vetply/server playwright:install
cp apps/server/.env.example apps/server/.env
docker compose up -d
```

## Run

- **API:** `yarn dev` (default port **8580**). Bull Board: [http://localhost:8580/jobs](http://localhost:8580/jobs) (Basic Auth when `SYSTEM_SECRET` is set).
- **Worker:** `yarn dev:worker` (processes the `COVETRUS_SCRAPE` BullMQ queue).

Playwright’s Chromium bundle (including headless shell) is **not** installed by `yarn` alone. After dependency installs or Playwright upgrades, run:

```bash
yarn workspace @vetply/server playwright:install
```

(or `cd apps/server && yarn playwright:install`).

## Covetrus scrape (BullMQ)

1. Set `COVETRUS_USERNAME` and `COVETRUS_PASSWORD` in `.env`. Optional: `COVETRUS_LOGIN_URL`, `COVETRUS_ORDER_DETAIL_URL`. Defaults use `connect.covetrus.co.uk` for both URLs so the session targets that host.
2. Run API (`yarn dev:api` or `yarn dev`) and worker (`yarn dev:worker`) with Redis available.
3. Call **`POST /system/jobs/covetrus/enqueue`** (system-guarded; uses `SYSTEM_SECRET`). The API enqueues six **`COVETRUS_SCRAPE.SCRAPE_CATEGORY`** jobs—one per `SalesCategory` in `@vetply/shared`.
4. The worker runs each scrape job in its own browser session (login, open catalog tree for that label, scroll grid, import from UIDL). Optional: Bull Board at [`/jobs`](http://localhost:8580/jobs) (`admin` / `SYSTEM_SECRET`).

## Examples

- `GET /` — service name
- `GET /health` — liveness
- `POST /example/echo` — JSON body `{ "message": "hi" }` (Zod-validated request and response)

## Tests

```bash
yarn test
```

Uses Testcontainers (Docker required).
