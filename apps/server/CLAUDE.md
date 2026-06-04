# Claude Code — Server Guidelines

This file defines how Claude Code should behave when working in `apps/server/`. Follow the sections below that apply to your changes.

---

## Complex Coding Tasks

- Present high-level architectural / coding pattern designs (without minute implementation detail) for human approval before large changes.
- Name standardized patterns and explain why they fit.

---

## REST API Endpoints

Applies to all REST API endpoints **except** system endpoints (see below) and built-in health checks.

### HTTP methods and paths

- Use **POST** for new and updated business APIs, with paths that state intent using clear verbs (e.g. `POST auth/login`, `POST admin/catalogue/products/list`).
- When extending an existing controller, match its established method and path style unless a refactor is explicitly requested.

### Errors

- **Unexpected errors** — surface as **500 Internal Server Error** (let Nest’s default handling apply, or rethrow after logging as appropriate).
- **Expected business failures** — throw **`400 Bad Request`** with body `{ failReason: '<ENUM_VALUE>' }` using a fail-reason enum defined in `@vetply/shared`.
- Register new fail-reason enums in `packages/shared` (domain schema + union on `vetplyFailReasonSchema` / `vetplyBusinessErrorBodySchema` as needed).

### Request / response schemas

- Define request and response payload Zod schemas and types in **`packages/shared`**.
- For list endpoints, follow existing shared list query/response schemas (`page`, `pageSize`, `totalCount`, etc.) — see `catalogue-products-list.schemas.ts` and `supplier-listings-list.schemas.ts`.

---

## System Endpoints

System endpoints (e.g. under `system/`, job enqueue, internal ops) differ from public REST APIs:

- Request/response Zod schemas and types **do not** live in the shared package.
- Add a dedicated `*.schemas.ts` file next to the controller under `apps/server` (e.g. `system/jobs/covetrus-scrape-enqueue.schemas.ts`).
- Do **not** add system-endpoint types or schemas to `@vetply/shared`.

---

## TypeORM

- When adding entities, mirror relationship and cascade patterns from existing entities in `src/database/entities/`.
- Add indexes that match new query patterns; remove redundant indexes when cleaning up.
- Prefer the TypeORM **Repository API** for simple reads/writes; use the query builder only when complexity warrants it.
- Avoid granular per-column selects for simple value columns; select individual columns when they are computed or part of a complex view.

### Migrations

- **Do not** hand-write TypeORM migration files.
- Generate migrations from `apps/server` with:

  ```bash
  yarn migration:generate whatever-migration-title
  ```

- Do not run migration commands unless explicitly instructed (see repo root [`CLAUDE.md`](../../CLAUDE.md)).

---

## Environment Variables

- Add new backend env variables in `apps/server/src/config/schemas/index.ts`.

---

## Testing

- **Functional / integration flows** — follow existing patterns that use the test database (`src/commons/test/test-db.ts`, testcontainers).
- **Unit tests** — follow existing patterns under `__tests__/` for mocking data and functions.
- Cover **both** positive and negative cases to avoid false positives.

---

## Code Organization

- Keep code modular: focused functions or private class methods so high-level code stays readable.
- Match the style of surrounding files; prefer small, scoped changes unless asked otherwise.
- Separate generic low-level code (injectable parameters, minimal context) from higher-level code that wires it for a specific use case.

---

## When in Doubt

Stop and ask. For repo-wide rules (off-limits files, git, dependencies, etc.), see the root [`CLAUDE.md`](../../CLAUDE.md).
