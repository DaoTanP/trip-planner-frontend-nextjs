# ADR 0008: Planner Workspace UX

- Status: Accepted
- Date: 2026-05-29
- Owners: Frontend
- Related: `src/modules/trips/components/editor`, `src/modules/map`, `src/modules/notes`, `src/stores/use-planner-store.ts`

## Context

The trip editor is no longer a CRUD-style form. It needs to support dense timeline planning, map-aware routing, optimistic collaboration, selected-item notes, large itineraries, and future realtime/offline workflows without changing the flat backend model.

## Decision

Use a planner workspace layout:

- left workspace for compact trip metadata, filters, timeline, insights, and threaded notes.
- right workspace for provider-isolated map rendering, clustered markers, route lines, hover, selection, and fit controls.
- floating overlays for quick add, command palette, mobile map access, and place search.

Timeline grouping, derived date ranges, route gaps, idle gaps, and planning warnings are computed in the frontend from normalized TanStack Query data. Zustand stores only interaction state such as selected item, hover, viewport, filters, grouping mode, and panel state.

## Consequences

- The UI can feel like a collaborative planning surface without adding nested backend DTOs.
- The same normalized notes module can render trip notes and selected itinerary-item notes.
- Map providers stay business-logic free and communicate through normalized marker/route props plus callbacks.
- Mobile can use a planner-first workflow with bottom-sheet map access.

## Alternatives Considered

Alternative: restore form sections for trip dates, places, and itinerary fields.
Reason not chosen: it conflicts with timeline-first planning and makes map/realtime/offline flows feel secondary.

Alternative: add a backend planner summary DTO.
Reason not chosen: current insights and grouping are presentation logic and can be derived from existing granular resources.
