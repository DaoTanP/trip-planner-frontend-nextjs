# ADR 0002: Keep Frontend and API Repositories Separate

- Status: Accepted
- Date: 2026-05-18
- Owners: Frontend
- Related: `README.md`, `docker-compose.yml`, `docs/ARCHITECTURE.md`

## Context

The Trip Planner API is owned by a separate repository. This repository should stay focused on the Next.js frontend so its architecture, dependencies, Docker image, and developer workflow remain clean and easy to reason about.

Keeping API implementation code here would create duplicate ownership, stale infrastructure, and confusing guidance for future contributors and AI agents.

## Decision

We will keep this repository strictly frontend-only.

This repository may define:

- Next.js frontend code.
- frontend Dockerfiles.
- frontend-only Docker Compose service.
- environment variables that point to an external API.
- typed client-side API services.

This repository will not define:

- API server code.
- database schemas or migrations.
- queue workers.
- server package manifests.
- server Docker images.

## Consequences

The frontend can evolve independently while relying on a stable API contract exposed by the separate API repository.

Local frontend development can use Docker without starting API infrastructure from this repo. Developers who need full-stack behavior should run the API repository separately and point `NEXT_PUBLIC_API_URL` at it.

## Alternatives Considered

Alternative: Keep a local API service in this repository for integration testing.
Reason not chosen: The API already has a dedicated repository, and duplicating it here risks drift.

Alternative: Use a monorepo.
Reason not chosen: The project ownership model is currently separate repositories.

## Tradeoffs

This decision improves repository clarity and reduces dependency surface area. The tradeoff is that full-stack local development requires running another repository or using a deployed API endpoint.

## Future Considerations

Revisit this decision only if the team intentionally moves to a monorepo or adds a frontend-specific mock API for tests. A mock API should be clearly marked as testing infrastructure, not product backend ownership.

## Notes for AI Agents

Do not add API server code, database migrations, queue workers, or server Docker services to this repository. Treat `NEXT_PUBLIC_API_URL` as the boundary to the separate API repository.
