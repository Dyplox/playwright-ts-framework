# playwright-ts-framework

[![CI](https://github.com/Dyplox/playwright-ts-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/Dyplox/playwright-ts-framework/actions/workflows/ci.yml)
[![Nightly](https://github.com/Dyplox/playwright-ts-framework/actions/workflows/nightly.yml/badge.svg)](https://github.com/Dyplox/playwright-ts-framework/actions/workflows/nightly.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=Dyplox_playwright-ts-framework&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Dyplox_playwright-ts-framework)
[![Reports](https://img.shields.io/badge/reports-GitHub%20Pages-0969da)](https://dyplox.github.io/playwright-ts-framework/)
![Playwright](https://img.shields.io/badge/Playwright-1.65-2EAD33?logo=playwright)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Browsers](https://img.shields.io/badge/browsers-Chromium%20%7C%20Firefox%20%7C%20WebKit-informational)
![WCAG](https://img.shields.io/badge/WCAG-2.1%20AA-blueviolet)

End-to-end test framework built with **Playwright + TypeScript** against
[Practice Software Testing – Toolshop](https://practicesoftwaretesting.com), a realistic Angular + Laravel
e-commerce app made for test automation practice.

It is designed to show **architecture and engineering judgement**, not just a list of passing tests:
composable fixtures, data created through the API, API login with `storageState`, network mocking,
accessibility (axe + Lighthouse budgets), visual regression on three viewports and a sharded CI pipeline that
publishes its reports.

**Live reports:** [Playwright · Allure · Lighthouse](https://dyplox.github.io/playwright-ts-framework/)

## What is covered

| Suite         | Tag       | What it shows                                                                                               | Runs on                          |
| ------------- | --------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Smoke         | `@smoke`  | Catalog vs API, search, product detail, cart badge, API login + `storageState`, login form, API health      | API + 3 browsers                 |
| E2E flows     | `@e2e`    | Checkout to invoice with the cart seeded via API, favorites created via API and removed in the UI           | 3 browsers                       |
| Network mocks | `@mock`   | Declined payment, address-lookup outage, empty catalog, slow catalog (loading skeletons), add-to-cart error | 3 browsers                       |
| Accessibility | `@a11y`   | axe-core WCAG 2.1 AA on 10 pages/states + a check that keeps the exceptions list honest                     | Chromium                         |
| Visual        | `@visual` | `toHaveScreenshot` of 4 pages + the responsive header                                                       | Chromium × mobile/tablet/desktop |
| Lighthouse    | –         | Accessibility & best-practices gate, Core Web Vitals and weight budgets on 4 pages                          | Chrome (Lighthouse CI)           |

33 test definitions → 73 executions per pipeline (functional suite × 3 engines, visual × 3 viewports).

## Engineering highlights

| Topic                | How it is done                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture         | Page objects + reusable components wired through fixtures (`test.extend` + `mergeTests`). Composition, no inheritance chains. A single import: `import { test, expect } from '@fixtures'`.  |
| Fast authentication  | Login through the API and token written to a per-worker `storageState`. The login form is exercised only by the login tests.                                                                |
| Short-lived tokens   | Toolshop JWTs live 5 minutes, so each worker renews its session when the token is about to expire (`AuthSession`) instead of relying on a one-off setup project.                            |
| Isolation            | Locally every worker registers **its own customer** through the API: carts, favorites and invoices never collide between parallel workers or shards.                                        |
| Test data            | `UserBuilder` (fluent, always-valid defaults with Faker), factories that persist through the API (`createCustomer`, `createCart`) and catalog queries that keep guard clauses out of specs. |
| API → UI             | The cart lives in `sessionStorage` (not captured by `storageState`), so carts created via API are injected with `addInitScript` before the app boots.                                       |
| UI ↔ backend checks  | Tests compare the UI with what the backend answered: the catalog's HTTP `QUERY` request, invoice totals and billing street via `GET /invoices`.                                             |
| Network control      | `page.route` mocks for states the backend can't produce on demand; an auto fixture blocks analytics. The happy path never fakes data the backend re-validates.                              |
| Accessibility policy | Exceptions are scoped to rule + selector with WCAG criterion and justification ([`src/a11y/exceptions.ts`](src/a11y/exceptions.ts)); a test fails if an exception stops reproducing.        |
| Visual stability     | Fonts and images awaited, animations off, volatile widgets hidden through `stylePath`, CSS-pixel screenshots, baselines rendered in the pinned Playwright Docker image.                     |
| Multi-environment    | `TEST_ENV=local` (Toolshop in Docker, deterministic) or `TEST_ENV=public` (shared instance, smoke only, seeded accounts reused). `BASE_URL` / `API_URL` override anything.                  |
| Evidence             | Trace, video and screenshot **only on failure**; Playwright HTML report + Allure with history; axe JSON attached to every a11y test.                                                        |
| Code quality         | `tsc --noEmit` (strict), ESLint (`typescript-eslint` type-checked + `eslint-plugin-playwright`), Prettier, SonarCloud.                                                                      |

## CI/CD

```
quality ─┬─ e2e (4 shards: API + Chromium + Firefox + WebKit) ─┐
         ├─ visual (Playwright image, 3 viewports) ──────────────┼─ report (merge-reports + Allure) ─ deploy-pages
         ├─ lighthouse (budgets) ───────────────────────────────┘
         └─ sonarcloud
```

- **Triggers:** push to `main`, pull requests, manual run with a tag filter (`@smoke`, `@e2e`, `@mock`, `@a11y`),
  and a **nightly** full regression ([`nightly.yml`](.github/workflows/nightly.yml)).
- Each job starts its own Toolshop with [`scripts/toolshop.sh`](scripts/toolshop.sh) (upstream revision pinned).
- Blob reports from every shard and the visual job are merged into one HTML report; Allure keeps its history by
  restoring it from the published site. Both, plus Lighthouse, are published to GitHub Pages from `main`.
- Failures upload traces, videos and screenshot diffs as artifacts.

### One-time repository setup

1. **Pages:** Settings → Pages → Source: **GitHub Actions**.
2. **SonarCloud:** import the repo in SonarCloud (organization `dyplox`, key `Dyplox_playwright-ts-framework`,
   or edit [`sonar-project.properties`](sonar-project.properties)), disable "Automatic Analysis" and add the
   `SONAR_TOKEN` repository secret. Without the secret the job is skipped with a notice.
3. **Visual baselines:** run the **Update visual baselines** workflow once. It renders the Linux screenshots in
   the pinned Playwright image and commits them. Run it again whenever a UI change is intentional.

## Project structure

```
playwright-ts-framework/
├── src/
│   ├── a11y/         axe audit + documented exceptions (WCAG 2.1 AA)
│   ├── api/          ApiClient (typed), AuthSession (API login + storageState), types
│   ├── components/   Header, ProductCard, Toast (composed into pages)
│   ├── config/       Multi-environment config, global setup (health check)
│   ├── data/         builders/, factories/ (persist via API), catalog queries
│   ├── fixtures/     api, auth, pages, network and a11y fixtures merged in index.ts
│   ├── mocks/        page.route mocks
│   ├── pages/        Catalog, Product, Login, Account, Checkout, Favorites, Invoices
│   ├── utils/        JWT helpers, sessionStorage cart injection
│   └── visual/       Screenshot CSS + stability helper
├── tests/
│   ├── api/          Browserless API checks
│   ├── e2e/          smoke/, checkout, favorites, network mocks
│   ├── a11y/         axe scans + exceptions check
│   ├── visual/       Screenshot tests
│   └── __screenshots__/   Linux baselines (one folder per viewport project)
├── scripts/          toolshop.sh, playwright-docker.sh, allure-history.sh, build-site.sh
├── docker/           Compose overrides for the upstream Toolshop stack
├── playwright.config.ts · lighthouserc.json · sonar-project.properties
└── .github/workflows/  ci.yml · nightly.yml · update-snapshots.yml
```

## Getting started

Requirements: Node 22 (`nvm use`), Docker.

```bash
npm ci
npx playwright install --with-deps

./scripts/toolshop.sh up       # Toolshop: UI http://localhost:4200, API http://localhost:8091

npm test                       # API + functional suite in Chromium, Firefox and WebKit
npm run test:smoke             # only @smoke
npm run test:e2e               # E2E flows
npm run test:mock              # network-mock scenarios
npm run test:a11y              # axe WCAG 2.1 AA
npm run test:visual            # visual regression (3 viewports)
npm run lighthouse             # Lighthouse CI budgets
npm run test:public            # smoke against https://practicesoftwaretesting.com

./scripts/toolshop.sh seed     # reset the database (and API cache)
./scripts/toolshop.sh down
```

**Visual tests locally:** committed baselines are Linux-only. On macOS/Windows create your own once with
`npm run test:visual:update`; they are git-ignored.

### Reports

```bash
npm run report                                   # Playwright HTML report
npm run allure:generate && npm run allure:open   # Allure (requires Java)
```

### Code quality

```bash
npm run quality   # typecheck + lint + format check (same as CI)
```

## Writing a test

```ts
import { test, expect } from '@fixtures';
import { aPurchasableProduct } from '@data/catalog.queries';

test.describe('Favorites', { tag: '@e2e' }, () => {
  test.use({ authenticated: true }); // signed in through the API, no login form

  test('a favorite created via API is listed', async ({ api, userApi, favoritesPage, expectAccessible }) => {
    const product = await aPurchasableProduct(api);
    await userApi.addFavorite(product.id); // arrange through the API

    await favoritesPage.goto(); // act / assert in the UI
    await expect(favoritesPage.card(product.name)).toBeVisible();
    await expectAccessible(); // optional WCAG 2.1 AA check of the same state
  });
});
```

## Design decisions

- **Why Toolshop?** A real REST API (Swagger, JWT, roles), many screens and an official Docker setup. Running it
  locally makes data deterministic, which visual regression and performance budgets need.
- **Why a per-worker session instead of a setup project?** The token lives 5 minutes; a single `storageState`
  created at the start would expire in the middle of a long shard.
- **Why not mock the address lookup in the happy path?** The backend re-validates city/state against the same
  lookup when the invoice is created. A faked address is (rightly) rejected, so the test asks the real lookup what
  to expect and mocks it only to simulate an outage.
- **Why accessibility in Chromium only?** axe evaluates the DOM/ARIA tree; running it in three engines adds minutes
  and no information. The functional suite still runs in all three.
- **Why Lighthouse performance as a warning?** The Toolshop image serves Angular with its dev server (unminified,
  uncompressed: ~5.5 MB of JavaScript), so absolute performance numbers reflect the environment more than the app.
  Accessibility and best practices are hard gates. Core Web Vitals use the "good" thresholds as targets and the
  script budget (6 MB) acts as a regression guard; all of them are reported as warnings.
- **Known defects found in the app** are documented, not hidden: see the accessibility exceptions list.

## Roadmap

- [x] **1. Foundations** – setup, multi-environment config, fixtures, API login with `storageState`, smoke suite.
- [x] **2. Full E2E flows** – data created through the API and validated in the UI, `page.route` mocks.
- [x] **3. Accessibility** – axe WCAG 2.1 AA with documented exceptions; Lighthouse CI budgets.
- [x] **4. Visual regression** – `toHaveScreenshot` on mobile, tablet and desktop.
- [x] **5. Delivery** – 4-shard CI, merged reports on GitHub Pages, Allure history, nightly run, SonarCloud.
