import { test, expect } from '@playwright/test';
import { classify } from '@a11y/audit';
import type { A11yException } from '@a11y/exceptions';

const exceptions: A11yException[] = [
  { rule: 'button-name', target: '.toggle', wcag: '4.1.2', reason: 'known', review: 'later' },
];

const violation = (id: string, targets: string[]) => ({
  id,
  impact: 'serious' as const,
  help: id,
  helpUrl: `https://dequeuniversity.com/rules/axe/${id}`,
  nodes: targets.map((t) => ({ target: [t] })) as never,
});

test.describe('axe classification', { tag: '@unit' }, () => {
  test('an exception matches by rule AND selector, node by node', () => {
    const report = classify(
      [violation('button-name', ['.toggle', '.other-button']), violation('color-contrast', ['.toggle'])],
      exceptions,
    );

    expect(report.accepted.map((a) => `${a.rule} ${a.targets[0]}`)).toEqual(['button-name .toggle']);
    expect(report.violations.map((v) => `${v.rule} ${v.targets[0]}`)).toEqual([
      'button-name .other-button', // same rule, other element: still a failure
      'color-contrast .toggle', // same element, other rule: still a failure
    ]);
  });

  test('no violations means an empty report', () => {
    expect(classify([], exceptions)).toEqual({ violations: [], accepted: [] });
  });
});
