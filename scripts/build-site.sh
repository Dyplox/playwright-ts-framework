#!/usr/bin/env bash
# Assembles the GitHub Pages site from the CI reports:
#   /             landing page
#   /playwright/  merged Playwright HTML report (all shards + visual)
#   /allure/      Allure report with history
#   /lighthouse/  Lighthouse CI reports
set -euo pipefail

OUT="${1:-site}"
rm -rf "$OUT"
mkdir -p "$OUT"

[ -d playwright-report ] && cp -R playwright-report "$OUT/playwright"
[ -d allure-report ] && cp -R allure-report "$OUT/allure"

LIGHTHOUSE_LINKS=""
if [ -d lhci-report ]; then
  mkdir -p "$OUT/lighthouse"
  cp lhci-report/*.html "$OUT/lighthouse/" 2>/dev/null || true
  for f in "$OUT"/lighthouse/*.html; do
    [ -e "$f" ] || continue
    name="$(basename "$f")"
    # "<path>-<datetime>-report.html" -> "/<path>" ("auth_login" -> "/auth/login", "" -> "/")
    page="/$(echo "$name" | sed -E 's/-[0-9_]+-report\.html$//; s#_#/#g')"
    LIGHTHOUSE_LINKS+="<li><a href=\"lighthouse/${name}\">${page}</a></li>"
  done
fi

RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
UPDATED="$(date -u '+%Y-%m-%d %H:%M UTC')"

cat > "$OUT/index.html" <<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>playwright-ts-framework · test reports</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; max-width: 46rem; margin: 3rem auto; padding: 0 1rem; color: #1f2328; }
    h1 { font-size: 1.6rem; margin-bottom: .25rem; }
    .meta { color: #59636e; margin-top: 0; }
    a { color: #0969da; }
    .cards { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); margin: 2rem 0; }
    .card { border: 1px solid #d1d9e0; border-radius: .5rem; padding: 1rem; }
    .card h2 { font-size: 1.1rem; margin: 0 0 .5rem; }
    ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>Test reports</h1>
  <p class="meta">Last update: ${UPDATED} · <a href="${RUN_URL}">CI run</a></p>
  <div class="cards">
    <div class="card"><h2><a href="playwright/">Playwright report</a></h2>Functional suite (4 shards, 3 browsers) and visual regression, merged.</div>
    <div class="card"><h2><a href="allure/">Allure report</a></h2>Same results with history and trends across runs.</div>
  </div>
  <h2>Lighthouse</h2>
  <ul>${LIGHTHOUSE_LINKS:-<li>No Lighthouse reports in this run.</li>}</ul>
</body>
</html>
HTML

echo "Site assembled in $OUT/"
