# Frontend Conventions

These conventions keep the codebase predictable as it grows.

## Architecture

- Place business logic in `src/modules/<feature>`, not in `app/`.
- Keep route files thin: metadata, guards, layout composition, and page component imports.
- Prefer feature-local components over generic shared components.
- Add shared components only when at least two features need the same pattern.
- Keep server state in TanStack Query and local UI state in Zustand.
- Do not add API server code, database migrations, queues, or server Docker services to this repository.

## Imports

- Use the `@/` path alias for app imports.
- Do not import across feature internals unless a feature intentionally exports a shared contract.
- UI primitives can be imported from `@/components/ui`.
- Feature services should use `@/services/api/request`, never Axios directly.

## Internationalization

- Never hardcode user-facing strings in components.
- Use `getTranslations` in Server Components and `useTranslations` in Client Components.
- Keep keys namespaced by feature, e.g. `trip.form.nameLabel`.
- Use ICU messages for interpolation and pluralization.
- Add Vietnamese keys when adding English keys.
- Validation schemas must be factories that receive localized validation functions.

## Components

- UI components should be typed and small.
- Keep business decisions out of presentational components.
- Prefer composition over prop-heavy components.
- Use semantic HTML first.
- Use lucide-react icons for icon buttons and familiar actions.
- Add accessible labels for icon-only controls.
- Avoid inline styles.

## Styling

- Use Tailwind utilities and design tokens from `globals.css`.
- Keep cards for repeated items, forms, modals, and framed tools.
- Avoid nested cards.
- Avoid decorative gradients and single-hue palettes.
- Ensure text fits at mobile and desktop sizes.
- Use skeletons for loading states that affect layout.

## Data Fetching

- Define query keys in `queries/`.
- Define service functions in `services/`.
- Use `queryOptions` so query definitions are reusable.
- Use optimistic updates only when rollback is straightforward.
- Pass `AbortSignal` from queries into API functions.
- Use `src/services/api/endpoints.ts` for API paths.
- Use DTO aliases from `src/services/api/contracts` instead of hand-writing backend request/response types.
- Services return feature-ready data, not raw Axios responses.
- List queries should preserve pagination metadata from `meta.pagination` when the UI may need it later.

## Forms

- Use React Hook Form for form state.
- Use Zod for validation.
- Keep schemas feature-local.
- Render field errors next to fields.
- Disable submit controls while mutations are pending.

## Errors

- Normalize API failures through `normalizeApiError`.
- Do not toast raw API error text unless it is explicitly safe and localized.
- Prefer localized fallback messages.
- Keep page-level errors in route `error.tsx`.
- Map backend error codes to translation keys in `services/errors/error-translation.ts`.

## Auth

- UI components should not read or write tokens directly.
- Auth services own login/register/logout behavior.
- OAuth UI components should only collect provider credentials and call auth mutations.
- Protected route layouts own backend-backed session validation.
- `src/proxy.ts` may perform cookie-presence redirects to reduce flicker, but it must not become the source of truth.
- Do not persist access or refresh tokens in `localStorage`.
- Cookie-backed unsafe API requests must include the CSRF token header through the centralized Axios layer.
- Add new providers under `modules/auth` services, mutations, components, and translations; do not put provider logic inside route files.

## Testing

- Add component tests for reusable shared components and complex feature components.
- Add hook tests for non-trivial query/mutation/state behavior.
- Keep tests close to the behavior they protect.
- Do not create broad snapshot tests for volatile UI.

## Git Hygiene

- Keep changes focused.
- Avoid unrelated refactors while building features.
- Document architectural changes in `docs/ARCHITECTURE.md`.
- Add or update an ADR for runtime, Docker, auth, API boundary, or deployment decisions.
