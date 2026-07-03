# ADR 0010: Planning Insights Panel

- Status: Accepted
- Date: 2026-07-02
- Owners: Frontend
- Related: `src/modules/trips/components/editor/planning-insights-panel.tsx`, `src/modules/trips/queries`, backend ADR 0011

## Context

The trip editor needs planning assistance: warnings, route optimization previews, schedule suggestions, budget insights, map grouping, recommendations, and collaboration summaries. The frontend already owns map rendering, editor selection state, optimistic mutations, realtime cache reconciliation, and offline queue state.

Planning logic should not be duplicated in the browser.

## Decision

Add an Insights tab to the trip editor that consumes `GET /trips/:tripId/insights` as derived backend data.

The panel renders structured DTOs and localized labels from stable codes. It may preview a recommended order and navigate to referenced stops, but it does not apply recommendations automatically. Any future "apply" action must use existing mutation hooks with `clientMutationId`, expected versions/revisions, and sync queue handling.

## Consequences

- The frontend remains a presentation layer for planning intelligence.
- Route optimization, scoring, budget projections, and warning generation stay backend-owned.
- Realtime and offline compatibility remain intact because durable changes still flow through normal mutations.
- Future AI-assisted planning can extend backend intelligence providers without changing editor state ownership.
