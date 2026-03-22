# Vetply

Monorepo for Vetply (Turborepo).

## Prerequisites

- [Volta](https://volta.sh/) for Node and Yarn
- Docker (for local Postgres and Redis)

## Installation

```bash
yarn
cp apps/server/.env.example apps/server/.env
```

To reinstall dependencies and build every workspace package, run `yarn prepare:all` from the repo root (same as `yarn` then `yarn build`; workspaces link `@vetply/shared` into `apps/server` and `apps/web`).

## Local infrastructure

```bash
docker compose up -d
```

Postgres: `localhost:7855` (user `admin`, password `admin`, database `breakout-lab`).  
Redis: `localhost:7856`, password `local-password`.

## Project structure

- `apps/server` — NestJS API
- `apps/web` — Next.js Pages Router (React, TypeScript, Tailwind), uses `@vetply/shared`
- `packages/shared` — Shared TypeScript types and Zod schemas

## Apps

See each app’s `README` or `package.json` scripts (e.g. `yarn dev` from the repo root with Turborepo).
