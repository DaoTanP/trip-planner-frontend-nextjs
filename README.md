# Trip Planner Frontend

A production-grade frontend foundation for a modern, internationalized Trip Planner web application.

This repository is strictly frontend-only. The API is owned by a separate repository and is consumed through `NEXT_PUBLIC_API_URL`.

## What This App Is Built For

- Planning trips around places, dates, routes, and itinerary stops.
- Map-heavy interactions with future support for Google Maps, Mapbox, or OpenStreetMap.
- Internationalized UX from day one.
- Authenticated product areas with Google OAuth and httpOnly cookie support.
- Server-state caching, optimistic updates, and background refetching.
- Lightweight local interaction state for planner UI, filters, modals, and map viewport.
- Future realtime collaboration, offline mode, notifications, and drag-and-drop itinerary editing.

## Tech Stack

- Runtime: Node.js 24.15.0 LTS, npm 11
- Framework: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS v4, shadcn/ui-style primitives
- Internationalization: next-intl
- Server state: TanStack Query
- Client state: Zustand
- Forms: React Hook Form, Zod
- Networking: Axios
- Animation: Framer Motion
- Notifications: Sonner
- Testing: Vitest, Testing Library, jsdom
- Tooling: ESLint, Prettier, Husky, lint-staged, TypeScript strict mode
- Local runtime: Docker Compose frontend service

## Node Strategy

The project standardizes on Node.js `24.15.0`.

The version is declared in `.nvmrc`, `package.json`, frontend Dockerfiles, and CI recommendations. Use `npm ci` in CI and production builds. Use `npm install` only when intentionally updating the lockfile.

CI should use:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
    cache: npm
```

## Project Structure

```txt
src/
  app/[locale]/
  components/
  config/
  constants/
  hooks/
  i18n/
  modules/
  providers/
  services/
  stores/
  types/
docs/
  adr/
```

`src/app` is the routing and composition layer. Feature behavior belongs in `src/modules/<feature>`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Conventions](docs/CONVENTIONS.md)
- [AI rules](docs/AI_RULES.md)
- [Dependency audit](docs/DEPENDENCY_AUDIT.md)
- [ADR system](docs/adr/README.md)
- [ADR template](docs/adr/TEMPLATE.md)
- [Frontend foundation ADR](docs/adr/0001-feature-based-nextjs-frontend-foundation.md)
- [Repository boundary ADR](docs/adr/0002-keep-frontend-and-api-repositories-separate.md)
- [Cookie-backed Google OAuth ADR](docs/adr/0003-cookie-backed-google-oauth.md)

Read these before making architectural changes.

## Docker Development

The frontend can run in Docker:

```bash
docker compose up
```

This starts the frontend at:

```txt
http://localhost:3000/en
```

The app expects the separate API service to be available at `NEXT_PUBLIC_API_URL`. By default Docker uses:

```txt
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
API_INTERNAL_URL=http://host.docker.internal:4000/api/v1
```

Run the API repository separately when you need live API behavior.

## Local Node Development

Use Node 24:

```bash
nvm use
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Run the frontend:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000/en
```

## Environment Variables

```txt
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
API_INTERNAL_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_DEFAULT_TIME_ZONE=Asia/Bangkok
NEXT_PUBLIC_GOOGLE_CLIENT_ID=replace-with-google-oauth-web-client-id
NEXT_PUBLIC_AUTH_ACCESS_COOKIE_NAME=tp_access_token
NEXT_PUBLIC_AUTH_REFRESH_COOKIE_NAME=tp_refresh_token
NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=tp_csrf_token
```

Docker-specific frontend defaults live in `.env.docker`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run test
npm run test:watch
npm run validate
```

Before handing off changes, run:

```bash
npm run typecheck
npm run lint
npm run test
```

## Production Build Strategy

Production builds use the root multi-stage Dockerfile:

1. install dependencies with `npm ci`.
2. run `next build`.
3. copy the Next.js standalone server into a small runtime image.

Build the image:

```bash
docker build -t trip-planner-frontend .
```

## Internationalization

Locale routing is handled by `next-intl`.

Supported locales:

- `en`
- `vi`

Routes are locale-prefixed:

```txt
/en
/en/login
/en/trips
/vi
/vi/login
/vi/trips
```

Every user-facing string should use translation keys. Add Vietnamese keys whenever adding English keys.

## API Boundary

Frontend API infrastructure lives in `src/services/api`. React components should never call Axios directly.

This repo owns typed client-side service functions and query/mutation hooks. It does not own API implementation code, database migrations, workers, or server Docker services.

## State Management Rules

Use TanStack Query for server state: trips, itinerary stops, places, profile, and session.

Use Zustand for local interaction state: modal visibility, planner filters, map viewport, temporary draft stops, and sidebar state.

Do not store server records in Zustand.

## Testing

The test setup uses Vitest, Testing Library, and jsdom. Add focused tests for reusable UI, hooks, query behavior, form validation, and complex feature flows.

## Dependency Notes

The project targets Node 24 LTS. The dependency manifest currently matches the checked-in lockfile so Docker and CI can use reproducible `npm ci` installs.

When intentionally upgrading frontend tooling, update `package.json` and `package-lock.json` together under Node 24.

See [Dependency audit](docs/DEPENDENCY_AUDIT.md) for upgrade decisions, pinned package rationale, compatibility notes, and the maintenance workflow.

## AI-Assisted Development

Agents should inspect the target module before editing, follow [AI rules](docs/AI_RULES.md), preserve feature boundaries, avoid hardcoded UI strings, avoid adding API server code to this repository, and keep changes small and traceable.
