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
    notes/
    itinerary/
    places/
    profile/
    expenses/
    map/
    sync/
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

- `src/modules/trips` for trip detail, editor shell composition, and trip-level mutations.
- `src/modules/notes` for unified collaborative note services, infinite queries, optimistic mutations, and reusable note panels.
- `src/modules/itinerary` for itinerary item services and optimistic mutations.
- `src/modules/expenses` for expense cursor queries, budget summary queries, mutations, and trip-scoped budget UI.
- `src/modules/places` for place search.
- `src/modules/map` for provider-shaped map rendering and map math.
- `src/modules/sync` for mutation queue state, revision catch-up, entity patchers, and reconciliation utilities.
- `src/stores/use-planner-store.ts` for local UI interaction state.

The editor workflow is inspired by Wanderlog-style trip planning:

- editable planner on the left
- interactive map on the right
- synchronized selection
- flat stop sequence
- stop cards with optional presentation grouping
- direct manipulation interactions

The Phase 4 planner workspace keeps the editor product surface dense and operational rather than form-like:

- trip header, stop filters/search, budget, and threaded notes live in the left planning workspace.
- the map is a persistent right workspace on desktop and remains visible alongside secondary tabs.
- place search and map-click creation resolve backend places before creating stops.
- trip, itinerary-item, expense, and place notes use the unified notes module and the same `/notes` cache shape.
- trip end date, grouping labels, route gaps, idle gaps, and planning warnings are derived from normalized query data in the UI.

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
- `NEXT_PUBLIC_MAP_STYLE_URL`
- `NEXT_PUBLIC_MAP_DEFAULT_LAT`
- `NEXT_PUBLIC_MAP_DEFAULT_LNG`
- `NEXT_PUBLIC_MAP_DEFAULT_ZOOM`
- `NEXT_PUBLIC_OSM_TILE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAP_ID`
- `NEXT_PUBLIC_GOOGLE_MAPS_REGION`
- `NEXT_PUBLIC_GOOGLE_MAPS_LANGUAGE`

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

## Backend Domain Boundaries

`trip-planner-backend-expressjs` is the source of truth for product data and API contracts. Endpoint builders in this repo are relative to the configured `/api/v1` base, and feature modules should stay aligned with the synced contract copy under `src/services/api/contracts`.

The trip editor is stop-first and place-backed:

- `Trip` is the planning aggregate root, but trip detail is metadata and counts, not a nested editor graph. Query itinerary, places, notes, collaborators, expenses, budget, and mutation events through their own resources.
- `ItineraryItem` is a flat trip-scoped stop record. Persist backend fields such as `placeId`, `types[]`, `status`, `timezone`, optional `summary`, optional schedule fields, and backend ordering intent. Do not reintroduce `TripDay`, `Destination`, persisted route segments, or route-cache entities.
- `Place` records are reusable global locations. Provider search results, reverse geocode results, map clicks, and manual place forms are temporary inputs until the place resolution boundary returns a backend `Place`; stop creation uses only the resolved `place.id`.
- `Expense` rows are the spending source of truth. `Budget` is limit/currency configuration plus derived summaries, not a ledger. Notes use the unified `/notes` resource for trip, itinerary item, expense, and place targets.
- Collaborator management actions should remain disabled or read-only unless the backend contract exposes the corresponding invite, role update, accept, or remove endpoints.
- Route geometry, route legs, distance, and duration are frontend-derived from ordered stop coordinates through provider routing. They are never persisted, synchronized, repaired, or written back to the backend.

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
- flat itinerary item cursor pages.
- generic note cursor pages.
- provider route query results derived from ordered stop coordinates.
- collaborators, expenses, and budget summaries.
- future realtime invalidation.
- trip detail: `tripKeys.detail(tripId)`
- trip list: `tripKeys.list()`
- unified notes: `noteKeys.list(filters)`
- place search: `placeKeys.search(params)`
- trip mutation catch-up: `tripKeys.mutationEvents(tripId, revision)`

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

Trip summary DTOs do not include `Destination`, `destinationNames`, routes, or embedded itinerary records. Cards and editor summaries should derive useful stop/place labels from backend counts, flat items, places, expenses, and notes.

Trip revisions are server state. The latest revision comes from trip detail and mutation responses, stays in TanStack Query, and is used as the future reconnect/offline catch-up boundary rather than duplicated into Zustand.

`src/modules/sync` is a runtime adapter over TanStack Query, not a new state store. It owns:

- an in-memory mutation queue with `queued`, `sending`, `acknowledged`, `failed`, `retrying`, and `conflicted` states.
- entity patchers for trip, itinerary item, note, expense, and budget caches.
- revision-gap reconciliation through `GET /trips/:tripId/mutation-events`.
- development-only sync diagnostics.

