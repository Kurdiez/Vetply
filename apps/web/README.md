# Vetply web

Next.js **Pages Router** (`src/pages`), React, TypeScript, Tailwind CSS v4. Workspace package `@vetply/shared`.

## Run

From repo root (after `yarn` and `yarn build` so `shared` has `dist/`):

```bash
yarn workspace @vetply/web dev
```

Or `yarn dev` at the root (Turborepo runs server + web)..

Default dev URL: [http://localhost:6238](http://localhost:6238).

## Structure

- `src/pages/` — routes (`index.tsx`, `_app.tsx`)
- `src/components/marketing/` — landing sections (`HeroSection`, `HeroImagePanel`)

## Env

Optional: `cp .env.example .env.local` — e.g. `NEXT_PUBLIC_API_URL` when calling `apps/server` from the browser.
