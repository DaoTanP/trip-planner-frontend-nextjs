# ADR 0001: Feature-Based Next.js Frontend Foundation

- Status: Accepted
- Date: 2026-05-18
- Owners: Frontend
- Related: `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/AI_RULES.md`, `src/app`, `src/modules`

## Context

The Trip Planner frontend needs to support rapid iteration by a solo developer or small team while remaining maintainable as the product grows into map-heavy planning, itinerary editing, internationalization, authentication, and future realtime collaboration.

The application also needs to be friendly to AI-assisted development. That means the codebase should expose clear ownership boundaries, avoid hidden conventions, and make it easy to determine where new logic belongs.

The main constraints are:

- use Next.js App Router and TypeScript.
- support locale-based routing and SSR-compatible translations from the beginning.
- keep UI reusable without creating a giant shared component dumping ground.
- keep API logic centralized.
- use TanStack Query for server state and Zustand only for lightweight client state.
- leave room for future maps, offline mode, WebSocket collaboration, and drag-and-drop itinerary building.

## Decision

We will use a feature-based frontend architecture.

Route files in `src/app/[locale]` will act as routing and composition boundaries. Product behavior will live under `src/modules/<feature>`.

Each feature module may contain:

- `components`
- `hooks`
- `services`
- `schemas`
- `types`
- `queries`
- `mutations`
- `pages`

Shared infrastructure will remain intentionally small:

- `src/components/ui` for shadcn-style primitives.
- `src/components/shared` for repeated cross-feature UI patterns.
- `src/services/api` for Axios, auth refresh, typed request helpers, and error normalization.
- `src/providers` for app-level providers.
- `src/stores` for local UI and planner interaction state.
- `src/i18n` for routing, request config, and namespaced messages.

## Consequences

Positive consequences:

- Feature ownership is clear.
- AI agents can find the right code path before editing.
- Route files stay small and easier to reason about.
- Business logic is kept out of UI shells.
- Server state and client interaction state have separate homes.
- Future modules such as collaboration, notifications, offline mode, and map provider adapters can be added without reshaping the whole app.

Negative consequences:

- Some cross-feature reuse may require deliberate extraction later.
- Developers must resist creating generic shared utilities too early.
- Feature folders may contain similar-looking files, but the repetition preserves local clarity.
- Module boundaries require discipline during fast iteration.

## Alternatives Considered

Alternative: Layer-based architecture with global `components`, `hooks`, `services`, and `types` folders.
Reason not chosen: This tends to become a dumping ground as the app grows and makes it harder to understand feature ownership.

Alternative: Domain-driven architecture with deeper domain/application/infrastructure layers.
Reason not chosen: The product is early-stage and this would add ceremony before the team needs it.

Alternative: Redux-centered global architecture.
Reason not chosen: The app mostly needs server-state caching and lightweight UI state. TanStack Query plus Zustand is simpler and more aligned with the current requirements.

Alternative: Put feature pages and logic directly in `app/`.
Reason not chosen: App Router should remain a routing layer. Mixing business logic into route files makes future refactors and AI-assisted edits riskier.

## Tradeoffs

This decision favors practical maintainability over maximum abstraction.

It accepts some duplication inside modules to keep feature behavior local and reviewable. It avoids premature platform layers, but still creates enough structure for maps, auth, i18n, and realtime collaboration to evolve without major rewrites.

The biggest tradeoff is discipline: the architecture stays clean only if contributors keep shared folders small and move reusable patterns intentionally.

## Future Considerations

Revisit this ADR if:

- feature modules begin sharing large amounts of duplicated business logic.
- a backend-for-frontend layer changes API ownership.
- map provider abstractions become complex enough to deserve their own package or adapter layer.
- realtime collaboration introduces cross-module synchronization rules.
- offline mode requires a dedicated persistence strategy.

Potential future ADRs:

- map provider adapter strategy.
- authenticated session storage using httpOnly cookies.
- realtime collaboration event model.
- offline cache and sync architecture.
- locale-aware SEO and translated route pathnames.

## Notes for AI Agents

When adding a feature, start under `src/modules/<feature>` and keep `src/app` files thin. Do not put API calls, business rules, form schemas, or server-state ownership directly inside route files or generic shared folders.
