# Frontend Conventions

These conventions keep the codebase predictable as it grows.

## Architecture

- Place business logic in `src/modules/<feature>`, not in `app/`.
- Keep route files thin: metadata, guards, layout composition, and page component imports.
- Prefer feature-local components over generic shared components.
- Add shared components only when at least two features need the same pattern.
- Keep server state in TanStack Query and local UI state in Zustand.
- Do not add API server code, database migrations, queues, or server Docker services to this repository.
- Trip detail and editor composition belong in `src/modules/trips`.
- Itinerary item services and mutations belong in `src/modules/itinerary`.
- Place search belongs in `src/modules/places`.
- Map rendering and provider math belong in `src/modules/map`.
- UI-only trip editor state belongs in `src/stores/use-planner-store.ts`.
- Itinerary items are a flat trip-scoped sequence. Do not model day ownership in frontend state or service contracts.
- Date/day/location/custom grouping is presentation-only and must be computed from flat items.

Do not place itinerary reorder logic inside map components. Do not place map projection logic inside itinerary cards.

## Imports

- Use the `@/` path alias for app imports.
- Do not import across feature internals unless a feature intentionally exports a shared contract.
- UI primitives can be imported from `@/components/ui`.
- Feature services should use `@/services/api/request`, never Axios directly.

## Internationalization

- Never hardcode user-facing strings in components.
- Use `getTranslations` in Server Components and `useTranslations` in Client Components.
- Keep keys namespaced by feature, e.g. `trip.form.nameLabel`.
- Use ICU messages for interpolation and pluralization.
- Add Vietnamese keys when adding English keys.
- Validation schemas must be factories that receive localized validation functions.
- Editor strings use `trip.editor.*`.
- Place search strings use `trip.editor.placeSearch.*`.
- Map labels use `trip.editor.map.*`.
- Avoid hardcoded visible text in editor components.

## Components

- UI components should be typed and small.
- Keep business decisions out of presentational components.
- Prefer composition over prop-heavy components.
- Use semantic HTML first.
- Use lucide-react icons for icon buttons and familiar actions.
- Add accessible labels for icon-only controls.
- Avoid inline styles.

## Styling

- Use Tailwind utilities and design tokens from `globals.css`.
- Keep cards for repeated items, forms, modals, and framed tools.
- Avoid nested cards.
- Avoid decorative gradients and single-hue palettes.
- Ensure text fits at mobile and desktop sizes.
- Use skeletons for loading states that affect layout.
- Keep editor controls compact and task-focused.
- Use icon buttons for map controls, drag handles, delete, and add actions where possible.
- Keep cards at `rounded-md`.
- Do not nest decorative cards inside cards.
- Use stable button and handle sizes to avoid drag/layout jumps.

## Data Fetching

- Define query keys in `queries/`.
- Define service functions in `services/`.
- Use `queryOptions` so query definitions are reusable.
- Use optimistic updates only when rollback is straightforward.
- Pass `AbortSignal` from queries into API functions.
- Use `src/services/api/endpoints.ts` for API paths.
- Use DTO aliases from `src/services/api/contracts` instead of hand-writing backend request/response types.
- Services return feature-ready data, not raw Axios responses.
- List queries should preserve pagination metadata from `meta.pagination` when the UI may need it later.
- Use TanStack Query for server records and optimistic cache writes.
- Query keys must come from module query files.
- Mutations that affect trip detail should patch or invalidate `tripKeys.detail(tripId)`.
- Mutations that affect itinerary items should patch `itineraryKeys.items(tripId)` and only invalidate related place/route/trip summary queries when needed.

## Query And State

- Use Zustand only for selected item, selected marker, hover state, viewport, panel state, and draft-only interaction state.
- Do not duplicate server records inside Zustand.
- Keep optimistic cache updates centralized inside mutation hooks.
- Use query invalidation or targeted cache patching after successful itinerary mutations.
- Do not store itinerary items, places, notes, route segments, collaborators, or expenses in Zustand.

## Forms

