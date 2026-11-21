/**
 * Documented accessibility exceptions.
 *
 * Toolshop is a third-party demo app: we report its defects, we can't fix them. Each known
 * defect is listed here so the suite stays green on the baseline and goes red on anything new.
 *
 * Rules of this file:
 *  - An exception is scoped to ONE axe rule AND a selector. Never disable a rule globally.
 *  - Every entry states the WCAG success criterion, why it is accepted and when to revisit it.
 *  - Exceptions that no longer match anything are reported as "stale" in the test annotations,
 *    so they get deleted instead of silently hiding future regressions.
 */
export interface A11yException {
  /** axe rule id, e.g. "color-contrast". */
  rule: string;
  /** Substring that must appear in the offending node's CSS target. */
  target: string;
  wcag: string;
  reason: string;
  /** When to re-check (date or event). */
  review: string;
}

export const A11Y_EXCEPTIONS: readonly A11yException[] = [
  {
    rule: 'label-content-name-mismatch',
    target: '#language',
    wcag: '2.5.3 Label in Name (A)',
    reason:
      'Header language switcher: visible text is the language code ("EN") but aria-label is "Select language". ' +
      'Speech-input users cannot activate it by its visible label. Present on every page (shared header).',
    review: 'Re-check when the Toolshop revision pinned in scripts/toolshop.sh is updated.',
  },
  {
    rule: 'label-content-name-mismatch',
    target: 'a[data-test="nav-cart"]',
    wcag: '2.5.3 Label in Name (A)',
    reason:
      'Header cart link: when the cart has items its visible text is the item count, but aria-label is "cart". ' +
      'Only reproduces with a non-empty cart.',
    review: 'Re-check when the Toolshop revision pinned in scripts/toolshop.sh is updated.',
  },
  {
    rule: 'button-name',
    target: '.btn-outline-secondary',
    wcag: '4.1.2 Name, Role, Value (A)',
    reason:
      'Show/hide password toggle on login and register is an icon-only button without accessible name. ' +
      'Critical for screen-reader users; accepted only because it is a defect of the system under test.',
    review: 'Re-check when the Toolshop revision pinned in scripts/toolshop.sh is updated.',
  },
  {
    rule: 'list',
    target: '.checkbox',
    wcag: '1.3.1 Info and Relationships (A)',
    reason:
      'Category filter tree nests <fieldset>/<div> directly inside <ul> (no <li>), so the list structure ' +
      'is not exposed to assistive technology. Affects the catalog and category pages.',
    review: 'Re-check when the Toolshop revision pinned in scripts/toolshop.sh is updated.',
  },
  {
    rule: 'list',
    target: '#passwordHelp',
    wcag: '1.3.1 Info and Relationships (A)',
    reason: 'Password requirements helper on the register form uses a <ul> with non-<li> children.',
    review: 'Re-check when the Toolshop revision pinned in scripts/toolshop.sh is updated.',
  },
];

/** WCAG 2.1 level A + AA, the target conformance level of this suite. */
export const WCAG_21_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
