# Team Guidelines

This file defines how the AI agent should behave in this monorepo. All contributors should treat these as the team standard.

---

## Repo Structure

This is a **Turborepo** monorepo managed with **Yarn workspaces** (Volta pins Node and Yarn versions). Workspaces:

- `apps/server/` — NestJS API and background worker (`SERVER_TYPE=worker`); catalogue, auth, jobs (e.g. MWIAH / Covetrus scraping), TypeORM + Postgres, BullMQ + Redis
- `apps/web/` — Next.js (Pages Router), React, TypeScript, Tailwind; admin and marketing UI
- `packages/shared/` — Shared TypeScript types and Zod schemas consumed by server and web

Always confirm which workspace you're working in before making changes. Do not assume changes in one package are safe to replicate in another — they may have different conventions, dependencies, and constraints.

When changing `packages/shared`, rebuild or rely on workspace linking so dependents pick up types (`yarn prepare:all` from the repo root if needed).

---

## Off-Limits Files & Folders

Never read, edit, create, or delete the following without explicit human confirmation:

- **`.env`, `.env.*`** — environment files of any kind (use `.env.example` as reference only when appropriate)
- **`**/migrations/**`** — database migration files under `apps/server/src/database/migrations/`
- **`docker-compose.yml`, `Dockerfile`, `**/Dockerfile`** — local infra and container build configs
- **`**/secrets/**`, `**/*.pem`, `**/*.key`** — credentials and certificates
- **`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`** — lockfiles (update via `yarn` only)

If a task seems to require touching these files, stop and ask.

---

## Code Conventions

- Match the style of the file you're editing — don't impose your own formatting preferences
- Do not change files outside the scope of the task you've been given
- Prefer small, focused changes over large refactors unless explicitly asked
- **Server (TypeORM):** use the Repository API for simple reads/writes; use the query builder only when complexity warrants it. Avoid narrow column selects for plain value columns unless optimizing a computed or view-heavy query
- **Typing:** strict types; avoid `as any` unless a human explicitly allows an exception
- **Structure:** single responsibility; higher-level code delegates to small private methods; descriptive names instead of multi-line comment blocks above functions; concise logs for important side effects, not verbose logging
- **Web:** use plain `<img>` — not Next.js / Vercel `<Image>`
- Write tests for new server/shared logic; don't delete existing tests without a clear reason. `apps/web` has no test suite today — don't invent one unless asked
- Leave comments explaining *why*, not *what*

---

## How to Work in This Repo

- **Always work from the repo root** — do not navigate outside it
- **Local infra:** `docker compose up -d` (Postgres and Redis; see root `README.md` for ports and credentials)
- **Before declaring a task done**, run the relevant checks:
  - Root: `yarn check-all` (shared + server + web)
  - Per workspace: `yarn workspace @vetply/<name> check-all` — see each `package.json` for scripts (`lint`, `format`, `build`, `test` where applicable)
- **Ask before installing new dependencies** — get confirmation before adding packages to any workspace
- **Do not run database commands** (`migration:run`, `migration:generate`, `migration:revert`, seeds, drops) without explicit instruction
- **Do not push to git** — commits and pushes are always a human decision

---

## Server Jobs & Scraping

Supplier scraping and catalogue import logic live in `apps/server/` (BullMQ consumers, Playwright sessions, importers). When working on jobs:

- Keep scraping and import boundaries inside the server package
- Do not change shared API contracts or `@vetply/shared` schemas unilaterally when they affect the web app
- Treat scrape concurrency, enqueue rules, and session handling as production-sensitive — prefer minimal, targeted changes

---

## When in Doubt

Stop and ask. A quick clarifying question is always better than an irreversible change.

---

## Pull Requests

Summarize what changed and why. Link the tracking ticket (Linear, GitHub issue, etc.) when one exists.

---

## Commit Messages

**Conventional Commits** format, **one line only** — no body, no multi-line.

Describe **what** was done or fixed, not **how**. Focus on the problem solved or behavior changed, not the implementation.

Examples:

- `feat: add manufacturer management to admin app`
- `fix(server): handle duplicate supplier listing mapping error`
- `chore: reduce MWIAH scrape concurrency to 2`
