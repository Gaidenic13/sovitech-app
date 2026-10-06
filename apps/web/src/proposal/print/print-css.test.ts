/**
 * The print stylesheet's page rules (phase 5 part B, the print route's design-review fixes), read from print.css as
 * written. The print page's component tests (../ProposalPrintPage.test.tsx) prove the markup these rules select; the
 * guardrail cases that print the page in Chromium (G10-5, G10-13) prove the printed PDF.
 */
import { describe, expect, it } from 'vitest';

/**
 * Node's file reader, reached without Node's global types: the web is typed for the browser, and Vitest empties a
 * stylesheet imported as a module.
 */
interface NodeFs {
  readFileSync(path: URL, encoding: 'utf8'): string;
}
const { readFileSync } = (globalThis as unknown as { process: { getBuiltinModule(id: 'node:fs'): NodeFs } }).process.getBuiltinModule('node:fs');

const PRINT_CSS = readFileSync(new URL('./print.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '');

/** The declarations of the rule with exactly this selector (one of its selectors), whitespace collapsed. */
function rule(selector: string): string {
  for (const match of PRINT_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectors = (match[1] ?? '').split(',').map((part) => part.trim());
    if (selectors.includes(selector)) return (match[2] ?? '').replace(/\s+/gu, ' ').trim();
  }
  return '';
}

describe('the print stylesheet', () => {
  it('DR-15: the short control points section is never split across two pages, so rule 11\'s interface points never open a page alone', () => {
    expect(rule(".sov-print__section[data-print-section='points']")).toContain('break-inside: avoid');
  });

  it('DR-12 · ADR 0050: the basis prints as a two-column table (the name, then the value where it fits beside it, else under it across the page), a row never split across two pages', () => {
    const row = rule('.sov-print__table-row');
    expect(row).toContain('display: flex');
    expect(row).toContain('flex-wrap: wrap');
    expect(row).toContain('break-inside: avoid');
    // The name holds the first column; the value takes the second only at its own width, else wraps under the name.
    expect(rule('.sov-print__table-row > .sov-print__name')).toContain('flex: 0 0 calc(50% - 4mm)');
    expect(rule('.sov-print__cell')).toContain('flex: 1 0 auto');
    expect(rule('.sov-print__cell')).toContain('max-width: 100%');
    expect(rule(".sov-print__cell[data-whole-row='true']")).toContain('flex-basis: 100%');
  });

  it('DR-2: a value prints at the body\'s size, and only an investment figure keeps the figure size', () => {
    expect(rule('.sov-print .sov-value__text')).toContain('font-size: 14px');
    expect(rule(".sov-print .sov-price .sov-value:not([data-shape='missing']) .sov-value__text")).toContain('font-size: 20px');
    expect(rule(".sov-print .sov-price .sov-value[data-shape='missing'] .sov-value__text")).toContain('font-size: 14px');
  });
});
