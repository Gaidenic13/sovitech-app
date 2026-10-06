// @vitest-environment happy-dom
/**
 * G7-21 (new in phase 5 part B, written by the integrator from finding DR-1 of part B's design review; rule 7,
 * "'Not available yet' never appears alone. It names what is missing and offers the action."; PRD R-012).
 * Situation: a stored proposal's output reads "Not available yet", naming more than one owner input it waits for (a new
 * project with nothing answered: its Indicative range names the building type, the gross floor area and the systems in
 * scope).
 * Expected: every Add action served with the line is on screen beside it, in the order served.
 *
 * What went wrong (DR-1): the kit's `NotAvailableYet` and `Price` took the first served Add only (`.find`), so on a new
 * project the Indicative range named three inputs with "Add gross floor area" alone, and the building type had no Add
 * anywhere on the stored proposal (step 8's preview had the same gap).
 *
 * How: the stored proposal as the API builds it (`proposalView` of `@sovitech/view-model/server` over the TEST project of
 * tests/guardrails/_support/proposal.ts: the production registry and catalogue, every gate closed, nothing answered),
 * each output's served display rendered by the kit's components the stored proposal page draws it with (`Price` for an
 * investment output, `NotAvailableYet` for the others), in Vitest's happy-dom environment. The page's own wiring (each
 * Add opening step 8's inline ask, described by its output's name) is apps/web/src/proposal/ProposalPage.test.tsx
 * "DR-1 …", and step 8's apps/web/src/steps/step-8/Step8.test.tsx "phase 5 DR-1 …". Every value is TEST data.
 */
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { NotAvailableYet, Price } from '@sovitech/ui/components';
import type { Action, DisplayObject } from '@sovitech/view-model/browser';
import { proposalView } from '@sovitech/view-model/server';
import { displayById, testProposalInput } from './_support/proposal';

type AddAction = Extract<Action, { kind: 'add' }>;

afterEach(() => {
  cleanup();
});

/** The `add` actions a display was served with, in the order served. */
function addsOf(display: DisplayObject): AddAction[] {
  return (display.actions ?? []).filter((action): action is AddAction => action.kind === 'add');
}

/** Renders a served display as the stored proposal draws it, and answers its drawn Add buttons and what pressing each sent. */
function drawn(display: DisplayObject, investment: boolean): { readonly names: string[]; readonly pressed: AddAction[] } {
  const pressed: AddAction[] = [];
  const onAdd = (action: AddAction): void => {
    pressed.push(action);
  };
  const { container } = render(investment ? <Price display={display} label="TEST investment output" onAdd={onAdd} /> : <NotAvailableYet display={display} onAdd={onAdd} />);
  const bound = container.querySelector(`[data-value-id="${display.valueId}"]`);
  if (!(bound instanceof HTMLElement)) throw new Error(`${display.valueId} is not drawn bound to its value id`);
  const buttons = within(bound).queryAllByRole('button');
  for (const button of buttons) fireEvent.click(button);
  return { names: buttons.map((button) => button.textContent ?? ''), pressed };
}

describe('G7-21 · rule 7 ("names what is missing and offers the action") · R-012 · DR-1', () => {
  const built = proposalView(testProposalInput());
  const investment = new Set(built.view.investment.outputs.map((output) => output.display));

  test('G7-21: the Indicative range of a new project with nothing answered names three owner inputs, and each one\'s served Add is drawn beside the line, in the order served', () => {
    const output = built.view.investment.outputs.find((entry) => entry.output === 'capex.indicativeRange');
    if (output === undefined) throw new Error('the stored proposal serves no Indicative range');
    const display = displayById(built.displayObjects, output.display);
    expect(display.missing).toBe('not_available_yet');
    const adds = addsOf(display);
    // The situation: more than one owner input named, each with its own Add served.
    expect(adds).toHaveLength(3);
    expect(new Set(adds.map((action) => action.field.fieldKey)).size).toBe(3);
    const { names, pressed } = drawn(display, true);
    expect(names).toEqual(adds.map((action) => action.label));
    expect(pressed).toEqual(adds);
  });

  test('G7-21: every output of the stored proposal served with Add actions draws each of them beside its line, in the order served', () => {
    const served = built.displayObjects.filter((display) => display.missing === 'not_available_yet' && addsOf(display).length > 0);
    // More than the Indicative range: the other investment output, the energy outputs and the measures' order.
    expect(served.length).toBeGreaterThan(1);
    for (const display of served) {
      const adds = addsOf(display);
      const { names, pressed } = drawn(display, investment.has(display.valueId));
      expect(names, display.valueId).toEqual(adds.map((action) => action.label));
      expect(pressed, display.valueId).toEqual(adds);
      cleanup();
    }
  });
});
