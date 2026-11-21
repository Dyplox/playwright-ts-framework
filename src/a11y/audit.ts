import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import type { AxeResults, Result } from 'axe-core';
import { A11Y_EXCEPTIONS, WCAG_21_AA_TAGS, type A11yException } from './exceptions';

export interface A11yViolation {
  rule: string;
  impact: string | null | undefined;
  help: string;
  helpUrl: string;
  targets: string[];
}

export interface A11yReport {
  /** Violations not covered by a documented exception: these fail the test. */
  violations: A11yViolation[];
  /** Violations matched by an exception (kept visible in the report). */
  accepted: Array<A11yViolation & { exception: A11yException }>;
}

export interface AuditOptions {
  /** Limit the scan to part of the page (e.g. a dialog). */
  include?: string;
  /** Regions that are not part of the system under test. */
  exclude?: string[];
}

/**
 * Runs axe (WCAG 2.1 AA) on the current page, splits violations into accepted/new using the
 * documented exceptions, and attaches the full report to the test for the HTML/Allure reports.
 */
export async function auditA11y(
  page: Page,
  testInfo: TestInfo,
  options: AuditOptions = {},
): Promise<A11yReport> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_21_AA_TAGS);
  if (options.include) builder = builder.include(options.include);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);

  const results: AxeResults = await builder.analyze();
  const report = classify(results.violations);

  await testInfo.attach('axe-report.json', {
    body: JSON.stringify({ url: page.url(), ...report, passes: results.passes.length }, null, 2),
    contentType: 'application/json',
  });
  for (const accepted of report.accepted) {
    testInfo.annotations.push({
      type: 'a11y-exception',
      description: `${accepted.rule} on ${accepted.targets.join(', ')} — ${accepted.exception.wcag}`,
    });
  }
  return report;
}

function classify(violations: Result[]): A11yReport {
  const report: A11yReport = { violations: [], accepted: [] };
  for (const v of violations) {
    for (const node of v.nodes) {
      const target = node.target.join(' ');
      const entry: A11yViolation = {
        rule: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        targets: [target],
      };
      const exception = A11Y_EXCEPTIONS.find((e) => e.rule === v.id && target.includes(e.target));
      if (exception) report.accepted.push({ ...entry, exception });
      else report.violations.push(entry);
    }
  }
  return report;
}

/** Human-readable summary used as the assertion message. */
export function formatViolations(violations: A11yViolation[]): string {
  return violations
    .map(
      (v) => `[${v.impact ?? 'n/a'}] ${v.rule}: ${v.help}\n    ${v.targets.join('\n    ')}\n    ${v.helpUrl}`,
    )
    .join('\n');
}