- Use React Hook Form for form state.
- Use Zod for validation.
- Keep schemas feature-local.
- Render field errors next to fields.
- Disable submit controls while mutations are pending.

## Errors

- Normalize API failures through `normalizeApiError`.
- Do not toast raw API error text unless it is explicitly safe and localized.
- Prefer localized fallback messages.
- Keep page-level errors in route `error.tsx`.
- Map backend error codes to translation keys in `services/errors/error-translation.ts`.

## Auth

- UI components should not read or write tokens directly.
- Auth services own login/register/logout behavior.
- OAuth UI components should only collect provider credentials and call auth mutations.
- Protected route layouts own backend-backed session validation.
- `src/proxy.ts` may perform cookie-presence redirects to reduce flicker, but it must not become the source of truth.
- Do not persist access or refresh tokens in `localStorage`.
- Cookie-backed unsafe API requests must include the CSRF token header through the centralized Axios layer.
- Add new providers under `modules/auth` services, mutations, components, and translations; do not put provider logic inside route files.

## Drag And Drop

- Use dnd-kit sensors and sortable contexts.
- Keep drag handles explicit and keyboard accessible.
- Use stable order values with `orderStride`.
- Send full server reorder payloads from the final optimistic order.
- Roll back optimistic cache updates on mutation error.
- Reorder flat itinerary item sequences by `sortOrder`; do not send `dayId` in new reorder payloads.

## Map

- Map providers receive `MapMarker[]`, route points, viewport, selected marker id, and callbacks.
- Provider components must not fetch trip data.
- Provider components must not mutate itinerary data directly.
- New providers should implement the same data contract before adding provider-specific options.
- Provider SDK imports and script loaders must stay inside `src/modules/map/providers/<provider>`.
- Route geometry, encoded polylines, distance, and duration must normalize to `MapRoute` before reaching editor UI.
- Marker hover and selection sync through `use-planner-store`; fetched route/place data stays in TanStack Query.
- Markers are derived from itinerary item IDs plus normalized trip places. Itinerary item payloads must not duplicate place coordinates.
- Cached route geometry comes from trip route segment queries; provider routing remains a fallback.
- Place autocomplete, details, geocoding, and reverse geocoding belong in `src/modules/places`, not itinerary cards.
- UI components must not expose raw Google Maps, Mapbox, OSM, or HERE response shapes.
- MapLibre components must stay under `src/modules/map/providers/maplibre`.
- MapLibre route layers render normalized route points or decoded polylines only.
- MapLibre viewport updates must flow through `MapViewport` and planner-store setters, not raw map instances.
- Raw MapLibre refs may be held locally inside provider components/hooks but must not be stored globally.

## Responsive UI

- Keep editor controls compact and task-focused.
- Use icon buttons for map controls, drag handles, delete, and add actions where possible.
- Keep cards at `rounded-md`.
- Do not nest decorative cards inside cards.
- Use stable button and handle sizes to avoid drag/layout jumps.

## Environment

Map provider variables belong in `.env.example`, `.env.docker`, and Docker compose:

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

Never put private map provider secrets in `NEXT_PUBLIC_*` variables.

Google Maps browser keys must be restricted by HTTP referrer in Google Cloud. Enable Maps JavaScript API, Places API, Geocoding API, and Directions API for Google provider support.

Use `NEXT_PUBLIC_MAP_PROVIDER=maplibre` for the MapLibre renderer. The default `NEXT_PUBLIC_MAP_STYLE_URL` is for local development; production should use a stable vector tile/style provider with correct attribution.

## Testing

- Add component tests for reusable shared components and complex feature components.
- Add hook tests for non-trivial query/mutation/state behavior.
- Keep tests close to the behavior they protect.
- Do not create broad snapshot tests for volatile UI.

## Git Hygiene

- Keep changes focused.
- Avoid unrelated refactors while building features.
- Document architectural changes in `docs/ARCHITECTURE.md`.
- Add or update an ADR for runtime, Docker, auth, API boundary, or deployment decisions.
