# ADR 0006: Unified Collaborative Notes Module

- Status: Accepted
- Date: 2026-05-28
- Owners: Frontend
- Related: `src/modules/notes`, `src/services/api/contracts/v1.ts`, `docs/FRONTEND_ARCHITECTURE.md`

## Context

Notes are now a reusable collaborative resource. They can attach to trips, itinerary items, expenses, places, route segments, and future collaboration surfaces. Keeping note services inside `modules/trips` would make trip notes the implicit default and encourage new entity-specific note APIs.

The frontend also needs cursor pagination, threaded replies, optimistic updates, revision patching, and future websocket/offline reconciliation without storing notes in Zustand.

## Decision

Create `src/modules/notes` as the owner of note types, services, query keys, infinite query options, optimistic mutations, hooks, and reusable panels.

Notes use the unified `/notes` API and cache under `noteKeys.list(filters)`, where filters include `tripId`, `targetEntityType`, `targetEntityId`, and optional `parentNoteId`. Root notes and replies use the same paginated page shape.

Trip editor composition may render `NotePanel`, but note server state and mutations stay in `modules/notes`.

## Consequences

- Trip, itinerary, expense, place, and future route note panels share one implementation.
- Optimistic create/update/delete mutations patch loaded note pages instead of invalidating trip detail.
- Trip `revision` is patched into `tripKeys.detail(tripId)` from note mutation responses.
- Future realtime events can patch matching note query pages by target filters.
- Zustand remains UI-only and does not store notes.

## Alternatives Considered

Alternative: Keep trip notes in `modules/trips`.
Reason not chosen: It would make note ownership trip-specific and duplicate logic when itinerary item, expense, and place notes are added.

Alternative: Add separate modules for each note target.
Reason not chosen: The backend exposes one normalized note contract, so separate frontend ownership would fragment cache keys and optimistic updates.
