# 0003 Cookie-Backed Google OAuth

## Status

Accepted

## Context

The frontend needs Google login without making the browser the source of truth for authentication. The app also needs SSR route protection, locale-aware redirects, TanStack Query session state, and future room for GitHub, Apple, and magic-link flows.

## Decision

Use Google Identity Services in the browser only to obtain a Google credential. Send that credential to the backend at `POST /auth/oauth/google`. The backend verifies the credential, links or creates the user, and issues the app session.

The frontend uses backend-set httpOnly cookies for access and refresh tokens, plus a readable CSRF cookie sent as `X-CSRF-Token` by Axios. TanStack Query owns current-user/session state. Zustand must not mirror the authenticated user.

## Consequences

- SSR layouts can validate sessions through `GET /auth/me`.
- Components do not store tokens or call Axios directly.
- Future providers add provider-specific UI and a shared OAuth mutation path.
- Docker needs browser-facing `NEXT_PUBLIC_API_URL` and server-facing `API_INTERNAL_URL`.
- Production deployments should keep frontend and API on a cookie-compatible site or configure an auth BFF deliberately.
