# 4. Known defects of the app are documented as code, never hidden

- Status: accepted
- Date: 2026-11-20

## Context

Toolshop is a third-party app: we can report its defects but not fix them. Without a policy, a red suite gets
"fixed" by disabling an axe rule, loosening an assertion or skipping a test, and the same gap later hides a
real regression.

## Decision

Three mechanisms, one rule: **every known defect is specific, explained, and verified to still exist.**

| Kind             | Where                                     | Scope                                          | Stale check                                     |
| ---------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| Accessibility    | `src/a11y/exceptions.ts`                  | axe rule **and** selector, with WCAG criterion | `every documented exception still reproduces`   |
| API vs. its spec | `src/api/contract-gaps.ts`                | method + path + status (or schema error)       | `documented contract gaps still reproduce`      |
| Behaviour bug    | `test.fail()` + `known defect` annotation | one test                                       | Playwright reports "unexpected pass" when fixed |

## Consequences

- The suite stays green on the known baseline and goes red on anything new.
- When the app fixes something, a test fails and the entry must be removed: the list can't rot.
- The run summary (job summary / PR comment) lists every accepted exception and known defect.
