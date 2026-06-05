# Backend-Driven Frontend Redesign Plan

Date: 2026-06-04

This plan treats `trip-planner-backend-expressjs` as the source of truth. The current frontend has useful planner, map, note, sync, and auth scaffolding, but it still contains stale DTO assumptions from older route-first or timeline-first models. The redesign should align the frontend directly with the current stop-first backend domain.

## Sources Reviewed

Backend:

- `../trip-planner-backend-expressjs/prisma/schema.prisma`
- `../trip-planner-backend-expressjs/src/api/contracts/v1.ts`
- `../trip-planner-backend-expressjs/src/api/v1.router.ts`
- `../trip-planner-backend-expressjs/docs/ARCHITECTURE.md`
- `../trip-planner-backend-expressjs/docs/DOMAIN_RULES.md`
- `../trip-planner-backend-expressjs/docs/adr/*.md`
- Backend service, schema, route, repository, and controller files for auth, users, trips, itinerary, places, notes, budget, expenses, sync, and notifications.
- Focused backend integration tests for places reverse geocoding, places resolve, and itinerary create insertion.

Frontend:

- `src/services/api/contracts/v1.ts`
- `src/services/api/endpoints.ts`
- `src/modules/trips`
- `src/modules/itinerary`
- `src/modules/map`
- `src/modules/notes`
- `src/modules/sync`
- `src/stores/use-planner-store.ts`
- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/FRONTEND_CONVENTIONS.md`
- `docs/FRONTEND_AI_RULES.md`

Verification:

- `npm run typecheck` currently fails because frontend code still references fields and DTOs removed from the synced backend contract.
- The command also hit `TS5033` writing `tsconfig.tsbuildinfo`; the important behavioral signal is the TypeScript contract drift errors listed below.

## Backend Findings

### Aggregate Roots And Entities

`Trip` is the aggregate root for planning data. It owns:

- `ItineraryItem[]`
- `Expense[]`
- `Budget?`
- `Note[]`
- `TripCollaborator[]`
- `Notification[]`
- `ClientMutation[]`
- `MutationEvent[]`

Primary entities:

- `Trip`: trip metadata, lifecycle, visibility, ownership, version, revision.
- `ItineraryItem`: stop-first itinerary record. Every stop belongs to one trip and one place.
- `Place`: reusable global location record with normalized provider data and coordinates.
- `Expense`: financial source of truth.
- `Note`: threaded collaborative note targeting a trip, itinerary item, expense, or place.

Supporting entities:

- `Budget`: trip budget configuration only.
- `ExpenseCategory`: trip-scoped expense classification.
- `TripCollaborator`: access role for a user or invited email.
- `Notification`: user-facing notification code plus params.
- `ClientMutation`: idempotency and future offline/realtime dedupe.
- `MutationEvent`: durable revision log for sync catch-up.

Derived data:

- Route geometry, route legs, route distance, route duration.
- Date groupings from `ItineraryItem.startsAt`.
- Budget spent, remaining, and usage percentage.
- Planner insights, warnings, gaps, and summary labels.

Removed or inactive concepts:

- `TripDay`
- day hierarchy
- `Destination`
- persisted routes
- `RouteSegment`
- route cache entities
- route chain synchronization or repair
- comment-specific APIs
- `CollaborationEntity`

## Domain Model Findings

### Trip

Lifecycle:

- Status values: `DRAFT`, `PLANNED`, `ACTIVE`, `COMPLETED`, `ARCHIVED`.
- Visibility values: `PRIVATE`, `SHARED`, `PUBLIC`.
- Date fields are date-only strings in the API.

Ownership:

- A trip has one owner.
- Owners and editors can mutate planning data.
- Viewers can read shared trip data.
- Only the owner can delete the trip.
- Admins can access through backend role checks.

Frontend implications:

- Trip detail is metadata plus counts, not a nested editor graph.
- Do not expect destinations, days, route counts, or embedded itinerary records from `GET /trips/:tripId`.
- Use separate queries for itinerary, places, notes, collaborators, expenses, budget, and mutation events.

### ItineraryItem

Backend shape:

- Required: `tripId`, `placeId`, `types[]`, `sortOrder`, `status`, `timezone`.
- Optional: `summary`, `startsAt`, `durationMinutes`, `metadata`.
- Concurrency: `version`, optional `expectedVersion`, optional `expectedRevision`.
- Soft delete: `deletedAt`.

Ordering:

- Ordering is controlled only by sparse integer `sortOrder`.
- New items append by `65536` stride when no relative position or explicit sort order is supplied.
- Create requests support relative insertion with optional `beforeItemId` and `afterItemId`.
- Reorder requests are intent based: `itemId`, optional `beforeItemId`, optional `afterItemId`.
- When relative insertion is used on create, backend computes the sparse `sortOrder`; frontend should not calculate it.
- Create rejects missing neighbor IDs and reversed before/after windows with a conflict response.
- Reorder rejects a missing/moved item outside the trip, missing neighbors, stale `expectedVersion`, and self-reference validation cases; frontend should still send coherent before/after windows.
- Reordering must never create, update, repair, or synchronize route data.

Frontend implications:

- The frontend must stop using `title`, `description`, `type`, `startTime`, `endTime`, `isAllDay`, `isFlexibleTime`, `cost`, `currency`, and `routeSegmentId` as itinerary fields.
- UI labels should derive from the related `Place` and `ItineraryItem.summary`.
- A stop requires a backend `Place`.
- Text-only flexible ideas are not currently supported as itinerary items unless the backend changes. They can be represented as trip-scoped notes, but not persisted as stops without `placeId`.
- Date grouping is UI-only from `startsAt`.

### Place

Backend shape:

- Provider values: `MANUAL`, `GOOGLE`, `MAPBOX`, `OSM`, `INTERNAL`.
- Coordinates live on `Place.latitude` and `Place.longitude`.
- Places are reusable global records.
- Reverse geocoding returns transient provider-normalized location data, not a persisted `Place`.
- Place resolution returns a persisted `Place` plus `created: boolean`.

#### Reverse Geocoding

- API contract: `GET /places/reverse-geocode?lat=<number>&lng=<number>`.
- Request validation: `lat` must be `-90..90`; `lng` must be `-180..180`.
- Response: `{ place: { name, formattedAddress, countryCode, latitude, longitude, timezone, provider, providerPlaceId, providerPayload } }`.
- Current provider behavior: `PLACES_PROVIDER=internal` or `osm` uses the OSM/Nominatim reverse provider. `google` and `mapbox` are not wired for reverse geocoding yet and return provider-not-configured errors.
- Provider errors: provider `404` or Nominatim error payload becomes `NOT_FOUND`; other failed or invalid provider responses become `INTERNAL_SERVER_ERROR`.
- Rate limiting: there is no place-specific limiter; reverse geocoding is covered by the global API rate limiter configured by `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`, with tests skipped in `NODE_ENV=test`.

#### Place Search Strategy

- Place search should not rely primarily on the backend database.
- The frontend search experience should be provider-driven rather than database-driven.
- Provider-based place search should support Google Places API, Mapbox Geocoding API, Nominatim/OSM, and future providers behind a replaceable frontend provider boundary.
- Third-party search results are temporary UI objects and must not be treated as backend `Place` records.

Search providers:

- Google Places API
- Mapbox Geocoding API
- Nominatim / OSM
- Future providers

Preferred search flow:

```text
User Search
Third-Party Search Provider
Search Results
User Selects Place
Resolve/Create Place
placeId
Create Itinerary Item
```

Backend database search:

- `GET /places/search` should be treated as internal database search, not as the primary place discovery mechanism.
- Use backend database search for recent places, previously resolved places, trip-related places, and fallback search.
- Do not design the main place discovery UX around only backend persisted places.

#### Place Resolution

- API contract: `POST /places/resolve`.
- Request requires `provider` and `name`; it accepts nullable `providerPlaceId`, `externalId`, address fields, coordinates, contact fields, categories, provider/source payloads, and metadata.
- Response: `{ place: PlaceDto, created: boolean }`.
- Matching strategy first uses `(provider, providerPlaceId)` when available.
- If no provider ID exists, fallback matching checks case-insensitive name plus exact normalized coordinates and optional country code; then case-insensitive formatted address/address plus optional country code.
- Duplicate prevention uses the database unique constraint on `(provider, providerPlaceId)` plus transactional lookup/create and duplicate-key fallback.
- Resolution may return an existing place or create a new one, and it guarantees the frontend receives a usable `place.id` when successful.
- Regardless of whether input originated from Google, Mapbox, OSM, reverse geocoding, or a manual place form, selected locations must pass through `resolvePlace(input): Promise<Place>`.
- The frontend must never create itinerary items directly from third-party search results.
- The frontend should only create itinerary items from backend `Place` records.

#### Place Ownership

- Backend `Place` records remain the source of truth for `placeId`, itinerary references, notes, expenses, collaboration, and synchronization.
- Provider payloads and search result objects remain temporary discovery inputs until place resolution returns a backend `Place`.

Frontend implications:

- Maps must derive marker coordinates through `ItineraryItem.placeId -> Place`.
- Adding a third-party search result, backend database search result, reverse geocode result, or manual place form must go through a frontend place resolution layer before stop creation.
- Do not store trip-specific state on `Place`.
- The rest of the frontend should depend on `placeId`, not on provider payloads or raw map-click data.

Important UX implication:

- Although the persistence model is stop-first, the primary planning workflow is place-first:

```text
Discover Location
Resolve/Create Place
Create Itinerary Item
Refresh Itinerary
Recompute Route
```

- The preferred stop creation flow should begin from place discovery, not from creating an empty itinerary item.

### Expense And Budget

Expense:

- Source of truth for spending.
- May link to `categoryId`, `itineraryItemId`, and `paidByUserId`.
- Uses `version`, `lastClientMutationId`, `deletedAt`, and trip revision events.

Budget:

- Configuration only: `currency`, `totalLimit`, `metadata`, `version`.
- Does not store spent, remaining, or usage.

Frontend implications:

- Budget UI must not behave like a ledger.
- Expenses should be listed and mutated as the financial records.
- Budget summary should use `GET /trips/:tripId/budget` or the `summary` returned by `GET /trips/:tripId/expenses`.
- Expense category records are returned, but the current backend does not expose category create/update/delete endpoints.

### Note

Backend shape:

- Targets: `TRIP`, `ITINERARY_ITEM`, `EXPENSE`, `PLACE`.
- `parentNoteId` supports replies and nested threads.
- `mentions`, `attachments`, and `metadata` are JSON extension fields.
- Place-targeted notes require a trip scope because places are reusable.

Frontend implications:

- Keep the unified note module.
- Expose threaded replies where useful.
- For place notes, always include `tripId`.
- Do not add trip-specific, item-specific, or expense-specific note APIs.

### Collaboration

Backend currently exposes:

- `GET /trips/:tripId/collaborators`

Backend does not currently expose invite, role update, accept, or remove collaborator endpoints in the reviewed API contract.

Frontend implications:

- A collaborators panel can display sharing state now.
- Invite and role management need backend endpoints before production UI actions are enabled.

### Auth

Backend architecture:

- JWT access tokens.
- Refresh token rotation.
- Hashed refresh token persistence.
- Token family reuse detection.
- Google OAuth verified only by backend.
- Cookie-first browser sessions with optional body token transport.
- CSRF protection for unsafe cookie-backed requests.

Frontend implications:

- Backend session is source of truth.
- Use `/auth/me` or `/users/me` for session/profile.
- Do not persist access or refresh tokens in `localStorage`.
- Cookie-backed requests must send credentials and `X-CSRF-Token` from the readable CSRF cookie.
- In-memory bearer token support is acceptable only for body-token or transitional transport.

## API Contract Findings

The active API prefix is `/api/v1` in backend deployment config. Frontend endpoint builders are relative to that base.

Core resources:

| Resource      | Read endpoints                                                                                                          | Write endpoints                                                                                                                                | Frontend cache                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Session       | `GET /auth/me`, `GET /users/me`                                                                                         | login/register/oauth/refresh/logout, `PATCH /users/me`                                                                                         | `auth/session`, profile                                  |
| Trips         | `GET /trips`, `GET /trips/:tripId`                                                                                      | `POST /trips`, `PATCH /trips/:tripId`, `DELETE /trips/:tripId`                                                                                 | trip list and trip detail                                |
| Itinerary     | `GET /trips/:tripId/itinerary`                                                                                          | `POST /trips/:tripId/itinerary`, `PATCH /itinerary-items/:itemId`, `DELETE /itinerary-items/:itemId`, `PATCH /trips/:tripId/itinerary/reorder` | infinite itinerary pages                                 |
| Places        | `GET /places`, `GET /places/search`, `GET /places/reverse-geocode`, `GET /places/:placeId`, `GET /trips/:tripId/places` | `POST /places`, `POST /places/resolve`                                                                                                         | place search, reverse geocode, place detail, trip places |
| Notes         | `GET /notes`                                                                                                            | `POST /notes`, `PATCH /notes/:noteId`, `DELETE /notes/:noteId`                                                                                 | filtered infinite note pages                             |
| Collaborators | `GET /trips/:tripId/collaborators`                                                                                      | none in current contract                                                                                                                       | collaborator list                                        |
| Expenses      | `GET /trips/:tripId/expenses`                                                                                           | `POST /trips/:tripId/expenses`, `PATCH /expenses/:expenseId`, `DELETE /expenses/:expenseId`                                                    | trip expense page                                        |
| Budget        | `GET /trips/:tripId/budget`                                                                                             | `PUT /trips/:tripId/budget`                                                                                                                    | budget summary                                           |
| Sync          | `GET /trips/:tripId/mutation-events`                                                                                    | none                                                                                                                                           | mutation event catch-up                                  |

Pagination:

- Trip lists use page pagination.
- Itinerary, notes, and expenses use cursor pagination.
- Itinerary cursors are based on `(sortOrder, id)`.
- Notes and expenses use `(createdAt, id)`.
- Mutation events page by revision.

Concurrency and idempotency:

- Trip-scoped mutations may include `expectedRevision`.
- Row mutations may include `expectedVersion`.
- Replayable mutations may include `clientMutationId` and `deviceId`.
- Mutation responses return `revision` and may echo `clientMutationId`.
- `REVISION_CONFLICT` returns `currentRevision`, `latestTripRevision`, and optional entity details.

Sync:

- Every trip-affecting write increments `Trip.revision`.
- Every trip-affecting write appends `MutationEvent` in the same transaction.
- Event payloads are normalized patches, not full snapshots.
- Current emitted entity types are `TRIP`, `ITINERARY_ITEM`, `NOTE`, `EXPENSE`, and `BUDGET`.
- Current operations are `ENTITY_CREATED`, `ENTITY_UPDATED`, `ENTITY_MOVED`, `ENTITY_DELETED`, and `ENTITY_REBALANCED`.
- Payloads include `patchType`, `entityType`, `entityId`, and either `fields` or `tombstone`.
- Frontend should patch granular caches from events and refetch only when a patch cannot be applied.
- Place resolution and place creation are not currently trip-affecting writes and do not append trip mutation events.

Places:

- `GET /places/reverse-geocode` accepts query `{ lat, lng }` and returns `{ place: ReverseGeocodePlaceDto }`.
- `POST /places/resolve` accepts provider-normalized place input and returns `{ place: PlaceDto, created: boolean }`.
- `GET /places/search` searches persisted backend places and should be used for recent, previously resolved, trip-related, or fallback results.
- Reverse geocode results are not persisted until the frontend resolves or creates a place.
- The stop workflow should call the frontend `resolvePlace(input)` abstraction and should not couple planner components directly to `POST /places` or `POST /places/resolve`.
- Third-party provider search is frontend discovery infrastructure and should output temporary UI results until resolution returns a backend `Place`.

Itinerary insertion:

- `POST /trips/:tripId/itinerary` accepts optional `beforeItemId` and `afterItemId`.
- `PATCH /trips/:tripId/itinerary/reorder` accepts optional `beforeItemId` and `afterItemId`.
- When either relative neighbor is supplied on create, backend computes `sortOrder` and ignores frontend sort-order math for placement.
- Create conflicts on invalid neighbors or reversed neighbor windows.
- Reorder conflicts on missing moved items, missing neighbors, stale expected versions, and items outside the trip; its schema also rejects self-references.

## Outdated Frontend Assumptions To Remove

Typecheck currently confirms these as real errors after contract sync:

| Outdated assumption                                                    | Current frontend locations                                                                                                 | Required change                                                                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `RouteSegmentDto` exists                                               | `src/modules/map/services/map-route.service.ts`, `src/modules/trips/types/trip.types.ts`, planner utilities, sync patchers | Remove backend route segment types, queries, endpoints, and sync patching. Replace with derived route-leg UI data and provider route requests. |
| `/trips/:tripId/routes` exists                                         | `src/services/api/endpoints.ts`, `src/modules/map/queries/map-route.queries.ts`                                            | Delete `apiEndpoints.trips.routes` and `tripRouteSegmentsQueryOptions`.                                                                        |
| `ItineraryItem.routeSegmentId` exists                                  | trip editor utils, timeline, item card                                                                                     | Remove. Compute route legs from adjacent ordered stops.                                                                                        |
| `ItineraryItem.title` and `description` exist                          | `itinerary-timeline.tsx`, item card, planner filters, creation flows                                                       | Use `Place.name` and `ItineraryItem.summary`.                                                                                                  |
| `ItineraryItem.type` exists                                            | item card, filters, inline add                                                                                             | Use `types[]`, usually first type for compact display.                                                                                         |
| Legacy item types `PLACE`, `TRANSPORT`, `NOTE`, `TASK`, `CUSTOM` exist | `planner-workspace.utils.ts`, translations, inline add                                                                     | Replace with backend enum: `ACTIVITY`, `LODGING`, `FOOD`, `SHOPPING`, `TRANSPORTATION`, `OTHER`.                                               |
| `startTime`, `endTime`, `isAllDay`, `isFlexibleTime` exist             | item card, stats                                                                                                           | Use `startsAt`, `durationMinutes`, and optional metadata only where explicitly stored.                                                         |
| `cost` and `currency` exist on itinerary items                         | item card                                                                                                                  | Move money display to `Expense` rows linked by `itineraryItemId`.                                                                              |
| `CreateTripRequestDto.description` exists                              | create trip form and optimistic create                                                                                     | Remove from trip create. If needed, create a trip note or put structured data in allowed `preferences` only when the backend meaning is clear. |
| `TripSummaryDto.routeSegmentCount` exists                              | trip card, optimistic create                                                                                               | Remove. Derived route leg count is max(0, ordered stops with coordinates - 1), not backend state.                                              |
| Stop creation should call place endpoints directly                     | map click, place search, manual place flows                                                                                | Route all stop creation through `resolvePlace(input): Promise<Place>`, then create itinerary item with `placeId`.                              |
| Frontend should calculate `sortOrder` for inserted stops               | drag/drop and inline add flows                                                                                             | Use `beforeItemId` and `afterItemId` on create/reorder; only send explicit `sortOrder` for exceptional legacy paths.                           |
| Route segment sync events exist                                        | `src/modules/sync/types/sync.types.ts`, patchers                                                                           | Remove `ROUTE_SEGMENT` from active frontend sync handling.                                                                                     |
| Route cache architecture exists                                        | frontend docs                                                                                                              | Update docs to say route geometry is derived dynamically from ordered stops and provider routing.                                              |

## New Frontend Information Architecture

### Top-Level Navigation

Keep the current app shell simple:

- Trips
- Profile

Do not add navigation for backend entities that are trip-scoped implementation details.

### Trip List

`/trips` should show backend `TripSummaryDto`:

- title
- date range
- status
- visibility
- collaborator count
- stop count
- note count
- expense count
- updated time

Remove:

- route segment count
- destination names
- trip description

### Trip Editor

`/trips/:tripId/edit` should compose granular resources:

- `GET /trips/:tripId`
- `GET /trips/:tripId/itinerary`
- `GET /trips/:tripId/places`
- `GET /notes?tripId=...&targetEntityType=TRIP&targetEntityId=...`
- `GET /trips/:tripId/collaborators`
- `GET /trips/:tripId/expenses`
- `GET /trips/:tripId/budget`
- `GET /trips/:tripId/mutation-events`

Suggested workspace:

The trip editor should use a two-column layout where the itinerary workspace and map are always visible side by side.

```text
LEFT WORKSPACE                                      RIGHT MAP
Trip Header (Draft, Private)
Jun 10 2026 - Jun 15 2026      collaborators
5 Stops                        budget summary

