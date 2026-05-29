# ADR 0007: Frontend Sync Runtime Foundation

- Status: Accepted
- Date: 2026-05-29

## Context

The editor needs optimistic mutations, revision catch-up, conflict handling, and future websocket/offline compatibility without moving server state out of TanStack Query or adding another state library.

## Decision

Add `src/modules/sync` as a runtime adapter around TanStack Query:

- `queue/` tracks local mutation lifecycle states.
- `patchers/` applies deterministic entity patches to granular query caches and infinite pages.
- `reconciliation/` applies mutation events and revision-gap catch-up.
- `services/` calls the backend mutation-events API.
- `hooks/` runs editor delta sync and exposes development diagnostics.

Feature mutation hooks keep owning optimistic UI patches, but replayable mutations enqueue lifecycle metadata and send durable `clientMutationId` plus `expectedRevision` where appropriate.

## Consequences

- Server entities remain in TanStack Query; Zustand remains UI-only.
- Websocket transport can later feed the same reconciliation functions.
- Offline persistence can later replace the in-memory queue without changing feature query boundaries.
- Cache updates stay granular for large itineraries, notes, routes, expenses, and collaborators.
