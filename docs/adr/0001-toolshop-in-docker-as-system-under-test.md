# 1. Toolshop, self-hosted in Docker, as the system under test

- Status: accepted
- Date: 2026-11-20

## Context

A portfolio framework needs an application that is realistic (REST API, auth, roles, many screens),
stable over time and deterministic enough for visual regression and performance budgets. Ten public demo apps
were compared (Sauce Demo, Restful Booker Platform, Conduit, Juice Shop, Automation Exercise, …).

Shared public instances are mutated by everyone, reset on their own schedule and sometimes carry ads or
third-party scripts: fine for smoke tests, not for screenshots or budgets.

## Decision

Use **Practice Software Testing – Toolshop** (Angular + Laravel, OpenAPI 3.2, JWT, customer/admin roles) and
run it **locally in Docker** for every CI job, pinned to an upstream commit (`scripts/toolshop.sh`). The public
instance is kept as a second environment (`TEST_ENV=public`) for smoke tests only.

## Consequences

- Deterministic data: every job seeds its own database, parallel shards can't interfere.
- Upstream changes never break the suite by surprise; bumping `TOOLSHOP_REF` is an explicit, reviewable change.
- Cost: Docker images (~1.5 GB) on every job. Mitigated by caching them once per pipeline (`images` job).
- Published images don't share an architecture (API/UI amd64 only, nginx arm64 only), handled by
  `docker/toolshop.override.yml` (per-service platform + nginx built from upstream's Dockerfile).
