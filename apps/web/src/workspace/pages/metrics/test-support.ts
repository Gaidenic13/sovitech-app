/**
 * Test support for the Metrics pages' component tests (phase 6; not a test, never imported by the app): the fake API
 * with the workspace frame, the page's own route and the reads every page shares, and the checks every page state
 * runs (no number outside a bound element, no reserved pricing term, no dialog).
 */
import { screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import { installFakeApi, json, projectList, renderAt, type Handler } from '../../../test/harness';
import { frameResponse } from '../../test-views';
import { PROJECT } from './test-metrics';

export const M = `/api/projects/${PROJECT}/metrics`;

/** Words a figure must never carry without a stored quotation record (rule 10; the reserved pricing terms). */
export const RESERVED_PRICING = /\b(quote|quotation|offer|ofert[aă]|deviz|final|binding|firm price|guaranteed|will save|will reduce)\b/iu;

/** The fake API: the project list, the workspace frame and the handlers given. */
export function metricsApi(handlers: Readonly<Record<string, Handler>>, options: { readonly demo?: boolean } = {}) {
  const demo = options.demo === true;
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project for metrics', demo }])),
    [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT, { demo })),
    ...handlers,
  });
}

/** Opens a Metrics page and waits until it says it has rendered what it asked for. */
export async function openMetricsPage(path: string, title: string) {
  const view = renderAt(`/projects/${PROJECT}/metrics/${path}`);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

/** Every text that holds a number, with no element bound to a value id around it (what the render test fails, G2-1). */
export function unboundNumbers(root: Element = document.body): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    const parent = node.parentElement;
    if (parent === null || parent.closest('script, style') !== null) continue;
    if (/\p{N}/u.test(text) && parent.closest('[data-value-id]') === null) found.push(text);
  }
  return found;
}

/** The page column's text (the frame's sidebar and footer left out). */
export function pageText(): string {
  return document.getElementById('main')?.textContent ?? '';
}

/** What every state of every Metrics page holds to (G2-1, rule 10, rule 7: never a dialog). */
export function checkPageState(): void {
  const main = document.getElementById('main');
  if (main === null) throw new Error('no page column');
  expect(unboundNumbers(main)).toEqual([]);
  expect(pageText()).not.toMatch(RESERVED_PRICING);
  expect(document.querySelector('[role="dialog"], [role="alertdialog"], dialog')).toBeNull();
  // Nothing is disabled (rule 7): a control that is working says so with aria-busy.
  expect(main.querySelector('button[disabled], [aria-disabled="true"]')).toBeNull();
}
