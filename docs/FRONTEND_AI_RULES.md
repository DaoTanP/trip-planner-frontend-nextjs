# Frontend AI Rules

These rules are for AI agents and human reviewers using AI-assisted development in this repository.

## Primary Objective

Make small, coherent changes that preserve the architecture. Do not invent new global patterns when a local feature-level change will do.

AI agents extending the trip editor must preserve:

- scalable architecture
- split planner/map workflow
- optimistic editing UX
- clean frontend/backend contracts
- modular map abstractions
- predictable server-state management
- flat timeline-first itinerary data flow

## Before Editing

- Inspect the existing feature module first.
- Check translation namespaces before adding visible text.
- Check existing UI primitives before creating new components.
- Check services/query/mutation patterns before writing data fetching code.
- Read `docs/FRONTEND_ARCHITECTURE.md` before changing editor data flow, map behavior, drag behavior, optimistic updates, or route synchronization.

## Must Follow

- No hardcoded user-facing strings.
- No Axios calls from React components.
- No server state in Zustand.
- No business logic inside route files.
- No broad shared folders for feature-specific code.
- No new provider, state library, form library, or styling system without explicit approval.
- No map SDK coupling inside itinerary UI.
- No hard `TripDay` hierarchy in new editor state, services, queries, or components.
- No Node runtime changes without updating `.nvmrc`, Dockerfiles, package engines, README, and an ADR.
- No API server code, database migrations, queue workers, or server Docker services in this repository.
- Keep server state in TanStack Query and interaction state in Zustand.
- Keep map provider code isolated in `src/modules/map`.
- Keep itinerary mutation logic isolated in `src/modules/itinerary`.
- Keep itinerary items, places, notes, routes, collaborators, and expenses in granular TanStack Query caches.
- Use dnd-kit for drag interactions.
- Preserve optimistic rollback behavior for reorder, add, edit, and remove flows.
- Update backend contracts before using new API fields in frontend code.
- Sync backend API contracts into `src/services/api/contracts/v1.ts`.
- Update Docker env examples when map or API connectivity settings change.

## AI Agents Must Not

- Put Prisma/backend-shaped assumptions directly into UI components.
- Store trip detail, itinerary items, places, routes, expenses, or notes in Zustand.
- Recreate day-grouped server state in Zustand or component-local caches.
- Fetch provider map data inside itinerary cards.
- Hardcode visible editor copy.
- Add a second drag library.
- Couple the editor to Google Maps, Mapbox, or OpenStreetMap-specific business logic.
- Replace the split planner/map workflow with a marketing or landing-page layout.
- Duplicate backend DTOs inside feature modules.
- Bypass centralized API utilities.
- Create feature-specific global state when local module state is sufficient.

## Feature Work Checklist

1. Add or update translation keys in every supported locale.
2. Add feature types under `modules/<feature>/types`.
3. Add validation schema factories under `schemas` when forms are involved.
4. Add API calls under `services`.
5. Add query keys/options under `queries`.
6. Add mutations under `mutations`.
7. Build UI under feature `components`.
8. Compose route screens through `pages`.
9. Keep `app/` files thin.
10. Run typecheck and lint.
11. Verify optimistic update rollback behavior.
12. Verify query invalidation behavior.
13. Verify responsive planner/map behavior.
14. Verify drag-and-drop accessibility behavior.

## i18n Rules

- Use `common` only for app-wide labels, navigation, global actions, and global states.
- Use feature namespaces for feature-specific text.
- Use interpolation for dynamic values.
- Use ICU pluralization for counts.
- Add validation strings to `validation.json`, not to feature files.
- Add editor UI strings under `trip.editor.*`.
- Localize loading, empty, optimistic, and rollback states.
- Keep backend error-code mapping localized in frontend translation namespaces.

Examples:

- trip.editor.itinerary.add
- trip.editor.place.search
- trip.editor.route.optimize

## API Rules

- Use `apiGet`, `apiPost`, `apiPatch`, and `apiDelete`.
- Return domain data from services, not raw Axios responses.
- Keep API response contracts typed.
- Normalize errors at the API boundary.
- Use query cancellation signals.
- Keep auth transport in `src/services/api`; do not reimplement token, cookie, CSRF, or refresh handling in components.
- New auth providers must preserve the frontend/backend contract and add i18n keys for loading, success, and failure states.
- Import backend DTO aliases from `src/services/api/contracts`; do not duplicate DTO interfaces inside feature modules.
- Add new endpoints to `src/services/api/endpoints.ts` before using them in feature services.
- Localize error UX from stable backend error codes, not backend message text.
- Sync backend API contracts into `src/services/api/contracts/v1.ts` before using new fields.
- Prefer optimistic updates with rollback-safe mutations for itinerary interactions.
- Invalidate or patch TanStack Query data after successful mutations.

