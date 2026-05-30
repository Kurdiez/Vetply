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
- **Worker:** `yarn dev:worker` (processes `COVETRUS_SCRAPE` and `MWIAH_SCRAPE` BullMQ queues).

Playwright’s Chromium bundle (including headless shell) is **not** installed by `yarn` alone. After dependency installs or Playwright upgrades, run:

```bash
yarn workspace @vetply/server playwright:install
```

(or `cd apps/server && yarn playwright:install`).

## Covetrus scrape (BullMQ)

1. Set all variables in `.env` (see `.env.example`); Covetrus scrape needs `COVETRUS_USERNAME`, `COVETRUS_PASSWORD`, `COVETRUS_LOGIN_URL`, and `COVETRUS_ORDER_DETAIL_URL`.
2. Run API (`yarn dev:api` or `yarn dev`) and worker (`yarn dev:worker`) with Redis available.
3. Call **`POST /system/jobs/covetrus/enqueue-all-scrape`** (system-guarded; uses `SYSTEM_SECRET`). The API enqueues **`COVETRUS_SCRAPE.SCRAPE_CATEGORY`** jobs—one per `SalesCategory` in `@vetply/shared` when no body is sent. Optional JSON body:

   ```json
   { "categories": ["Pharmaceutical"] }
   ```

   Omit `categories`, pass `{}`, or pass an empty array to enqueue all six categories. Response includes `categoryLabels` and `jobIds`.

   ```bash
   curl -X POST http://localhost:8580/system/jobs/covetrus/enqueue-all-scrape \
     -H "x-system-secret: $SYSTEM_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"categories":["Pharmaceutical"]}'
   ```
4. The worker runs each scrape job in its own browser session (login, open catalog tree for that label, scroll grid, import from UIDL). Optional: Bull Board at [`/jobs`](http://localhost:8580/jobs) (`admin` / `SYSTEM_SECRET`).

## MWIAH scrape (BullMQ)

1. Set all variables in `.env` (see `.env.example`); MWIAH scrape needs `MWIAH_USERNAME`, `MWIAH_PASSWORD`, and `MWIAH_STORE_URL`. Sign-in URL is hardcoded in the worker.
2. Run API and worker with Redis available.
3. **Discover categories and enqueue product scrapes** — `POST /system/jobs/mwiah/enqueue-all-scrape` enqueues **`MWIAH_SCRAPE.DISCOVER_CATEGORIES_AND_ENQUEUE`**, which logs in, scrapes the Products menu from the DOM, and enqueues one **`MWIAH_SCRAPE.SCRAPE_CATEGORY_PRODUCTS`** job per catalog category URL (~400+ jobs).

   ```bash
   curl -X POST http://localhost:8580/system/jobs/mwiah/enqueue-all-scrape \
     -H "x-system-secret: $SYSTEM_SECRET" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

4. **Scrape one category** — `POST /system/jobs/mwiah/enqueue-category-products-scrape` enqueues a category job that signs in, opens `url`, walks all product list pages (pagination when present), fetches each product’s Insite REST detail API (no per-product browser navigation), and imports rows into the catalogue as supplier **MWIAH** (products, listings, manufacturers).

   ```bash
   curl -X POST http://localhost:8580/system/jobs/mwiah/enqueue-category-products-scrape \
     -H "x-system-secret: $SYSTEM_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://onlinestore.mwiah.co.uk/Catalog/pet-food/everyday-pet-food/cat-and-dog-general-diets"}'
   ```

5. Drain stale **`MWIAH_SCRAPE.PROBE_HOME_PAGE`** jobs from Bull Board if any remain from earlier runs.

## Examples

- `GET /` — service name
- `GET /health` — liveness
- `POST /example/echo` — JSON body `{ "message": "hi" }` (Zod-validated request and response)

## Tests

```bash
yarn test
```

Uses Testcontainers (Docker required).