Tabs: Stops | Budget | Notes

Active Tab Content                              Map, markers, route
```

#### Left Column

The left column contains the trip header and planner tabs.

##### Trip Header

Displays high-level trip information:

- Title
- Date range
- Status
- Visibility
- Stop count
- Budget summary
- Collaborator summary
- Sync/revision state when relevant

The header is part of the planner workspace and should not span the full page width.

##### Planner Tabs

The planner workspace uses tabs to avoid competing vertical panels.

Supported tabs:

- Stops
- Budget
- Notes

Future tabs may be added without changing the layout architecture.

##### Tab Responsibilities

###### Stops Tab (Primary)

The Stops tab is the default tab and represents the core planning workflow.

Contains:

- Place search
- Map-created stops
- Sortable itinerary list
- Itinerary filters
- Selected stop details

The Stops tab is expected to receive the majority of user interaction time.

###### Budget Tab (Secondary)

Contains:

- Budget summary
- Budget configuration
- Expense list
- Expense creation and editing
- Expense category display

Budget functionality is trip-scoped and should not compete with itinerary planning for permanent screen space.

###### Notes Tab (Secondary)

Contains:

- Trip notes
- Selected entity notes
- Threaded replies
- Mentions
- Attachment metadata

Notes are contextual planning aids rather than primary planning entities.

#### Right Column

##### Map Panel

The map remains permanently visible and is considered a first-class planning surface.

The map should never be replaced by budget, notes, or other secondary workflows.

Responsibilities:

- Marker rendering
- Ordered stop visualization
- Route rendering
- Stop selection
- Map-based stop creation
- Viewport management
- Route gap warnings

#### Collaborators

Collaborators should not occupy a permanent panel.

Current backend capabilities only support viewing collaborators.

The collaborator summary should be displayed in the trip header.

Detailed collaborator information may be shown through:

- Modal
- Drawer
- Popover

without introducing a dedicated workspace tab.

#### Planner Workspace Principles

##### Primary Planning Surfaces

Map and Stops are the primary planning surfaces.

Both must remain easily accessible throughout the planning workflow.

##### Place-First Planning

Users may create stops from:

- Provider place search
- Backend database place search for recent, previously resolved, trip-related, or fallback results
- Map interactions
- Resolved places
- Manual place forms

All stop creation flows must go through a frontend place resolution layer:

```typescript
resolvePlace(input): Promise<Place>
```

Supported inputs:

- Third-party provider search result
- Backend database place result
- Reverse geocode result
- Manual place form

All downstream planner code should depend only on `placeId` after resolution.

Canonical stop creation flow:

```text
Discover Location
Resolve/Create Place
Create Itinerary Item
Refresh Itinerary
Recompute Route
```

##### Map And Stop Synchronization

Selecting a stop:

- Highlights the corresponding marker
- Focuses the map when appropriate
- Exposes selected-stop metadata to detail surfaces

Selecting a marker:

- Selects the corresponding stop
- Reveals the stop in the itinerary list

##### Selected Stop Context

Selected-stop state is frontend UI context, not a backend entity.

The selected-stop context should expose:

- selected itinerary item ID
- selected place ID
- marker highlight state
- map focus target
- notes count for the selected stop
- expense count for the selected stop
- stop metadata derived from `ItineraryItem`, `Place`, linked notes, and linked expenses

This context may be rendered in:

- stop details panel
- drawer
- header badges

without adding backend tables, endpoint-specific DTOs, or persisted selection state.

##### Route Behavior

Route visualization is always derived from:

```text
Ordered Itinerary Items
+
Associated Place Coordinates
```

Route data is never persisted.

Reordering stops immediately recomputes route visualization.

Frontend route rendering must call a provider-independent boundary:

```typescript
getMapRoute(points);
```

Planner components must not depend directly on OSRM, Google Directions, or Mapbox Directions. Routing providers are replaceable infrastructure behind this boundary.

##### Secondary Workflows

Budget and Notes are supporting workflows.

They should remain available without competing with:

- Stop planning
- Route planning
- Map interaction

The tab-based layout is the preferred compromise between accessibility and workspace simplicity.

## Itinerary UX Plan

Backend model: stop-first, not day-first or route-first.

Important frontend interpretation:

- Days are presentation-only.
- Current domain truth:

```text
Trip
  ItineraryItem[]
