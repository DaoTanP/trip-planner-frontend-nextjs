# ADR 0005: Revision-Aware Infinite Editor Foundations

## Status

Accepted

## Context

The trip editor needs to support large flat itineraries, generic notes, future collaboration, future offline/mobile sync, and map rendering without loading or rerendering a giant trip tree.

## Decision

Use cursor-backed `useInfiniteQuery` for itinerary items and notes. Keep loaded page objects in TanStack Query so pagination metadata remains available for scroll loading, optimistic rollback, and future mobile sync.

Keep trip `revision` in `tripKeys.detail(tripId)` and patch it from mutation responses. Add a mutation-event query boundary for future reconnect/offline catch-up, but do not implement websocket transport or offline persistence yet.

Render small/medium itinerary lists normally for best dnd-kit behavior. For very large loaded lists, use a virtualization-compatible windowed renderer while preserving the same flat neighbor-based reorder payloads.

## Consequences

- The editor can hydrate itinerary and note data gradually.
- Optimistic mutations patch loaded pages instead of invalidating the whole trip.
- Future realtime/offline code can catch up from a known revision without duplicating server state into Zustand.
- Map rendering continues to derive markers and routes from normalized flat data.
