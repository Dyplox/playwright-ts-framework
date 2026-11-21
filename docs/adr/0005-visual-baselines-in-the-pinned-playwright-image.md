# 5. Visual baselines rendered in the pinned Playwright Docker image

- Status: accepted
- Date: 2026-11-20

## Context

Screenshots differ across operating systems, font sets and browser builds. Baselines created on a laptop
(macOS) never match CI (Linux), and even two Linux runners can differ after an image update.

## Decision

- Visual tests run in Chromium only, on three viewport projects (mobile, tablet, desktop).
- In CI they run inside `mcr.microsoft.com/playwright:v<version>-noble`, the version read from
  `package.json` (`scripts/playwright-docker.sh`). Baselines are created by the **Update visual baselines**
  workflow in the same image and committed (`*-linux.png`).
- Local macOS/Windows baselines are allowed for development but git-ignored.
- Stability: fonts and images awaited, animations disabled, volatile widgets hidden with `stylePath`,
  screenshots in CSS pixels.

## Consequences

- A diff means the UI changed, not the machine.
- Intentional UI changes require running the update workflow (a reviewable commit of new baselines).
- Visual tests also catch **test-data leakage**: a product created by another test showed up in
  "Related products"; the fix was cleaning up after the negative test, not loosening the snapshot.
