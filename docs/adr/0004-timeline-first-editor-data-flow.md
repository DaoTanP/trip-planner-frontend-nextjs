# ADR 0004: Timeline-First Editor Data Flow

## Status

Accepted

## Context

The trip editor is evolving from day-grouped itinerary editing toward a flat timeline synchronized with a map. The frontend needs smooth drag/drop, optimistic updates, granular invalidation, route rendering, and future realtime/offline support.

## Decision

TanStack Query owns separate caches for trip metadata, itinerary items, trip places, route segments, notes, collaborators, and expenses. Zustand owns only selected item/marker, hover state, viewport, and temporary panel/interaction state.

Itinerary rendering uses a flat sortable sequence ordered by `sortOrder`. Date, location, section, morning/evening, or custom groupings may be displayed later, but they must be computed from flat item data and must not become frontend server state.

## Consequences

- Optimistic reorder patches `itineraryKeys.items(tripId)`.
- Map markers are derived from itinerary item IDs plus normalized place records.
- Route segment queries can render cached polylines before provider routing is needed.
- Realtime events can patch small caches instead of replacing a monolithic trip detail response.
