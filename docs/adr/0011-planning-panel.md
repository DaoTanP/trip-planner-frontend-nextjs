# ADR 0011: Planning Engine Panel

## Status

Accepted

## Context

The planner now has a deterministic backend Planning Engine that exposes chronology, travel, constraints, validation issues, metrics, and suggestions as derived read models. The frontend needs to present those results without duplicating business logic.

## Decision

Add `src/modules/trips/components/editor/planning-panel.tsx` and wire it into the trip editor as the Planning tab.

The panel consumes `GET /trips/:tripId/planning` through TanStack Query. It renders localized labels from stable backend codes and may focus affected stops to preview suggestions. It does not compute planning rules and does not apply suggestions.

Realtime `planning.invalidated` events invalidate planning query keys only, preserving the existing realtime patching and offline sync architecture.

## Consequences

- Planning UI stays backend-driven and explainable.
- Future AI-assisted workflows can consume the same backend read model.
- Applying suggestions remains an explicit future mutation flow with optimistic concurrency.