The sync runtime never stores server entities itself. It applies deterministic patches to existing query caches and leaves long-lived UI state in Zustand.

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

`src/modules/map` owns provider rendering, routing DTOs, provider errors, provider-neutral route requests, and provider math. `src/modules/places` owns provider-backed place search, backend place search fallback, place details, backend reverse geocoding, and mapping those results into backend place resolution payloads. Itinerary and trip editor components consume normalized contracts only.

The active map provider is selected by `NEXT_PUBLIC_MAP_PROVIDER`. MapLibre GL JS is the default rendering engine, Google Maps remains a rendering adapter, and the OSM raster renderer remains available as a lightweight fallback path. Routing is provider-neutral and uses OSRM by default behind `getMapRoute({ points, travelMode })`. Production must set `NEXT_PUBLIC_OSRM_ROUTE_URL`; when it is missing, routing is reported as unavailable. Development defaults to `routing.openstreetmap.de` with car, bike, and foot backends, and logs a warning so the dependency is visible. Provider-specific code lives under:

- `src/modules/map/providers/maplibre` for MapLibre GL JS and `react-map-gl` rendering, markers, viewport sync, and route layers.
- `src/modules/map/providers/google` for Maps JavaScript loading, rendering, markers, and polylines.
- `src/modules/map/providers/osm` for the OSM tile renderer and Web Mercator projection.
- `src/modules/places/services/google-places.service.ts` for Google Places autocomplete and details.
- `src/modules/map/services/routing` for provider-neutral routing, with OSRM as the default adapter.
- `src/modules/map/services/map-route.service.ts` and `src/modules/map/queries/map-route.queries.ts` for the public route boundary and TanStack Query integration.
- `src/modules/map/providers/shared` for provider-independent marker, route, viewport, and bounds contracts.

The trip editor derives map markers and adjacent stop-pair route requests from a dedicated full-itinerary route-data query plus the trip places query, then asks TanStack Query for route geometry through `getMapRoute({ points, travelMode })`. The visible stop list may still be paginated, but map route rendering never uses a partial visible page as a complete route source. If the full route-data query is loading or unavailable, route rendering is hidden and the map shows an explicit route-data notice. The map receives provider-ready props and emits only viewport, context-change, marker select, marker hover, and map-click callbacks. Business logic stays outside map components.

The editor derives markers from flat itinerary items plus the trip places query. It does not read marker coordinates from itinerary item payloads. Route visualization is generated dynamically from ordered marker coordinates through provider-neutral route queries; no route geometry is persisted or synchronized. The editor requests each adjacent stop pair separately, so each provider call has exactly two route points and its own travel mode.

Stop list and map synchronization is ID-based. Stop cards write selected and hovered item IDs to `use-planner-store`; map providers receive only selected/hovered marker IDs and callbacks. Selecting a stop card moves the map viewport toward the item's normalized place, and selecting a marker selects the item and lets the stop list scroll the card into view. Providers do not know about notes, filters, reorder rules, or itinerary mutations.

MapLibre renders normalized map contracts only:

- `MapMarker[]` for marker positions and labels.
- `MapRoutePoint[]` or normalized `MapRoute` points for route line rendering.
- `MapViewport` for center and zoom.
- `MapBounds` for future fit-to-route and clustering workflows.

MapLibre does not own itinerary logic, trip records, place normalization, or route fetching. It only renders vector maps, marker overlays, and route layers.

MapLibre markers are rendered through a GeoJSON source and layers rather than one React marker component per itinerary item. This keeps marker rendering scalable, enables clustering, and leaves hover/selection as lightweight layer interactions mapped back to normalized `MapMarker` IDs.

Marker and route derivation is deterministic from flat itinerary order. The editor sorts by `(sortOrder, id)`, derives markers from normalized places, and renders provider route results when available. When routing is unavailable, the map falls back to ordered stop coordinates and route-gap UI rather than backend writes.

Provider route results normalize to provider-independent route DTOs:

- decoded route points for polyline rendering.
- encoded polyline for rendering/provider diagnostics only, not backend persistence.
- route legs for adjacent stop-pair expansion.
- distance and duration totals for estimation.

Travel mode is persisted as lightweight route intent for a stop pair through the trip route-preferences API: `fromItemId`, `toItemId`, and `travelMode`. The editor derives the existing `leg:${fromItemId}:${toItemId}` route id from ordered stops, overlays persisted preferences on top of the default `driving` mode, then calls the provider-neutral routing boundary once per adjacent stop pair with `{ points: [from, to], travelMode }`. Provider output is expanded back into per-leg geometry, duration, and distance for rendering. Route geometry, duration, distance, polylines, and provider output remain derived and are not persisted.

Place results normalize before reaching UI:

