# ADR 0008: Planner Workspace UX

- Status: Accepted
- Date: 2026-05-29
- Owners: Frontend
- Related: `src/modules/trips/components/editor`, `src/modules/map`, `src/modules/notes`, `src/stores/use-planner-store.ts`

## Context

The trip editor is no longer a CRUD-style form. It needs to support dense stop planning, map-aware routing, optimistic collaboration, selected-stop notes, expenses, large itineraries, and future realtime/offline workflows without changing the flat backend model.

## Decision

Use a planner workspace layout:

- left workspace for compact trip metadata, stop search/filters, budget, and threaded notes.
- right workspace for provider-isolated map rendering, clustered markers, route lines, hover, selection, and fit controls.
- place search and map-click creation as place-first stop creation flows.

Presentation grouping, derived date ranges, route gaps, idle gaps, and planning warnings are computed in the frontend from normalized TanStack Query data when exposed. Zustand stores only interaction state such as selected item, selected place, derived route-leg selection, hover, viewport, filters, and panel state.

## Consequences

- The UI can feel like a collaborative planning surface without adding nested backend DTOs.
- The same normalized notes module can render trip, itinerary-item, expense, and place notes.
- Map providers stay business-logic free and communicate through normalized marker/route props plus callbacks.
- Mobile can use a planner-first workflow with bottom-sheet map access.

## Alternatives Considered

Alternative: restore form sections for trip dates, places, and itinerary fields.
Reason not chosen: it conflicts with stop-first planning and makes map/realtime/offline flows feel secondary.

Alternative: add a backend planner summary DTO.
Reason not chosen: warnings and grouping are presentation logic and can be derived from existing granular resources.