## UI Rules

- Start from shadcn-style primitives in `components/ui`.
- Use shared components for repeated loading, empty, and error states.
- Use accessible labels and semantic elements.
- Keep responsive behavior explicit with Tailwind utilities.
- Prefer dense, scannable product UI over marketing layouts.
- Preserve split planner/map UX patterns.
- Keep trip editing flows fast and interaction-focused.
- Prefer modular editor sections over giant editor screens.
- Use Framer Motion subtly for interaction feedback, not decorative animations.

## Map and Collaboration Rules

- Treat map providers as replaceable adapters.
- Keep MapLibre rendering isolated under `src/modules/map/providers/maplibre`.
- Keep Google Maps, Mapbox, OSM, and HERE SDK access inside provider modules.
- Keep viewport, filters, selected places, and temporary drag state in client stores.
- Keep persisted trips, stops, and places in TanStack Query.
- Keep place autocomplete, place details, geocoding, reverse geocoding, route, and distance/duration requests in service/query layers.
- Future WebSocket events should invalidate or patch TanStack Query data, not bypass it with duplicated stores.
- Future WebSocket events should patch the smallest granular cache: itinerary, notes, places, routes, collaborators, expenses, or trip metadata.
- Keep provider-specific logic isolated inside `src/modules/map/providers`.
- Do not couple itinerary rendering to specific map providers.
- Synchronize marker selection and itinerary selection through shared interaction state only.
- Normalize provider DTOs before they cross into trip or itinerary UI.
- Render MapLibre markers and route layers from normalized `MapMarker`, `MapRoute`, and `MapViewport` contracts only.
- Do not store MapLibre map instances, sources, layers, or style objects in Zustand.
- Preserve client-only map loading through dynamic imports and provider script loaders.
- Prepare architecture for future collaborative editing without implementing realtime prematurely.

## Drag-and-Drop Rules

- Use dnd-kit exclusively.
- Keep drag state lightweight and temporary.
- Persist ordering through backend mutations.
- Preserve optimistic rollback behavior.
- Avoid full-list rerenders during drag interactions.
- Reorder flat itinerary items with spaced `sortOrder` values and `clientMutationId`.
- Keep grouping by date, location, section, morning/evening, or custom label presentation-only.

## State Management Rules

Use TanStack Query for:

- trips
- trip details
- itinerary items
- places
- routes
- notes
- collaborators
- expenses
- persisted planner state
- authenticated user state

Use Zustand ONLY for:

- selected itinerary item
- selected map marker
- viewport state
- filters
- temporary UI interaction state
- drag interaction state

Do NOT:

- duplicate server state in Zustand
- use Zustand as a backend cache
- bypass TanStack Query for persisted entities

## Documentation Rules

- Update `docs/FRONTEND_ARCHITECTURE.md` when changing architecture.
- Update `docs/FRONTEND_CONVENTIONS.md` when adding a repeated coding standard.
- Update `docs/adr/` when changing runtime, Docker, API boundary, auth, or deployment strategy.
- Keep docs practical and short enough to be read during implementation.
- Update trip editor architecture documentation when changing:
  - map synchronization
  - drag-and-drop architecture
  - optimistic update flow
  - itinerary ordering strategy
  - route synchronization
  - API contract strategy

## Performance Rules

- Prefer optimistic updates for itinerary interactions.
- Avoid unnecessary rerenders in planner and map layouts.
- Lazy load heavy map integrations where appropriate.
- Keep route screens thin.
- Memoize expensive derived itinerary calculations when necessary.
- Prepare architecture for large itineraries and many markers.

## Architecture Preservation Rules

Preserve:

- modular frontend architecture
- feature-based organization
- centralized API layer
- SSR-safe patterns
- App Router compatibility
- scalable map abstractions
- scalable auth architecture
- typed API boundaries

Do NOT:

- introduce tightly coupled editor logic
- bypass feature module boundaries
- introduce hidden global state
- mix backend concerns into presentation components
- introduce provider lock-in
