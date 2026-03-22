# Vetply server

NestJS API with PostgreSQL (TypeORM), Redis / BullMQ, Zod config validation, and Sentry error reporting.

## Setup

From the repo root:

```bash
yarn
cp .env.example .env
docker compose up -d
```

## Run

- **API:** `yarn dev` (default port **8580**). Bull Board: [http://localhost:8580/jobs](http://localhost:8580/jobs) (Basic Auth when `SYSTEM_SECRET` is set).
- **Worker:** `yarn dev:worker` (processes the `example` queue).

## Examples

- `GET /` — service name
- `GET /health` — liveness
- `POST /example/echo` — JSON body `{ "message": "hi" }` (Zod-validated request and response)

## Tests

```bash
yarn test
```

Uses Testcontainers (Docker required).
