# 3. Two API contracts: consumer (Zod) and provider (OpenAPI)

- Status: accepted
- Date: 2026-11-20

## Context

The framework arranges almost every test through the API. If a response changes shape, tests fail later in
the UI with misleading errors. Toolshop publishes an OpenAPI 3.2 document, but its schemas mark no field as
`required`, so validating against it alone would accept a response with missing fields.

## Decision

- **Consumer contract**: Zod schemas (`src/api/schemas.ts`) describe only the fields the framework reads.
  `ApiClient` parses every response with them, and the TypeScript types are inferred from the same schemas.
- **Provider contract**: `tests/api/contract.spec.ts` validates real responses against the published OpenAPI
  document with Ajv (JSON Schema 2020-12) and fails if an operation the framework uses disappears from the spec.
- Deviations between the API and its own spec are listed in `src/api/contract-gaps.ts` (see ADR 4).

## Consequences

- A renamed or retyped field fails at the API step with a precise message, in whichever test hits it first.
- One source of truth for types: no hand-written interfaces drifting from reality.
- Already found real spec issues: undocumented `401`/`422` responses and `null` pagination fields typed as
  `integer`.
