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
- dnd-kit is the standardized drag-and-drop layer for itinerary planning interactions.

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
    map/
  providers/
  services/
    api/
    errors/
  stores/
    use-planner-store.ts
  types/
```

`app/` is only routing and composition. Feature behavior lives under `modules/`. Cross-feature infrastructure lives under `services/`, `providers/`, `stores/`, and `components/`.

The trip editor lives at:

```txt
src/app/[locale]/(app)/trips/[tripId]/edit
```

and composes feature code from:

- `src/modules/trips` for trip detail, editor shell, notes, and trip-level mutations.
- `src/modules/itinerary` for itinerary item services and optimistic mutations.
- `src/modules/places` for place search.
- `src/modules/map` for provider-shaped map rendering and map math.
- `src/stores/use-planner-store.ts` for local UI interaction state.

The editor workflow is inspired by Wanderlog-style trip planning:

- editable planner on the left
- interactive map on the right
- synchronized selection
- day sections
- itinerary cards
- direct manipulation interactions

## Runtime and Docker

Node.js `24.15.0` is the single runtime target.

It is declared in:

- `.nvmrc`
- `package.json`
- frontend Dockerfiles

Docker Compose starts only the frontend. Development images use bind mounts for live reload and named volumes for dependency directories. Production images are multi-stage builds.

Frontend Docker development reads:

- `NEXT_PUBLIC_API_URL`
- `API_INTERNAL_URL`
- `NEXT_PUBLIC_MAP_PROVIDER`
- `NEXT_PUBLIC_OSM_TILE_URL`

The browser-facing API URL remains `http://localhost:4000/api/v1`; server-side API calls can use `host.docker.internal` through `API_INTERNAL_URL`.

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

All trip editor UI strings live under:

```txt
trip.editor.*
```

in:

```txt
src/i18n/messages/<locale>/trip.json
```

New editor copy must use `next-intl`; avoid hardcoded labels, loading states, empty states, and action text.

## API Layer

The API layer is centralized under `src/services/api`:

- `client.ts`: Axios instance, authorization interceptor, 401 refresh retry.
- `auth-refresh.ts`: refresh token request deduplication.
- `token-storage.ts`: replaceable browser token adapter.
- `errors.ts`: normalized `ApiError`.
- `request.ts`: typed `get/post/patch/delete` helpers.
- `contracts/`: synced API v1 contract from the backend.
- `endpoints.ts`: centralized path builders.

UI components never call Axios directly. Modules expose typed service functions, and queries/mutations call those services.

API contract ownership is backend-first. The canonical contract lives in `trip-planner-backend-expressjs/src/api/contracts/v1.ts`, and this repo consumes the generated-style copy under `src/services/api/contracts`. Feature modules should alias DTOs from that contract instead of hand-writing request and response shapes.

Success shape:

```json
{ "success": true, "data": {}, "meta": {} }
```

Error shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [],
    "requestId": "req_..."
  }
}
```

Frontend code should use stable `error.code` values for localized UX and treat backend `message` as a fallback/debug value.

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
- trip detail: `tripKeys.detail(tripId)`
- trip list: `tripKeys.list()`
- place search: `placeKeys.search(params)`

Zustand owns local interaction state:

- modal state.
- sidebar state.
- selected planner trip.
- map viewport.
- temporary draft stops.
- filters.
- selected itinerary item/place.
- hovered item.
- place search/panel state.

Do not store server records in Zustand.

Server state must not be copied into Zustand. Components read trip data from React Query and write UI-only selection state to the planner store.

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

The trip editor route is an App Router server page that renders a client editor shell. The map is dynamically imported with `ssr: false` because map providers depend on browser APIs and should not inflate the initial server component payload.

The editor intentionally full-bleeds from the normal app shell using a `w-screen` editor container while preserving the authenticated layout and locale-aware route segment.

## Error and Loading States

- API errors normalize to `ApiError`.
- Query retry policy avoids retrying auth and not-found failures.
- `error.tsx`, `loading.tsx`, `EmptyState`, `ErrorState`, and skeletons provide consistent UX.
- Toasts are centralized through Sonner and translation-aware hooks.

## Map Architecture

Map-specific concepts are isolated in `modules/places`, `modules/map`, and `stores/use-planner-store.ts`.

The app currently avoids choosing Google Maps, Mapbox, or OpenStreetMap. Future provider-specific adapters should live behind services/hooks so itinerary UI does not care which map SDK is active.

Recommended future shape:

- `modules/places/services/google-places.service.ts`
- `modules/places/services/mapbox-places.service.ts`
- `modules/places/components/map-view.tsx`
- `modules/itinerary/components/drag-itinerary-board.tsx`

`src/modules/map` exposes map types and an OpenStreetMap-compatible renderer. The current renderer:

- renders OSM tiles from `NEXT_PUBLIC_OSM_TILE_URL`
- projects markers using Web Mercator utilities
- draws an SVG route line from itinerary marker order
- highlights selected and hovered markers
- emits marker selection and viewport changes through typed callbacks

Business logic stays outside map components. The trip editor prepares markers/routes from trip DTOs, and the map only renders provider-ready data. This keeps the future Google Maps or Mapbox adapter focused on rendering, not itinerary rules.

## Drag And Drop

dnd-kit is the standard drag layer for editor planning.

- Day sections use a sortable context for reordering trip days.
- Each day owns a nested sortable context for itinerary items.
- Drag handles use keyboard and pointer sensors.
- Reorder payloads use stable spaced order values (`1024`, `2048`, etc.) so future insertions can happen without rewriting every row.
- Cross-day item moves are supported by the backend reorder API shape and can be enabled in the UI without changing the contract.

## Optimistic Updates

Optimistic mutations live in feature mutation hooks:

- `useReorderTripDaysMutation`
- `useReorderItineraryItemsMutation`
- item create/update/delete mutations
- trip update and note creation mutations

Reorder hooks:

1. cancel the detail query
2. snapshot the previous trip
3. write optimistic days/items
4. roll back on error
5. reconcile with the server response on success

`clientMutationId` is sent with reorder requests so future realtime fanout can ignore a client's own echoed mutation.

## Responsive Layout

Desktop uses two columns:

- left planner: editable details, notes, search, itinerary timeline
- right map: sticky viewport-height panel

Tablet and mobile collapse to a single column with the map below the planner. Fixed controls use stable sizes so drag handles, buttons, counters, and cards do not shift during interaction.

## Future Realtime

Realtime should not replace React Query. Add a collaboration transport later that subscribes to trip mutation events and applies them by invalidating or patching `tripKeys.detail(tripId)`.

Recommended future boundaries:

- `src/modules/collaboration` for websocket/presence client code
- mutation `clientMutationId` for echo suppression
- Redis-backed presence on the backend
- presence UI in the planner header, not inside map provider components

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