- autocomplete results use provider-safe IDs and labels.
- place details map to backend `ResolvePlaceRequestDto` fields.
- raw Google responses are not exposed to trip, itinerary, or card components.
- adding a provider result first resolves a backend place, then creates the itinerary item.

Map rendering remains client-only. The trip editor dynamically imports the map with `ssr: false`; MapLibre, Google Maps, and other provider SDKs are loaded lazily only when a map route actually renders. Server Components never import map SDKs and do not include provider payloads in the server render.

MapLibre environment configuration:

- `NEXT_PUBLIC_MAP_PROVIDER=maplibre`
- `NEXT_PUBLIC_MAP_STYLE_URL` points to the vector style JSON.
- `NEXT_PUBLIC_MAP_DEFAULT_LAT`, `NEXT_PUBLIC_MAP_DEFAULT_LNG`, and `NEXT_PUBLIC_MAP_DEFAULT_ZOOM` seed the local planner viewport.

The default style is `https://demotiles.maplibre.org/style.json` for local development. Production deployments should replace it with an owned or commercially supported OSM-compatible vector style and attribution policy.

Google Maps Platform setup requires these APIs enabled on the browser API key:

- Maps JavaScript API
- Places API
- Geocoding API
- Directions API

## Drag And Drop

dnd-kit is the standard drag layer for editor planning.

- The stop list uses one sortable context for flat itinerary items.
- Drag handles use keyboard and pointer sensors.
- Reorder mutations are intent based: the UI sends the moved `itemId`, optional `beforeItemId`, optional `afterItemId`, `expectedVersion`, and `clientMutationId`.
- Date, location, time-of-day, and custom grouping are presentation-only and must not change the reorder contract or introduce day IDs.

Large stop lists use a virtualization-compatible render path. Small and medium trips render the full sortable list for best drag behavior; very large loaded lists switch to a windowed item renderer so the DOM does not grow with every cursor page. Stop cards stay isolated so this can move to a dedicated virtualization package later without changing backend contracts.

## Optimistic Updates

Optimistic mutations live in feature mutation hooks:

- `useReorderItineraryItemsMutation`
- item create/update/delete mutations
- trip update mutations
- note create/update/delete mutations in `src/modules/notes`

Reorder hooks:

1. cancel the itinerary query
2. snapshot the previous infinite cursor data
3. write optimistic flat item order across loaded pages
4. roll back on error
5. reconcile only the server-returned moved or affected items on success

`clientMutationId` is sent with replayable mutations so future realtime fanout can ignore a client's own echoed mutation. Item `version`/`expectedVersion` fields are used for stale entity detection, and `expectedRevision` is sent when the mutation depends on the current trip revision. `REVISION_CONFLICT` responses are handled as sync conflicts, not generic form failures. Mutation responses include the latest trip revision; mutation hooks patch `tripKeys.detail(tripId)` rather than refetching the whole editor. The frontend does not send full reordered arrays.

Itinerary, notes, and expenses use `useInfiniteQuery` over cursor APIs when rendering growing editor lists. Note queries are keyed by normalized filters such as `tripId`, `targetEntityType`, `targetEntityId`, and `parentNoteId`, so trip notes, itinerary item notes, expense notes, place notes, and replies reuse the same cache shape. Services preserve `meta.pagination`, query options use `nextCursor`, and mutation hooks patch or invalidate loaded pages without introducing Zustand server caches. This is mobile/offline friendly because the client can hydrate partial resources, preserve scroll stability, and catch up later by revision.

Optimistic mutation hooks enqueue the mutation intent in `src/modules/sync/queue`, apply the local cache patch, send the API request with the same `clientMutationId`, then acknowledge, fail, or mark the queue entry conflicted. The queue is intentionally lightweight and in-memory for now; it defines the lifecycle needed by a future persisted offline queue without replacing TanStack Query.

## Responsive Layout

Desktop uses two columns:

- left planner: compact trip header, stop search/filters, budget, and threaded notes
- right map: sticky viewport-height workspace with route, marker, hover, selection, and fit controls

Tablet and mobile use a planner-first workflow with compact tab controls, a map surface immediately below the controls, and the active Stops/Budget/Notes content below the map. This keeps the map available even when secondary workflows are open. Fixed controls use stable sizes so drag handles, buttons, counters, and cards do not shift during interaction.

## Future Realtime

Realtime should not replace React Query. The current sync runtime already catches up through `GET /trips/:tripId/mutation-events?sinceRevision=...`, applies entity patches, and records mutation queue state. Add a collaboration transport later that feeds the same reconciliation functions instead of writing a second cache path.

Recommended future boundaries:

- `src/modules/collaboration` for websocket/presence client code
- mutation `clientMutationId` for echo suppression
- trip `revision` plus `GET /trips/:tripId/mutation-events` for reconnect catch-up
- `src/modules/sync/reconciliation` for websocket, reconnect, and offline replay patch application
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
