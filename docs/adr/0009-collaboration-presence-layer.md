# ADR 0009: Collaboration Presence Layer

- Status: Accepted
- Date: 2026-06-30
- Owners: Frontend
- Related: `src/modules/collaboration`, `src/modules/sync`, `src/modules/trips/components/editor`

## Context

The backend already owns durable optimistic concurrency through trip revisions, entity versions, mutation events, and client mutation IDs. The frontend needs Google Docs-style human awareness without replacing TanStack Query, the sync runtime, or backend conflict detection.

## Decision

Add `src/modules/collaboration` as an ephemeral awareness layer:

- `presence.store.ts` keeps active user, focus, editing, local source, and connection status state in a dedicated Zustand store.
- `presence.websocket.ts` publishes typed presence events over WebSocket when `NEXT_PUBLIC_COLLABORATION_WS_URL` is configured and falls back to `BroadcastChannel` for local-tab presence. It also handles exponential reconnect, event-sequence gap detection, and `connection.ack`.
- `presence.service.ts` owns presence IDs, device IDs, and local payload construction.
- `conflict.store.ts` queues revision conflicts for UI presentation.
- `activity.store.ts` records recent mutation events as an ephemeral activity feed.
- Collaboration UI components render active users, viewing/editing badges, realtime status, activity, follow controls, map marker presence, and the revision conflict dialog.

Durable `trip.updated` socket messages feed `src/modules/sync/realtime` and `src/modules/sync/reconciliation` so websocket updates, polling, reconnect, and offline replay use the same cache patching path. Presence updates never invalidate TanStack Query and are never stored in durable planner state or persisted backend state.

Optional follow mode is local UI state. It can mirror a collaborator's focused stop, route, map, budget, or notes panel into the current user's editor, but it never steals selection unless enabled and never sends commands to other clients.

## Consequences

- Active users, focus, and editing state can update without refetching itinerary, notes, expenses, places, or trip detail.
- Successful durable mutations can patch TanStack Query caches from normalized realtime events without broad invalidation.
- Reconnect and missed-event recovery still use `GET /trips/:tripId/mutation-events` as the durable catch-up boundary.
- Activity feed state is derived from mutation events and does not create a separate activity API or durable frontend cache.
- Backend `REVISION_CONFLICT` responses surface immediately with field-level differences when `latestEntity` is available.
- The planner keeps optimistic concurrency as the durable safety mechanism; editing indicators are advisory and never lock an entity.
- WebSocket availability is optional for local development. Production deployments can enable cross-user fanout by setting `NEXT_PUBLIC_COLLABORATION_WS_URL`.
- Future cursor rendering, comments, voice, and pair-planning features can extend the collaboration module without redesigning planner state.

## Alternatives Considered

Alternative: Put presence in `use-planner-store`.
Reason not chosen: planner store is persisted UI interaction state. Presence is ephemeral and should not survive reloads or pollute selection state.

Alternative: Patch websocket events directly inside trip editor components.
Reason not chosen: durable updates must continue through the sync reconciliation path so polling, reconnect, and future offline replay share one patching implementation.

Alternative: Persist activity feed or follow mode in backend tables.
Reason not chosen: activity is already derivable from `MutationEvent`, and follow mode is local collaborative awareness. Persisting either would create duplicate server state.
