import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { STEP_TITLES } from '@sovitech/view-model/browser';
import { Stepper, type StepperLabels } from './Stepper';

afterEach(cleanup);

const LABELS: StepperLabels = { list: 'TEST steps', done: 'TEST done', newFindings: 'TEST new findings' };

function items(): HTMLLIElement[] {
  return [...document.querySelectorAll<HTMLLIElement>('ol[data-render-stepper="wizard-step-number"] > li')];
}

/** The item's text as the render test reads it: everything but its step-number marker. */
function textBesideNumber(item: HTMLLIElement): string {
  const clone = item.cloneNode(true) as HTMLLIElement;
  clone.querySelector('[data-render-allow]')?.replaceWith(' ');
  return (clone.textContent ?? '').replace(/\s+/gu, ' ').trim();
}

describe('US-INTAKE-01 AC2 · F-RENDER-09 · render allowlist `wizard-step-number`: the stepper', () => {
  test('US-INTAKE-01 AC2: one registered ordered list of exactly eight items, each titled as registered', () => {
    render(<Stepper current={3} done={[1, 2]} labels={LABELS} />);
    expect(document.querySelectorAll('[data-render-stepper]')).toHaveLength(1);
    expect(document.querySelector('[data-render-stepper]')?.tagName).toBe('OL');
    expect(items()).toHaveLength(8);
    expect(items().map(textBesideNumber)).toEqual([...STEP_TITLES]);
  });

  test('US-INTAKE-01 AC2: the current and upcoming steps show their number equal to their position; left steps show a check and no number', () => {
    render(<Stepper current={3} done={[1, 2]} labels={LABELS} />);
    const shown = items().map((item) => item.querySelector('[data-render-allow="wizard-step-number"]')?.textContent ?? null);
    expect(shown).toEqual([null, null, '3', '4', '5', '6', '7', '8']);
    expect(items()[0]?.querySelector('svg')).not.toBeNull();
    expect(items()[0]?.getAttribute('data-state')).toBe('done');
  });

  test('US-INTAKE-01 AC2: the current step is marked for assistive technology, and a left step is described as done, not by colour alone', () => {
    render(<Stepper current={3} done={[1, 2]} labels={LABELS} />);
    expect(items()[2]?.getAttribute('aria-current')).toBe('step');
    expect(items().filter((item) => item.hasAttribute('aria-current'))).toHaveLength(1);
    const describedBy = items()[0]?.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('TEST done');
    expect(screen.getByRole('navigation', { name: 'TEST steps' })).toBeTruthy();
  });

  test('G7-4 · US-INTAKE-01 AC7 · US-INTAKE-19 AC1: a left step with new findings gets a dot, described in words; the step on screen never does', () => {
    render(<Stepper current={6} done={[1, 2, 3, 4, 5]} dots={[3, 6]} labels={LABELS} />);
    const step3 = items()[2];
    expect(step3?.querySelector('.sov-stepper__dot')).not.toBeNull();
    const ids = (step3?.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(['TEST done', 'TEST new findings']);
    expect(items()[5]?.querySelector('.sov-stepper__dot')).toBeNull();
    expect(textBesideNumber(step3 as HTMLLIElement)).toBe('Building');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('R-008 "Until decided" · keyboard: no step is a link or a button, so the stepper adds no focus stop and opens nothing', () => {
    render(<Stepper current={4} done={[1, 2, 3]} dots={[2]} labels={LABELS} />);
    const nav = screen.getByRole('navigation');
    expect(nav.querySelectorAll('a, button, [tabindex]')).toHaveLength(0);
  });

  test('G2-1: the descriptions sit outside the list, so an item reads its number and title only, and hold no number', () => {
    render(<Stepper current={1} done={[]} dots={[]} labels={LABELS} />);
    const hidden = [...document.querySelectorAll('nav > span[hidden]')];
    expect(hidden.map((span) => span.textContent)).toEqual(['TEST done', 'TEST new findings']);
    for (const span of hidden) expect(/\p{N}/u.test(span.textContent ?? '')).toBe(false);
  });
});
