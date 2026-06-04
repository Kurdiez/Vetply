# Claude Code — Web Guidelines

This file defines how Claude Code should behave when working in `apps/web/`. Follow the sections below that apply to your changes.

---

## Complex Coding Tasks

- Present high-level UI / data-flow designs (without minute implementation detail) for human approval before large changes.
- Name standardized patterns and explain why they fit.

---

## Backend Integration (REST API)

All frontend ↔ backend REST integration must follow the existing pattern:

- Add API helper functions under **`apps/web/src/utils/vetply-api/`** (use `vetplyApiClient` from `http-client.ts`).
- Group calls by domain in dedicated files (e.g. `catalogue-api.ts`, `user-api.ts`).
- Use request/response types and Zod schemas from **`@vetply/shared`**.
- Backend business APIs are **POST** with descriptive verb paths; call them with `vetplyApiClient.post(...)`.
- Some existing endpoints use **GET** (exports, picker queries) — match the existing helper style when extending those areas.

### Errors and user messaging

- The axios interceptor maps **500** and unknown failures to a generic unexpected-error toast.
- **400** responses with `{ failReason }` become `VetplyBadRequestError`; handle with `messageForVetplyFailReason()` from `fail-reason-messages.ts`.
- When adding a new backend fail-reason enum, extend **`fail-reason-messages.ts`** with a user-facing string for every new enum value.

---

## Page Architecture (React Context)

Each admin (or app) **page** should use a **controller Context** that owns:

- Page state (lists, filters, pagination, selection, modals, loading status).
- Actions (fetch, refetch, navigation, mutations).

Patterns to follow:

- `*ViewContext.tsx` — `Provider`, context value type, `use*View()` hook; calls `vetply-api` helpers.
- `*ViewPage.tsx` — wraps children in the provider; inner body uses `use*View()` and composes UI.

Examples: `CatalogueViewContext.tsx` / `CatalogueViewPage.tsx`, `SupplierListingsViewContext.tsx`, `ManufacturersViewContext.tsx`.

---

## UI Components

Two layers:

1. **Generic / pure UI** — under `src/components/ui/` (and reusable admin primitives under `src/components/admin/list/`). Props-only; no API or page context. Fine-tune via props.
2. **Context-aware / page UI** — next to the feature (e.g. `CatalogueNameSearch.tsx`). Thin wrappers that read from `use*View()` (or receive props from the page body) and pass data into generic components.

Do not call `vetply-api` from generic UI components; keep HTTP in Context (or rare shared hooks if already established).

### Images

- Use plain **`<img>`** — not Next.js / Vercel `<Image>`.

---

## Shared Package

- Import types and schemas from **`@vetply/shared`**; do not duplicate API contracts in the web app.
- System-only API shapes stay on the server — never add them to shared.

---

## Testing

- There is no web test suite today. Do not add one unless explicitly requested.
- Server/shared tests cover API behavior; run `yarn workspace @vetply/server test` when backend changes need verification.

---

## Code Organization

- Keep code modular: small functions and focused components so page and context code stay readable.
- Match the style of surrounding files; prefer small, scoped changes unless asked otherwise.
- `yarn workspace @vetply/web check-all` — format, lint, build — before declaring web work done.

---

## When in Doubt

Stop and ask. For repo-wide rules (off-limits files, git, dependencies, etc.), see the root [`CLAUDE.md`](../../CLAUDE.md).
