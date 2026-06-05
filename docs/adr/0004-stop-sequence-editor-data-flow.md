# ADR 0004: Stop-Sequence Editor Data Flow

## Status

Accepted

## Context

The trip editor is evolving from day-grouped itinerary editing toward a flat stop sequence synchronized with a map. The frontend needs smooth drag/drop, optimistic updates, granular invalidation, route rendering, budget/expense workflows, notes, and future realtime/offline support.

## Decision

TanStack Query owns separate caches for trip metadata, itinerary items, trip places, notes, collaborators, expenses, budget summaries, and provider route query results. Zustand owns only selected item/place/marker, derived route-leg selection, hover state, viewport, filters, and temporary panel/interaction state.

Itinerary rendering uses a flat sortable stop sequence ordered by `sortOrder`. Date, location, section, morning/evening, or custom groupings may be displayed later, but they must be computed from flat item data and must not become frontend server state.

## Consequences

- Optimistic reorder patches `itineraryKeys.items(tripId)`.
- Map markers are derived from itinerary item IDs plus normalized place records.
- Route visualization is derived dynamically from ordered stop coordinates and provider routing.
- Realtime events can patch small caches instead of replacing a monolithic trip detail response.
