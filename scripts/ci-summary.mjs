#!/usr/bin/env node
// Builds the Markdown run summary used as the GitHub job summary and as the sticky PR comment.
//
//   node scripts/ci-summary.mjs <playwright-results.json> [lhci-report-dir] > summary.md
//
// Inputs: the merged Playwright JSON report (all shards + visual) and, optionally, the
// Lighthouse CI output folder (manifest.json).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const [resultsFile, lhciDir] = process.argv.slice(2);
if (!resultsFile) {
  console.error('usage: ci-summary.mjs <results.json> [lhci-report-dir]');
  process.exit(2);
}

const report = JSON.parse(readFileSync(resultsFile, 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = 0 } = report.stats ?? {};

/** Flattens suites → specs → tests (one entry per project). */
function* walk(suite, titles = []) {
  const here = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) yield { spec, test, titles: [...here, spec.title] };
  }
  for (const child of suite.suites ?? []) yield* walk(child, here);
}

const failures = [];
const flakies = [];
const byProject = new Map();
const annotations = { a11y: new Set(), knownDefects: new Set() };

for (const root of report.suites ?? []) {
  for (const { spec, test, titles } of walk(root)) {
    const project = test.projectName || 'default';
    const row = byProject.get(project) ?? { passed: 0, failed: 0, flaky: 0, skipped: 0 };
    const name = `${titles.slice(1).join(' › ')} (${project})`;

    if (test.status === 'expected') row.passed++;
    else if (test.status === 'unexpected') {
      row.failed++;
      failures.push(`${name} — \`${spec.file}:${spec.line}\``);
    } else if (test.status === 'flaky') {
      row.flaky++;
      flakies.push(name);
    } else row.skipped++;
    byProject.set(project, row);

    for (const a of test.annotations ?? []) {
      if (a.type === 'a11y-exception') annotations.a11y.add(a.description);
      if (a.type === 'known defect') annotations.knownDefects.add(spec.title);
    }
  }
}

const icon = unexpected > 0 ? '❌' : flaky > 0 ? '⚠️' : '✅';
const lines = [];
lines.push('<!-- playwright-ts-framework:summary -->');
lines.push(`## ${icon} Test run summary`);
lines.push('');
lines.push(
  `**${expected} passed** · **${unexpected} failed** · ${flaky} flaky · ${skipped} skipped · ` +
    `${(duration / 1000 / 60).toFixed(1)} min wall time`,
);
lines.push('');
lines.push('| Project | Passed | Failed | Flaky | Skipped |');
lines.push('| --- | ---: | ---: | ---: | ---: |');
for (const [project, r] of [...byProject.entries()].sort()) {
  lines.push(`| ${project} | ${r.passed} | ${r.failed} | ${r.flaky} | ${r.skipped} |`);
}

if (failures.length > 0) {
  lines.push('', '### Failures');
  for (const f of failures.slice(0, 15)) lines.push(`- ${f}`);
  if (failures.length > 15) lines.push(`- …and ${failures.length - 15} more (see the report)`);
}
if (flakies.length > 0) {
  lines.push('', '### Flaky (passed on retry)');
  for (const f of flakies.slice(0, 10)) lines.push(`- ${f}`);
}

// Lighthouse: median scores per URL (manifest marks the representative run).
const manifestFile = lhciDir ? path.join(lhciDir, 'manifest.json') : '';
if (manifestFile && existsSync(manifestFile)) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')).filter((m) => m.isRepresentativeRun);
  if (manifest.length > 0) {
    const pct = (v) => (typeof v === 'number' ? Math.round(v * 100) : '–');
    lines.push('', '### Lighthouse (median run)');
    lines.push('| Page | Performance | Accessibility | Best practices |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const m of manifest) {
      const s = m.summary ?? {};
      lines.push(
        `| ${new URL(m.url).pathname} | ${pct(s.performance)} | ${pct(s.accessibility)} | ${pct(s['best-practices'])} |`,
      );
    }
  }
}

if (annotations.a11y.size > 0 || annotations.knownDefects.size > 0) {
  lines.push('', '<details><summary>Documented exceptions and known defects</summary>', '');
  for (const a of [...annotations.a11y].sort()) lines.push(`- a11y exception: ${a}`);
  for (const d of [...annotations.knownDefects].sort()) lines.push(`- known defect (test.fail): ${d}`);
  lines.push('', '</details>');
}

const runUrl = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : '';
if (runUrl) {
  lines.push('', `📦 Reports: [HTML, Allure & Lighthouse artifacts](${runUrl}) of this run`);
}

console.log(lines.join('\n'));
