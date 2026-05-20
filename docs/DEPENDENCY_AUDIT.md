# Dependency Audit

This document records the current dependency strategy for the frontend repository. It should be updated whenever runtime, framework, build, test, or lint dependencies move in a meaningful way.

## Runtime Strategy

The project standardizes on Node.js `24.15.0`.

This version is declared in:

- `.nvmrc`
- `package.json` engines
- `Dockerfile`
- `Dockerfile.dev`
- README and CI recommendations

Node 24 is used because it is the current frontend runtime target for this repository, gives the project a modern platform for Next.js and Vite-based tooling, and avoids carrying compatibility workarounds for older Node releases.

Use `npm ci` in Docker, CI, and production builds. Use `npm install` only when intentionally changing dependencies and refreshing `package-lock.json`.

## Upgraded Packages

The current upgrade focuses on tooling that benefits most from the Node 24 runtime.

| Package                | Target     | Reason                                                                                      |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `vite`                 | `^8.0.13`  | Aligns the Vitest toolchain with the modern Vite ecosystem and Node 24 runtime.             |
| `vitest`               | `^4.1.6`   | Current stable test runner line with better Vite integration and modern TypeScript support. |
| `@vitejs/plugin-react` | `^6.0.2`   | Keeps React test transforms aligned with Vite 8.                                            |
| `jsdom`                | `^29.1.1`  | Modern DOM runtime for component and hook tests.                                            |
| `@types/node`          | `^24.12.4` | Matches the actual Node runtime target instead of drifting to Node 25 types.                |
| `husky`                | `^9.1.7`   | Lightweight Git hooks for local quality gates.                                              |
| `lint-staged`          | `^17.0.5`  | Fast staged-file formatting and linting for small-team workflows.                           |

## Kept Current

The following packages are already on appropriate modern stable lines and should remain on their current major versions until there is a clear compatibility reason to move:

- `next` `^16.2.6`
- `react` and `react-dom` `^19.2.6`
- `next-intl` `^4.12.0`
- `tailwindcss` and `@tailwindcss/postcss` `^4.3.0`
- `@tanstack/react-query` and devtools `^5.100.10`
- `zustand` `^5.0.13`
- `react-hook-form` `^7.76.0`
- `zod` `^4.4.3`
- `axios` `^1.16.1`
- `framer-motion` `^12.38.0`
- `lucide-react` `^1.16.0`
- `sonner` `^2.0.7`
- shadcn/ui supporting packages: Radix primitives, `class-variance-authority`, `clsx`, and `tailwind-merge`

Google login currently uses the browser Google Identity Services script directly instead of adding a React OAuth wrapper. This keeps the dependency surface smaller while preserving a provider boundary in `modules/auth`. Revisit this only if multiple OAuth providers need shared browser SDK lifecycle behavior.

These dependencies are core to the frontend architecture and should be upgraded deliberately, with build, SSR, i18n, hydration, and form behavior verified after each framework-level change.

## Pinned or Constrained Packages

- `node` is constrained to `>=24.15.0 <25` so local development, Docker, and CI do not silently drift to a new major runtime.
- `npm` is constrained to `>=11.0.0` because the lockfile and Docker install strategy assume modern npm behavior.
- `eslint` remains on ESLint 9. The Next.js ESLint integration is stable on this line; moving to a newer major should wait until the Next ecosystem officially supports it.
- `@types/node` stays on Node 24 types. Do not upgrade to Node 25 types unless the runtime target changes.

## Removed Packages

No package was removed in this audit. Each current dependency is either part of the runtime architecture, test setup, design system, or development workflow.

Before removing a package, check:

- whether it is referenced by configuration files.
- whether it supports shadcn/ui primitives.
- whether it is used only in tests.
- whether the removal changes generated lockfile behavior in Docker or CI.

## Compatibility Notes

- Development and CI should run on Node 24, not older Node 22 builds.
- Vite 8, Vitest 4, jsdom 29, and lint-staged 17 expect a modern Node runtime. Older local Node versions can fail before tests execute.
- Next.js, React, next-intl, and the App Router should be validated together after framework upgrades because SSR, routing, and hydration behavior are tightly coupled.
- Tailwind CSS v4 is configured through PostCSS and CSS-first configuration. Avoid adding older Tailwind v3 config patterns unless a migration requires it.

## Security Notes

Run audits regularly:

```bash
npm audit --omit=dev
```

Current audit result:

- `npm audit --omit=dev` reports a moderate advisory through Next.js' bundled `postcss` dependency.
- npm currently suggests downgrading Next.js to an obsolete Next 9 version, which is not an acceptable fix for this project.
- Keep Next.js on the current stable line and re-check this advisory when new Next.js patch releases are available.

If npm audit suggests a downgrade or a framework-major jump, verify the advisory against the affected package and framework release notes before applying it. Security fixes should not break the frontend architecture or move the project to unsupported framework lines.

## Recommended Upgrade Workflow

1. Use Node 24 with `nvm use` or Docker.
2. Check outdated packages with `npm outdated`.
3. Review release notes for framework, build, lint, and test major upgrades.
4. Update `package.json` deliberately.
5. Refresh the lockfile with `npm install`.
6. Run `npm ci --dry-run --ignore-scripts --no-audit --no-fund`.
7. Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
8. Update this document with important decisions, constraints, and warnings.

## Maintenance Strategy

- Keep runtime, framework, and build tooling on active stable lines.
- Prefer upgrading a small related group at a time, such as Vite/Vitest/jsdom together.
- Avoid beta, canary, release-candidate, or experimental packages unless a specific production issue requires them.
- Keep frontend dependencies separate from API, database, queue, or worker dependencies. This repository consumes APIs; it does not host backend runtime code.
- Treat `package-lock.json` as the source of reproducibility for Docker and CI.
