# Architecture Decision Records

Architecture Decision Records preserve why important technical choices were made. They are intentionally short, durable, and written for future maintainers, reviewers, and AI agents that need architectural context before changing the system.

## When to Write an ADR

Create an ADR when a decision:

- changes architecture, folder structure, or ownership boundaries.
- introduces, replaces, or removes a major dependency.
- affects routing, i18n, auth, state management, API contracts, map architecture, or deployment behavior.
- creates a convention that future features must follow.
- rejects a plausible alternative that future maintainers may revisit.

Do not create an ADR for routine component work, copy changes, small bug fixes, or implementation details that do not affect future direction.

## Naming Conventions

ADR files live in `docs/adr/`.

Use this format:

```txt
NNNN-short-kebab-case-title.md
```

Examples:

```txt
0001-feature-based-nextjs-frontend-foundation.md
0002-use-next-intl-for-locale-routing.md
0003-adopt-http-only-cookie-auth.md
```

Rules:

- Use a four-digit, zero-padded sequence number.
- Never renumber existing ADRs.
- Use lowercase kebab case after the number.
- Keep the file name stable even if the decision title later changes.
- If a decision is replaced, mark the old ADR as `Superseded` and link to the new ADR.

## Status Values

Use one of:

- `Proposed`: under discussion.
- `Accepted`: approved and currently guiding implementation.
- `Deprecated`: still historically relevant, but no longer recommended.
- `Superseded`: replaced by a newer ADR.
- `Rejected`: recorded because the option was seriously considered and intentionally not chosen.

## Workflow

1. Copy `docs/adr/TEMPLATE.md`.
2. Name the new file using the next sequence number.
3. Fill every section, even if a section is brief.
4. Link related docs, code paths, issues, or ADRs.
5. Update status when the decision changes.

The goal is traceability, not ceremony. Write enough context that a new teammate or AI agent can understand the decision without reconstructing it from commit history.
