# ADR NNNN: Title

- Status: Proposed
- Date: YYYY-MM-DD
- Owners: Frontend
- Related: links to issues, pull requests, docs, code paths, or other ADRs

## Context

Describe the problem, constraints, goals, and forces that make this decision necessary.

Include:

- current architecture or behavior.
- product or technical requirements.
- known constraints.
- why this matters now.
- what future maintainers or AI agents need to know before changing it.

## Decision

State the decision clearly.

Use direct language:

- We will...
- We will not...
- This applies to...

## Consequences

Describe the expected results of this decision.

Include positive and negative consequences:

- what becomes easier.
- what becomes harder.
- operational impact.
- developer experience impact.
- testing or documentation impact.

## Alternatives Considered

List serious alternatives and why they were not chosen.

Use this shape:

```txt
Alternative: <name>
Reason not chosen: <short explanation>
```

## Tradeoffs

Call out the tensions in the decision.

Examples:

- speed vs flexibility.
- simplicity vs explicitness.
- framework convention vs custom control.
- bundle size vs developer experience.
- short-term delivery vs long-term maintainability.

## Future Considerations

Describe what could cause this decision to be revisited.

Include:

- signals that the decision is aging.
- future features that may require changes.
- migration notes.
- open questions.

## Notes for AI Agents

Summarize the operational rule an AI assistant should follow when editing this area.

Example:

> When adding new feature code, keep route files thin and place business logic under `src/modules/<feature>`.
