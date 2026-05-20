# Frontend Architecture

This app uses a practical feature-based architecture for a modern trip planner. The goal is to keep a solo developer fast today while leaving clean expansion paths for maps, collaboration, offline support, itinerary editing, localization, and external API integration.

## Stack

- Next.js App Router with TypeScript for routing, SSR, metadata, and server/client component boundaries.
- Tailwind CSS v4 and shadcn/ui-style primitives for a consistent design system without a heavy component framework.
- next-intl for locale routing, SSR translations, metadata localization, ICU pluralization, and locale-aware formatting.
- TanStack Query for server state, caching, retries, request cancellation, and optimistic updates.
- Zustand for local UI and planner interaction state only.
- Axios for centralized networking, interceptors, token refresh, cancellation, and error normalization.
- React Hook Form and Zod for typed, localized forms.
- Framer Motion is installed for future interaction polish where animation improves usability.
- Node.js 24.15.0 LTS is the runtime target across Docker, local development, and CI.

## Folder Structure

```txt
src/
  app/[locale]/
    (auth)/login/
    (app)/trips/
    (app)/profile/
    layout.tsx
    loading.tsx
    error.tsx
    not-found.tsx
  components/
    ui/
    shared/
    layouts/
  config/
  constants/
  hooks/
  i18n/
    messages/en/
    messages/vi/
    messages.ts
    request.ts
    routing.ts
  modules/
    auth/
    trips/
    itinerary/
    places/
    profile/
  providers/
  services/
    api/
    errors/
  stores/
  types/
```

`app/` is only routing and composition. Feature behavior lives under `modules/`. Cross-feature infrastructure lives under `services/`, `providers/`, `stores/`, and `components/`.

## Runtime and Docker

Node.js `24.15.0` is the single runtime target.

It is declared in:

- `.nvmrc`
- `package.json`
- frontend Dockerfiles

Docker Compose starts only the frontend. Development images use bind mounts for live reload and named volumes for dependency directories. Production images are multi-stage builds.

## Dependency Setup

Dependencies are pinned through `package.json` ranges and should be locked by `package-lock.json` after install. Runtime dependencies are grouped around the requested stack: Next, React, Tailwind, shadcn primitives, next-intl, TanStack Query, Zustand, Axios, React Hook Form, Zod, Framer Motion, clsx, and tailwind-merge.

Use:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
```

## Next.js Configuration

`next.config.ts` enables:

- `next-intl` plugin with `src/i18n/request.ts`.
- strict React rendering.
- typed routes.
- remote image patterns for future map and travel imagery.

Next.js 16 uses `src/proxy.ts` for the request boundary. It runs `next-intl` locale negotiation and redirects `/` into a locale-prefixed route.

## Tailwind and shadcn/ui

Tailwind v4 is configured through `src/app/globals.css` and `@tailwindcss/postcss`. shadcn/ui metadata lives in `components.json`; primitives are committed under `src/components/ui` so the app owns its design surface.

The design system uses CSS variables for light/dark mode and avoids one-off styling. Feature UI should compose existing primitives before adding new ones.

## Internationalization

Locale routing is configured in `src/i18n/routing.ts`:

- Supported locales: `en`, `vi`.
- Default locale: `en`.
- Locale prefix: always, e.g. `/en/trips`, `/vi/trips`.

`src/i18n/request.ts` loads namespaced messages per request. Translation files are split by domain:

```txt
common.json
auth.json
trip.json
itinerary.json
places.json
profile.json
validation.json
```

This keeps files reviewable and prevents giant flat translation maps. Validation schemas are factories that receive `useTranslations("validation")`, so validation text is localized at the form boundary.

## API Layer

The API layer is centralized under `src/services/api`:

- `client.ts`: Axios instance, authorization interceptor, 401 refresh retry.
- `auth-refresh.ts`: refresh token request deduplication.
- `token-storage.ts`: replaceable browser token adapter.
- `errors.ts`: normalized `ApiError`.
- `request.ts`: typed `get/post/patch/delete` helpers.

UI components never call Axios directly. Modules expose typed service functions, and queries/mutations call those services.

## Auth Flow

Auth is prepared for:

- email login/register payloads and schemas.
- Google OAuth through Google Identity Services.
- future OAuth providers through provider-specific service contracts.
- backend-issued httpOnly session cookies.
- CSRF headers for cookie-backed unsafe requests.
- refresh-token retry in Axios.
- server route protection through `requireAuth`.

Current protected routes live in `src/app/[locale]/(app)`. The layout checks for a session cookie and redirects unauthenticated users to `/{locale}/login`.

The backend remains the authentication source of truth. The frontend receives the Google credential, sends it to `POST /auth/oauth/google`, and then fetches `GET /auth/me`. It does not trust Google profile data locally and does not persist refresh tokens in `localStorage`.

Session transport is cookie-first:

- Backend sets `tp_access_token`, `tp_refresh_token`, and readable `tp_csrf_token`.
- Axios sends `withCredentials`, `X-CSRF-Token`, `X-Locale`, and `X-Timezone`.
- The in-memory token adapter only supports non-browser or transitional body-token responses.
- `src/proxy.ts` handles fast cookie-presence redirects; server layouts validate with `/auth/me`.

Use `API_INTERNAL_URL` for server-side App Router calls when Docker networking differs from the browser-facing `NEXT_PUBLIC_API_URL`.

## State Management

TanStack Query owns server state:

- trips.
- session/profile.
- places.
- itinerary stops.
- future realtime invalidation.

Zustand owns local interaction state:

- modal state.
- sidebar state.
- selected planner trip.
- map viewport.
- temporary draft stops.
- filters.

Do not store server records in Zustand.

## Forms

Forms use React Hook Form plus Zod schema factories:

- schemas live inside the feature module.
- localized validation text is injected from `validation.json`.
- field-level errors use `FieldError`.
- mutation hooks handle success/error effects.

## Layouts and Routing

The app uses route groups:

- `(auth)` for unauthenticated auth screens.
- `(app)` for protected product screens.

Each route can define localized metadata using `getTranslations`. Shared layout chrome lives in `components/layouts/AppShell`, not inside feature modules.

## Error and Loading States

- API errors normalize to `ApiError`.
- Query retry policy avoids retrying auth and not-found failures.
- `error.tsx`, `loading.tsx`, `EmptyState`, `ErrorState`, and skeletons provide consistent UX.
- Toasts are centralized through Sonner and translation-aware hooks.

## Map Architecture

Map-specific concepts are isolated in `modules/places` and `stores/use-planner-store.ts`.

The app currently avoids choosing Google Maps, Mapbox, or OpenStreetMap. Future provider-specific adapters should live behind services/hooks so itinerary UI does not care which map SDK is active.

Recommended future shape:

- `modules/places/services/google-places.service.ts`
- `modules/places/services/mapbox-places.service.ts`
- `modules/places/components/map-view.tsx`
- `modules/itinerary/components/drag-itinerary-board.tsx`

## Example Module

`modules/trips` demonstrates the standard feature layout:

- `types/` for domain contracts.
- `schemas/` for localized form validation.
- `services/` for API calls.
- `queries/` for query keys and query options.
- `mutations/` for optimistic updates.
- `components/` for feature UI.
- `pages/` for route-level composition.

## Development Workflow

1. Add or update translation keys first.
2. Add typed module contracts.
3. Add service functions.
4. Add query/mutation hooks.
5. Compose UI from shared primitives.
6. Add route files only for routing and layout composition.
7. Run `npm run typecheck`, `npm run lint`, and focused tests.

This workflow keeps feature work easy to review and friendly to AI-assisted development.