```

Not:

```text
Trip
  Day[]
  Stop[]
```

Required UI behavior:

- Render a flat ordered stop sequence sorted by `(sortOrder, id)`.
- Day grouping is disabled by default.
- Users may optionally enable day grouping.
- Day grouping is purely a frontend presentation mode derived from startsAt.
- Day grouping must never affect persistence, ordering, API payloads, cache keys, or synchronization.
- Never persist day groups or day IDs.
- Never model day as a domain entity in frontend state, cache keys, sync events, or API contracts.
- Reorder by sending only `itemId`, neighbor IDs, `expectedVersion`, `expectedRevision`, and `clientMutationId`.
- Creation supports neighbor-based insertion with `beforeItemId` and `afterItemId`.
- Frontend should prefer relative insertion and must not calculate `sortOrder` when neighbor intent is available.
- Create-time reversed before/after windows and missing neighbor IDs should be treated as conflict states and handled by rolling back optimistic UI.
- Reorder flows should send coherent before/after windows and treat reorder conflicts as a signal to refetch itinerary ordering.
- Create stops only after a valid backend `Place` exists.
- Display primary title as `Place.name`.
- Display optional planning text from `ItineraryItem.summary`.
- Display type chips from `types[]`.
- Display schedule from `startsAt` plus `durationMinutes`.
- Display stop expenses by filtering `Expense.itineraryItemId`.
- Treat `metadata` as low-queryability extension data, not as a replacement schema.

Creation flows:

- Third-party provider search result: resolve or create a backend place, then create an itinerary item with `placeId`.
- Backend database place result: confirm the backend place, then create an itinerary item with `placeId`.
- Manual place form: resolve or create a backend place, then create an itinerary item with `placeId`.
- Map click: reverse geocode, let the user confirm or edit the result, resolve or create a backend place, then create an itinerary item with `placeId`.
- All stop creation code must call `resolvePlace(input): Promise<Place>` before creating an itinerary item.
- Relative insertion should pass `beforeItemId`, `afterItemId`, or neither for append.

Canonical map-click flow:

```text
Map Click
Reverse Geocode
Confirm Location
Resolve/Create Place
Create Itinerary Item
```

- Trip note or idea: create `Note` targeting `TRIP` unless backend adds an idea/draft-stop model.

### Stop Card Design

The itinerary should use a stop-card layout rather than a table or day-based timeline.

Card structure:

- Stop order badge
- Place icon
- Place name
- Type chip
- Summary content
- Schedule metadata
- Duration metadata
- Status indicator
- Notes count
- Expense count

The card title must always be derived from Place.name.

The card body should primarily display ItineraryItem.summary.

The card should not expose raw database fields.

## Map Redesign Plan

Maps are a primary planning tool, but route persistence is not a backend feature.

Required behavior:

- Markers come from ordered itinerary items joined to places.
- Marker labels use stop order and place name.
- Selecting a stop focuses the marker.
- Selecting a marker selects the stop and scrolls the timeline.
- Route visualization is generated dynamically from the ordered marker coordinates.
- Missing coordinates should produce route-gap UI warnings, not backend writes.

Provider boundary:

- Keep provider-independent contracts: `MapMarker`, `MapRoutePoint`, `MapRoute`, `MapViewport`.
- Keep MapLibre/OSM/Google rendering adapters.
- Replace route segment cache queries with provider route queries based on ordered stops.
- Route rendering depends on `getMapRoute(points)`.
- Keep OSRM, Mapbox Directions, Google Directions, or any future provider behind `getMapRoute(points)`.
- Planner components must not import provider-specific routing clients directly.

Derived route model:

- The frontend should treat route legs as a first-class derived view model:

```typescript
type DerivedRouteLeg = {
  id: string;

  fromItemId: string;
  toItemId: string;

  fromPlaceId: string;
  toPlaceId: string;

  distanceMeters?: number;
  durationSeconds?: number;

  geometry?: GeoJSON.LineString;
};
```

- This object exists only in frontend state and derived computations.

Naming:

- Do not use `RouteSegment` for derived UI route legs.
- Derived route legs must never be persisted or synchronized with backend APIs.
- Derived route legs are an internal visualization model and should not become a primary user-facing entity.

Route Recompute Triggers

The route should be recomputed whenever:

- itinerary item created
- itinerary item deleted
- itinerary item reordered
- place changed
- place coordinates changed

Route recomputation must never write data back to backend persistence.

### Map-Based Stop Creation

Users should be able to create itinerary stops directly from the map.

Flow:

1. User clicks an empty location on the map.
2. Frontend performs reverse geocoding.
3. Popup displays:
   - place name
   - address
   - coordinates
4. Popup actions:
   - Add To Itinerary
5. Frontend resolves or creates a backend Place through `resolvePlace(input)`.
6. Frontend may create the itinerary item by:
   - append to end
   - insert before an existing stop
   - insert after an existing stop
     using `beforeItemId` and `afterItemId` when relative insertion is needed.
7. Frontend immediately creates an ItineraryItem using the returned `placeId`.
8. Query caches update.
9. Route visualization is recomputed from ordered itinerary stops.

Frontend never calculates `sortOrder` for this flow when relative insertion APIs are available.

## Budget And Expense Plan

Backend source of truth:

- `Expense` rows are spending truth.
- `Budget` is limit/currency configuration.

Frontend workflow:

- Add a trip-scoped Expenses/Budget panel.
- Query `GET /trips/:tripId/expenses` for expenses, categories, budget, and summary.
- Query `GET /trips/:tripId/budget` when only the budget summary is needed.
- Expense list filters supported by the backend are `categoryId`, `itineraryItemId`, and `paidByUserId`.
- Expense list summary includes `budget`, `currency`, `budgetLimit`, `spentAmount`, `remainingAmount`, and `usagePercentage`.
- Budget summary endpoint returns the same derived summary shape without expense rows.
- Add mutations for expense create/update/delete.
- Add mutation for budget upsert.
- Calculate display totals from backend summary or loaded expense rows.
- Show linked stop/place context by joining expense `itineraryItemId` to itinerary items and places.

Recommended UX:

- Both views should exist:
  - Trip Expense View
  - Stop Expense View
- Because expenses can optionally belong to a stop:

```text
Trip
  Expense
    optional ItineraryItem
