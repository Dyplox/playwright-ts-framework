# playwright-ts-framework

[![CI](https://github.com/Dyplox/playwright-ts-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/Dyplox/playwright-ts-framework/actions/workflows/ci.yml)
![Playwright](https://img.shields.io/badge/Playwright-1.65-2EAD33?logo=playwright)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Browsers](https://img.shields.io/badge/browsers-Chromium%20%7C%20Firefox%20%7C%20WebKit-informational)

End-to-end test framework built with **Playwright + TypeScript** against
[Practice Software Testing – Toolshop](https://practicesoftwaretesting.com), a realistic Angular + Laravel
e-commerce app made for test automation practice.

It is designed to show **architecture and engineering judgement**, not just a list of passing tests:
composable fixtures, API-seeded data, API login with `storageState`, network control, accessibility,
visual regression and a sharded CI pipeline.

## Highlights

| Topic                | How it is done                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Architecture         | Page objects + reusable components, wired through Playwright fixtures (`test.extend` + `mergeTests`). Composition, no inheritance chains.                    |
| Fast authentication  | Login through the API, token written to a per-worker `storageState`. The login form is only exercised by the login tests.                                    |
| Short-lived tokens   | Toolshop JWTs expire after 5 minutes, so each worker renews its session automatically when the token is close to expiring (`AuthSession`).                   |
| Test isolation       | In the local environment every worker registers its **own customer** through the API (cart, favorites and invoices never collide between parallel workers).  |
| Test data            | `UserBuilder` (fluent, always-valid defaults with Faker) + factories that persist through the API.                                                           |
| UI ↔ API consistency | Tests compare what the UI renders with what the backend answered (including the app's HTTP `QUERY` requests).                                                |
| Network control      | Auto fixture that blocks analytics/trackers; `page.route` mocks come in milestone 2.                                                                         |
| Multi-environment    | `TEST_ENV=local` (Toolshop in Docker, deterministic) or `TEST_ENV=public` (shared instance, smoke only). URLs can be overridden with `BASE_URL` / `API_URL`. |
| Cross-browser        | Chromium, Firefox and WebKit. Pure API checks run once in a browserless `api` project.                                                                       |
| Evidence             | Trace, video and screenshot **only on failure**. Playwright HTML report + Allure.                                                                            |
| Code quality         | `tsc --noEmit` (strict), ESLint with `typescript-eslint` + `eslint-plugin-playwright`, Prettier. All enforced in CI.                                         |
| CI                   | GitHub Actions: quality gate → 4 shards (Toolshop in Docker per shard) → merged HTML report + Allure.                                                        |

## Project structure

```
playwright-ts-framework/
├── src/
│   ├── api/          ApiClient (typed), AuthSession (API login + storageState), types
│   ├── components/   Header, ProductCard, Toast (reused by pages)
│   ├── config/       Multi-environment config, global setup (health check)
│   ├── data/         builders/ factories/ and catalog queries
│   ├── fixtures/     api, auth, pages and network fixtures merged in index.ts
│   ├── pages/        Catalog, Product, Login, Account
│   └── utils/        JWT helpers
├── tests/
│   ├── api/          Browserless API checks
│   ├── e2e/smoke/    @smoke suite
│   ├── a11y/         (milestone 3)
│   └── visual/       (milestone 4)
├── scripts/toolshop.sh   Start/seed/stop Toolshop in Docker (pinned upstream revision)
├── playwright.config.ts
└── .github/workflows/ci.yml
```

## Getting started

Requirements: Node 20+, Docker (for the local environment).

```bash
npm ci
npx playwright install --with-deps

# Start Toolshop locally (UI http://localhost:4200, API http://localhost:8091)
./scripts/toolshop.sh up

npm test                 # full suite, 3 browsers
npm run test:smoke       # only @smoke
npm run test:chromium    # one browser
npm run test:public      # smoke against https://practicesoftwaretesting.com

./scripts/toolshop.sh seed   # reset the database
./scripts/toolshop.sh down   # stop everything
```

Run by tag with `--grep`: `npx playwright test --grep @smoke`, `--grep @api`.
Upcoming tags: `@a11y`, `@visual`.

### Reports

```bash
npm run report                               # Playwright HTML report
npm run allure:generate && npm run allure:open   # Allure (requires Java)
```

### Code quality

```bash
npm run quality   # typecheck + lint + format check (same as CI)
```

## Writing a test

```ts
import { test, expect } from '@fixtures';

test.describe('My account', { tag: '@smoke' }, () => {
  test.use({ authenticated: true }); // signed in through the API, no login form

  test('shows the customer name', async ({ userApi, accountPage }) => {
    const me = await userApi.me();
    await accountPage.goto();
    await expect(accountPage.header.userMenu).toContainText(me.first_name);
  });
});
```

## Design decisions

- **Why Toolshop?** It has a real REST API (Swagger, JWT, roles), many screens and an official Docker setup.
  Running it locally makes data deterministic, which is what visual regression and performance budgets need.
- **Why a per-worker session instead of a setup project?** The token lives 5 minutes; a single
  `storageState` created at the start would expire in the middle of a long shard.
- **Why a separate `api` project?** API checks don't need a browser; running them three times adds time and
  no information.
- **Shared environment etiquette.** Against the public instance the framework reuses the seeded accounts instead
  of registering new users.

## Roadmap

- [x] **1. Foundations** – setup, multi-environment config, fixtures, API login with `storageState`, smoke suite, CI quality gate and sharding.
- [ ] **2. Full E2E flows** – data created through the API and validated in the UI, `page.route` mocks and failure scenarios.
- [ ] **3. Accessibility** – `@axe-core/playwright` (WCAG 2.1 AA) on key pages with a documented exceptions list; Lighthouse CI budgets.
- [ ] **4. Visual regression** – `toHaveScreenshot` on mobile, tablet and desktop viewports.
- [ ] **5. Delivery** – reports on GitHub Pages, nightly run, SonarCloud and Allure history.
