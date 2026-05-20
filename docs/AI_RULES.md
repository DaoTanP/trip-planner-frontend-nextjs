# Frontend AI Rules

These rules are for AI agents and human reviewers using AI-assisted development in this repository.

## Primary Objective

Make small, coherent changes that preserve the architecture. Do not invent new global patterns when a local feature-level change will do.

## Before Editing

- Inspect the existing feature module first.
- Check translation namespaces before adding visible text.
- Check existing UI primitives before creating new components.
- Check services/query/mutation patterns before writing data fetching code.

## Must Follow

- No hardcoded user-facing strings.
- No Axios calls from React components.
- No server state in Zustand.
- No business logic inside route files.
- No broad shared folders for feature-specific code.
- No new provider, state library, form library, or styling system without explicit approval.
- No map SDK coupling inside itinerary UI.
- No Node runtime changes without updating `.nvmrc`, Dockerfiles, package engines, README, and an ADR.
- No API server code, database migrations, queue workers, or server Docker services in this repository.

## Feature Work Checklist

1. Add or update translation keys in every supported locale.
2. Add feature types under `modules/<feature>/types`.
3. Add validation schema factories under `schemas` when forms are involved.
4. Add API calls under `services`.
5. Add query keys/options under `queries`.
6. Add mutations under `mutations`.
7. Build UI under feature `components`.
8. Compose route screens through `pages`.
9. Keep `app/` files thin.
10. Run typecheck and lint.

## i18n Rules

- Use `common` only for app-wide labels, navigation, global actions, and global states.
- Use feature namespaces for feature-specific text.
- Use interpolation for dynamic values.
- Use ICU pluralization for counts.
- Add validation strings to `validation.json`, not to feature files.

## API Rules

- Use `apiGet`, `apiPost`, `apiPatch`, and `apiDelete`.
- Return domain data from services, not raw Axios responses.
- Keep API response contracts typed.
- Normalize errors at the API boundary.
- Use query cancellation signals.
- Keep auth transport in `src/services/api`; do not reimplement token, cookie, CSRF, or refresh handling in components.
- New auth providers must preserve the frontend/backend contract and add i18n keys for loading, success, and failure states.

## UI Rules

- Start from shadcn-style primitives in `components/ui`.
- Use shared components for repeated loading, empty, and error states.
- Use accessible labels and semantic elements.
- Keep responsive behavior explicit with Tailwind utilities.
- Prefer dense, scannable product UI over marketing layouts.

## Map and Collaboration Rules

- Treat map providers as replaceable adapters.
- Keep viewport, filters, selected places, and temporary drag state in client stores.
- Keep persisted trips, stops, and places in TanStack Query.
- Future WebSocket events should invalidate or patch TanStack Query data, not bypass it with duplicated stores.

## Documentation Rules

- Update `docs/ARCHITECTURE.md` when changing architecture.
- Update `docs/CONVENTIONS.md` when adding a repeated coding standard.
- Update `docs/adr/` when changing runtime, Docker, API boundary, auth, or deployment strategy.
- Keep docs practical and short enough to be read during implementation.