```

- This enables stop-centric planning experiences such as:

```text
Tokyo Skytree
  Notes
  Expenses
  Future Attachments
```

Do not:

- Store ledger totals in Zustand.
- Persist calculated budget aggregates.
- Treat Budget as a transaction table.

Known backend gap:

- Category records are returned but category management endpoints are not currently exposed.

## Notes Plan

Keep and strengthen the existing unified note module.

Required behavior:

- Use `/notes` for all note targets.
- Key notes by normalized filters: `tripId`, `targetEntityType`, `targetEntityId`, optional `parentNoteId`.
- A note list request must include either `tripId` or a complete `targetEntityType` plus `targetEntityId` filter.
- Backend defaults `parentNoteId` to `null` when omitted, so top-level notes and replies are separate paginated queries.
- Show replies with `parentNoteId`.
- Reply creation must use the same trip, target entity type, and target entity ID as the parent note.
- Include `tripId` for place-targeted notes.
- Mutations should include `expectedVersion`, `expectedRevision` when available, and `clientMutationId`.
- Patch note query caches from mutation events.

Supported backend capabilities to expose:

- Threaded replies.
- Mentions JSON field.
- Attachments JSON field.
- Author display.
- Moderator delete by owner/admin.

Known backend gap:

- Attachment storage/upload APIs are not exposed in the reviewed route contract.
- Mention resolution/search APIs are not exposed in the reviewed route contract; mentions are JSON payloads only.

## Auth Plan

Keep the backend-backed auth architecture:

- Protected App Router layout validates with `/auth/me`.
- Browser API client uses `withCredentials`.
- Unsafe cookie-backed requests include `X-CSRF-Token`.
- Login/register/OAuth rely on backend verification and cookie setting.
- Session/profile live in TanStack Query.

Do not:

- Store refresh tokens in localStorage.
- Trust Google profile data locally.
- Treat Zustand as auth server state.

## State Management Plan

TanStack Query owns:

- trip list
- trip detail
- itinerary pages
- trip places
- notes
- collaborators
- expenses
- budget
- mutation events
- session/profile
- backend place search/details
- provider place search results, short-lived only
- reverse geocode results, short-lived only
- place resolution mutations

Zustand owns only:

- selected trip ID
- selected stop ID
- selected place ID
- hovered stop ID
- selected stop context projection
- selected derived route-leg ID, if kept
- hovered derived route-leg ID, if kept
- filters
- viewport
- panel open/closed state

Remove from Zustand:

- backend route segment state
- any server entity cache
- trip revision
- itinerary item arrays
- place arrays
- notes
- expenses

New query:

- providerPlaceSearchQuery(query, provider)
  - third-party provider search through Google Places, Mapbox Geocoding, Nominatim/OSM, or future provider adapters
  - returns temporary UI search results, not backend `Place` records
- reverseGeocodeQuery(lat, lng)
  - GET /places/reverse-geocode
- Cache policy:
  - short-lived
  - no persistence
  - no sync integration

New mutation/service boundary:

- `resolvePlace(input): Promise<Place>`
  - Accepts search result, reverse geocode result, or manual place form.
  - Internally chooses the current backend place create/resolve API.
  - Returns a persisted `Place` and hides provider payload details from planner components.
  - Stop creation consumes only the returned `place.id`.

## Component Migration Plan

### 1. Contracts And Endpoints

- Remove `RouteSegmentDto` aliases and imports.
- Remove `apiEndpoints.trips.routes`.
- Remove `tripRouteSegmentsQueryOptions`.
- Add endpoint builders and service functions for `places.reverseGeocode` and `places.resolve`.
- Keep `places.search` as backend database search for recent, previously resolved, trip-related, or fallback places.
- Add frontend provider-search adapters for Google Places, Mapbox Geocoding, Nominatim/OSM, and future providers.
- Add `apiEndpoints.trips.budget`.
- Add expense and budget mutation services.

### 2. Itinerary Types And Utilities

- Keep `ItineraryItem = ItineraryItemDto`.
- Replace all `item.type` usage with `item.types[0]` or explicit multi-type chips.
- Replace `item.title` and `item.description` with `place.name` and `item.summary`.
- Replace `startTime` and `endTime` helpers with `startsAt` plus computed end time from `durationMinutes`.
- Replace route segment helpers with ordered stop route helpers.
- Replace legacy item type arrays with backend enum values.

### 3. Trip Create/List

- Remove trip description field from create form or map it to a post-create trip note if product wants overview notes.
- Remove `routeSegmentCount` from trip cards and optimistic trip creation.
- Show backend counts only.

### 4. Stop Creation

- Remove title-only stop creation.
- Introduce `resolvePlace(input): Promise<Place>` as the only place persistence boundary used by stop creation.
- Make provider place search, backend database place search, reverse geocode, and manual place forms feed `resolvePlace(input)`.
- Never create itinerary items directly from temporary provider search results.
- Send `placeId`, `types`, optional `summary`, optional `startsAt`, optional `durationMinutes`, optional `status`, optional `metadata`, optional `timezone`, `beforeItemId`, `afterItemId`, `clientMutationId`, `deviceId`, and `expectedRevision`.
- Prefer `beforeItemId` and `afterItemId` for relative insertion; do not calculate `sortOrder` when neighbor intent is available.
- Handle insertion conflicts by rolling back optimistic placement and refetching itinerary ordering when needed.

### 5. Stop Card

- Rename card language from "item title" to stop/place/summary language.
- Use `Place.name`, `formattedAddress`, backend `summary`, `types[]`, `status`, schedule, duration, and notes.
- Remove direct cost display from item card unless derived from linked expenses.

### 6. Map

- Render markers from stops plus places.
- Build route request from ordered marker coordinates through `getMapRoute(points)`.
- Render dynamic route result.
- Keep routing providers behind `getMapRoute(points)`.
- Wire map-click creation through reverse geocode, `resolvePlace(input)`, and itinerary create.
- Use derived route-leg selection only in UI state if needed.

### 7. Expenses And Budget

- Create `src/modules/expenses` or split `budget` and `expenses` modules.
- Add query/mutation hooks for expense CRUD and budget upsert.
- Patch expense and budget caches from mutation responses/events.
- Surface budget summary in the editor header and dedicated panel.

### 8. Sync

- Remove active `ROUTE_SEGMENT` sync type handling.
- Add/verify `BUDGET` patch handling.
- Ensure expense patching also updates derived summary or invalidates expense/budget queries when needed.
- Ensure all revision-returning mutations patch `tripKeys.detail(tripId).revision`.
- Sync handling should be entity-type driven rather than hardcoded to the currently exposed entity list.
- Frontend patching should use an entity registry pattern for currently emitted types: `TRIP`, `ITINERARY_ITEM`, `NOTE`, `EXPENSE`, `BUDGET`.
- Unknown entity types, including future `PLACE` or `COLLABORATOR` events, should invalidate affected trip resources instead of failing.
- The sync engine should remain extensible for future entity types without requiring architectural changes.

### 9. Docs And Translations

- Update frontend architecture docs to remove route cache language.
- Update translation keys for backend item enum values.
- Remove copy that promises unsupported flexible items, route persistence, destination summaries, or budget ledger behavior.

## Route Migration Plan

Frontend route files can stay:

- `/[locale]/trips`
- `/[locale]/trips/[tripId]/edit`
- `/[locale]/profile`
- `/[locale]/login`

API route builder changes:

- Keep: `trips.itinerary`, `trips.reorderItinerary`, `trips.places`, `trips.collaborators`, `trips.expenses`, `trips.mutationEvents`.
- Add: `trips.budget`.
- Add: `places.reverseGeocode`, `places.resolve`.
- Remove: `trips.routes`.

No frontend route should imply backend entities that do not exist, such as trip days, destinations, route segments, or ledgers.

## Technical Risks

- Stop creation UX must change because the backend requires `placeId`.
- Existing editor components currently fail typecheck against the synced contract.
- Dynamic provider routing needs graceful fallback when Google is not configured and OSRM/Mapbox are not yet implemented.
- Expense category management lacks backend write endpoints.
- Collaborator management lacks backend write endpoints.
- Notes support attachments/mentions structurally, but attachment upload and mention resolution are not specified.
- `npm run typecheck` attempted to write `tsconfig.tsbuildinfo` and hit `EPERM`; verify local file permissions or run with a clean build info target when checking the final migration.
- Reverse geocoding is currently wired only for OSM when `PLACES_PROVIDER` is `internal` or `osm`; `google` and `mapbox` reverse geocoding are provider-not-configured until adapters are added.
- Provider-driven place search requires frontend provider configuration, API keys where applicable, quota handling, and provider-specific attribution/usage-policy handling.
- Reverse geocoding uses the global API rate limiter and the external provider may also apply quota, latency, or usage-policy limits.
- Frontend should handle loading and failure states during map-click stop creation.
- Place resolution can return an existing place or a newly created place; optimistic UI should not assume `created: true`.
- Temporary provider search results must not leak into itinerary, notes, expenses, sync, or persisted frontend state as if they were backend `Place` records.
- Create-time invalid `beforeItemId`/`afterItemId` windows return conflicts; reorder conflicts should trigger optimistic rollback or itinerary refetch.

## Breaking Changes

- Remove route segment API assumptions.
- Remove route segment UI/cache/sync concepts or rename to frontend-only derived route legs.
- Remove legacy itinerary fields: `title`, `description`, `type`, `startTime`, `endTime`, `isAllDay`, `isFlexibleTime`, `cost`, `currency`, `routeSegmentId`.
- Remove unsupported itinerary enum values: `PLACE`, `TRANSPORT`, `NOTE`, `TASK`, `CUSTOM`.
- Remove trip `description` create/update assumptions.
- Remove trip `routeSegmentCount` display.
- Replace text-only stop creation with place-backed stop creation.

## Recommended Implementation Order

1. Make frontend contracts authoritative: no local DTO extensions for backend fields.
2. Remove route segment endpoint/query/type/sync references.
3. Add frontend provider-search adapters and treat backend `places.search` as internal database fallback.
4. Add place reverse-geocode and resolve services, then wrap all search/reverse/manual inputs with `resolvePlace(input)`.
5. Update itinerary utility functions to backend stop fields.
6. Update translations and item enum UI to backend `ItineraryItemType` values.
7. Redesign stop creation around `resolvePlace(input)` plus neighbor-based itinerary creation.
8. Update stop card and timeline to use place, summary, startsAt, duration, status, types, notes count, and expense count.
9. Introduce selected-stop context for marker highlight, map focus, stop metadata, notes count, and expense count.
10. Rework map route rendering from ordered stop coordinates through `getMapRoute(points)`.
11. Add budget endpoint builder, budget service, and upsert mutation.
12. Add expense CRUD services, mutations, and editor panel.
13. Update sync patchers for active backend entity types, including budget.
14. Update docs to remove route cache and legacy item language.
15. Run `npm run typecheck`, `npm run lint`, and focused tests for itinerary mutations, route derivation, note filters, budget summary, provider place search, place resolution, reverse geocoding, and sync patching.
