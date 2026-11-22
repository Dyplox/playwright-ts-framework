#!/usr/bin/env bash
# Runs Playwright inside the official image pinned to the project's Playwright version.
# Used for visual regression so baselines are always rendered with the same Chromium build
# and fonts, both when they are created (update-snapshots.yml) and when they are compared (ci.yml).
#
#   ./scripts/playwright-docker.sh --project=visual-desktop
#   ./scripts/playwright-docker.sh --project=visual-mobile --update-snapshots
#
# Linux only: needs --network host to reach Toolshop on localhost.
# The repo is mounted at the SAME absolute path as on the host: blob reports record the test
# directory, and `merge-reports` refuses to merge reports recorded under different paths.
set -euo pipefail

VERSION="$(node -p "require('@playwright/test/package.json').version")"
IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v${VERSION}-noble}"

exec docker run --rm \
  --network host \
  --ipc host \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e CI="${CI:-}" \
  -e TEST_ENV="${TEST_ENV:-local}" \
  -v "$PWD":"$PWD" \
  -w "$PWD" \
  "$IMAGE" \
  npx playwright test "$@"
