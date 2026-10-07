/**
 * G10-15 (new in phase 6; docs/guardrails.md section 7 at 1.12; T).
 * Situation: a Metrics page (Financial Overview, CAPEX, Payback) with every dataset gate closed.
 * Expected: each investment place shows the "Not available yet: …" line of the investment output that carries the stage,
 * naming what is missing, with no stage label and no reserved pricing term.
 * Follows from rule 10, "Stage 3 is derived, not passed" and "The price component. It reads the stage from stored
 * records"; rule 7, "'Not available yet' never appears alone. It names what is missing and offers the action"; 2.8,
 * "Status lines and stage labels"; G10-11, the reading of the stored proposal's head.
 *
 * View half (this file; phase 6's view-model builder): over a stored version generated with the production catalogue
 * and every gate closed (no figure can exist), each page's investment is the stored proposal's headline price, under
 * its own value id (G2-7): its figure is the "Not available yet" line of the output the head carries, naming the
 * SOVITECH datasets, with the owner's Add where an input is missing; `stageId` and `quotationRecordId` are null; no
 * display the page serves carries a stage label, and none holds a reserved term outside the places 2.8 allows. The API
 * half is in tests/api/metrics-routes.test.ts ("G10-15 (API half)"); the rendered half (the Price component with no
 * stage line on each page) is the web builder's, in the Metrics pages' component tests titled "G10-15".
 * Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import { servedDisplayOf, type DisplayObject, type Price } from '@sovitech/view-model/browser';
import { capexView, financialOverviewView, paybackView, proposalView } from '@sovitech/view-model/server';
import { allGatesClosed, displayById, PROJECT_ID, SNAPSHOT_ID, testProposalInput } from './_support/proposal';

const STAGE_LABELS = ['Indicative range', 'Preliminary investment estimate', 'Formal quotation'];

/** Every text an element may show of a display (the render contract's projection), for the reserved-term scan. */
function textsOf(display: DisplayObject): string[] {
  const served = servedDisplayOf(display);
  return [served.text, ...(served.lines ?? []), ...(served.parts ?? [])];
}

function checkInvestment(page: string, investment: { readonly output: string; readonly price: Price }, displays: readonly DisplayObject[]): void {
  // The stored proposal's own headline, the same value id: the line of the output that carries the stage.
  const stored = proposalView(testProposalInput());
  expect(investment, page).toEqual(stored.view.headline.investment);
  expect(investment.price.stageId, page).toBeNull();
  expect(investment.price.quotationRecordId, page).toBeNull();
  expect(investment.price.figure, page).toBe(`proposal:${SNAPSHOT_ID}.outputs.${investment.output}`);
  const figure = displayById(displays, investment.price.figure);
  expect(figure, page).toEqual(displayById(stored.displayObjects, investment.price.figure));
  expect(figure.shape, page).toBe('missing');
  expect(figure.missing, page).toBe('not_available_yet');
  expect(figure.text, page).toMatch(/^Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks/u);
  expect(figure.lines?.some((line) => line.kind === 'stage_label') ?? false, page).toBe(false);
  // No display of the page names a stage, and no reserved term appears where 2.8 does not allow one.
  for (const display of displays) {
    expect(display.lines?.some((line) => line.kind === 'stage_label') ?? false, display.valueId).toBe(false);
    for (const text of textsOf(display)) {
      for (const label of STAGE_LABELS) expect(text, display.valueId).not.toContain(label);
      expect(findReservedTerms(text).map((match) => match.term), `${page}: ${text}`).toEqual([]);
    }
    expect(display.quotationRecordId, display.valueId).toBeUndefined();
  }
}

describe('G10-15 · rule 10 · rule 7: with every dataset gate closed, a Metrics page\'s investment names what is missing and no stage', () => {
  test('G10-15 · R-088 · R-089 · R-096: Financial Overview, CAPEX and Payback show the stored proposal\'s line, no stage label, no reserved term', () => {
    const input = testProposalInput();
    expect(input.closedGates).toEqual(allGatesClosed());
    const page = { projectId: PROJECT_ID, header: input.header, proposal: input };
    const overview = financialOverviewView(page);
    const capex = capexView(page);
    const payback = paybackView(page);
    if (overview.view.state !== 'generated' || capex.view.state !== 'generated' || payback.view.state !== 'generated') throw new Error('a stored version is read');
    checkInvestment('Financial Overview', overview.view.investment, overview.displayObjects);
    checkInvestment('CAPEX', capex.view.investment, capex.displayObjects);
    checkInvestment('Payback', payback.view.investment, payback.displayObjects);
    // Rule 7: the line offers the owner's Add where a first-estimate input is missing.
    expect(displayById(overview.displayObjects, overview.view.investment.price.figure).actions?.map((action) => action.kind)).toContain('add');
  });
});
