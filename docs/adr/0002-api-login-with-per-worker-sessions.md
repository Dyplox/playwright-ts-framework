# 2. API login with one session per worker (not a setup project)

- Status: accepted
- Date: 2026-11-20

## Context

Logging in through the UI in every test is slow and makes the login form a single point of failure for the
whole suite. The usual Playwright answer is a setup project that logs in once and saves `storageState`.

Toolshop issues **JWTs that live 5 minutes** and stores them in `localStorage`. A shard can run longer than
that, so a single state file created at the start expires mid-run. Parallel workers sharing one customer would
also share a cart, favorites and invoices.

## Decision

- Each worker logs in **through the API** (`AuthSession`) and writes its own `storageState` file.
- Before handing the file to a test, the session checks the token's `exp` and **renews it** when it is about
  to expire.
- In the local environment each worker first **registers its own customer** through the API (full isolation).
  On the shared public instance it reuses the seeded accounts instead.
- Tests choose the identity declaratively: `test.use({ role: 'customer' | 'admin' })`.

## Consequences

- No test pays for the login form except the tests about the login form.
- No cross-test interference through shared accounts, even with `fullyParallel`.
- `sessionStorage` (where Toolshop keeps the cart) is not part of `storageState`; carts created via API are
  injected with `addInitScript` (`useCartInBrowser`).
