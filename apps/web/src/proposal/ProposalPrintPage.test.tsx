import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProposalPrintResponseSchema, type ProposalPrintResponse } from '@sovitech/view-model/browser';
import { copy } from '../copy';
import { DEMO_LINE, installFakeApi, json, projectList, renderAt } from '../test/harness';
import { PRINT_IDS, PRINT_PROJECT, PRINT_SNAPSHOT, PRINT_TEXT, printResponse } from './print/print-fixture';
import { PRINT_PAGE_ATTRIBUTE, PRINT_READY_ATTRIBUTE } from './ProposalPrintPage';

const PATH = `/projects/${PRINT_PROJECT}/print/proposals/${PRINT_SNAPSHOT}`;
const API = `GET /api/projects/${PRINT_PROJECT}/proposals/${PRINT_SNAPSHOT}/print`;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function serve(response: ProposalPrintResponse) {
  // The fixture is a response the contract accepts, as the API's answerWith would send it.
  return installFakeApi({ [API]: () => json(200, ProposalPrintResponseSchema.parse(response)) });
}

const root = () => document.documentElement;

async function printed(): Promise<HTMLElement> {
  await waitFor(() => expect(root().getAttribute(PRINT_READY_ATTRIBUTE)).toBe('true'));
  const main = document.querySelector<HTMLElement>('main[data-proposal-print]');
  expect(main).not.toBeNull();
  return main as HTMLElement;
}

/** A printed section by its `data-print-section`. */
function section(main: HTMLElement, id: string): HTMLElement {
  const element = main.querySelector<HTMLElement>(`[data-print-section="${id}"]`);
  expect(element, id).not.toBeNull();
  return element as HTMLElement;
}

/** The text of the elements matching a selector, inside an element. */
function texts(root: ParentNode, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((element) => (element.textContent ?? '').trim());
}

/** The value element bound to a value id (the first, where the page shows it twice). */
function bound(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-value-id="${id}"]`);
  expect(element, id).not.toBeNull();
  return element as HTMLElement;
}

describe('R-118 · US-REPORTS-01 · US-REPORTS-03 · ADR 0050 decision 1: the print route of a stored proposal', () => {
  it('ADR 0050: while the print view loads, the page is light (data-print-page), shows "Loading" and no figure, and sets no ready marker', async () => {
    installFakeApi({ [API]: () => new Promise<Response>(() => undefined) });
    renderAt(PATH);
    await screen.findByRole('status');
    expect(root().hasAttribute(PRINT_PAGE_ATTRIBUTE)).toBe(true);
    expect(root().hasAttribute(PRINT_READY_ATTRIBUTE)).toBe(false);
    expect(document.querySelector('[data-value-id]')).toBeNull();
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
  });

  it('rule 10 · G10-13 (page half) · US-REVIEW-03: on the demo project the one demo line sits in the frame\'s header row, which the print repeats on every page', async () => {
    serve(printResponse({ demo: true }));
    renderAt(PATH);
    const main = await printed();
    const lines = within(main).getAllByText(PRINT_TEXT.demoLine);
    expect(lines).toHaveLength(1);
    const header = lines[0]?.closest('thead');
    expect(header?.closest('table')?.getAttribute('role')).toBe('presentation');
    expect(header?.closest('table')?.classList.contains('sov-print-frame')).toBe(true);
    // First in the page's order: read before the cover.
    expect(main.textContent?.indexOf(PRINT_TEXT.demoLine)).toBeLessThan(main.textContent?.indexOf('Preliminary proposal') ?? -1);
    expect(document.body.hasAttribute('data-render-ready')).toBe(true);
  });

  it('G10-10 · US-REVIEW-03 AC7: on any other project there is no demo line and no running header', async () => {
    serve(printResponse({ demo: false }));
    renderAt(PATH);
    const main = await printed();
    expect(within(main).queryByText(PRINT_TEXT.demoLine)).toBeNull();
    expect(main.querySelector('thead')).toBeNull();
  });

  it('R-118 · OD-2 · ADR 0050 decision 7: the cover names the proposal, the project (bound) and its generation date (bound), with no logo, image or typeset wordmark', async () => {
    serve(printResponse({ demo: true }));
    renderAt(PATH);
    const main = await printed();
    const cover = main.querySelector<HTMLElement>('[data-print-section="cover"]');
    expect(cover).not.toBeNull();
    expect(within(cover as HTMLElement).getByRole('heading', { level: 1, name: 'Preliminary proposal' })).toBeTruthy();
    expect(within(cover as HTMLElement).getByText(PRINT_TEXT.projectName).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(PRINT_IDS.projectName);
    expect(within(cover as HTMLElement).getByText(PRINT_TEXT.generatedOn).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(PRINT_IDS.generatedOn);
    expect(document.querySelector('img, svg image, canvas, picture')).toBeNull();
    expect(main.textContent).not.toContain('SOVITECH CONTROL');
    expect(main.textContent).not.toContain('CONFIDENTIAL');
  });

  it('DR-5 · DR-10 · R-118: the cover reads the title, the catalogue\'s subtitle, the project and "Generated on" with the served date and time, in that order', async () => {
    serve(printResponse({ demo: true }));
    renderAt(PATH);
    const main = await printed();
    const cover = section(main, 'cover');
    const order = [copy.proposal.title, copy.print.coverSubtitle, PRINT_TEXT.projectName, copy.proposal.generatedOn, PRINT_TEXT.generatedOn];
    const text = cover.textContent ?? '';
    const at = order.map((part) => text.indexOf(part));
    for (const [index, position] of at.entries()) expect(position, order[index]).toBeGreaterThanOrEqual(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(cover.querySelector('.sov-print__subtitle')?.textContent).toBe(copy.print.coverSubtitle);
    // The date as served (D MMM YYYY, HH:MM), bound; the page adds no date of its own.
    expect(bound(PRINT_IDS.generatedOn).textContent).toBe(PRINT_TEXT.generatedOn);
  });

  it('G10-5 (page half) · 2.8 "Prominence": each badge sits on its figure\'s line, and the range, its source line and its method lines print inline with it', async () => {
    serve(printResponse());
    renderAt(PATH);
    await printed();
    for (const id of [PRINT_IDS.capexPreliminary, PRINT_IDS.pointsHardware, PRINT_IDS.area]) {
      const element = bound(id);
      const lineOfFigure = element.querySelector('.sov-value__line');
      expect(lineOfFigure?.querySelector('.sov-value__text'), id).not.toBeNull();
      expect(lineOfFigure?.querySelector('[data-copy-kind="badge"]'), id).not.toBeNull();
    }
    const capex = bound(PRINT_IDS.capexPreliminary);
    expect(capex.textContent).toContain(PRINT_TEXT.capexRange);
    expect(capex.textContent).toContain(PRINT_TEXT.estimatedBadge);
    expect(capex.textContent).toContain(PRINT_TEXT.capexSource);
    expect(capex.textContent).toContain(PRINT_TEXT.capexMethod);
    expect(capex.textContent).toContain(PRINT_TEXT.stageLabel);
    expect(bound(PRINT_IDS.pointsHardware).textContent).toContain(PRINT_TEXT.pointsProvisional);
  });

  it('rule 10 · R-127 · G10-1: the investment figure prints through the Price component with the stage the server served; an output with no figure names no stage', async () => {
    serve(printResponse());
    renderAt(PATH);
    await printed();
    const price = bound(PRINT_IDS.capexPreliminary).closest('.sov-price');
    expect(price?.querySelector('.sov-price__stage')?.textContent).toBe(PRINT_TEXT.stageLabel);
    const missing = bound(PRINT_IDS.capexIndicative);
    expect(missing.textContent).toBe(PRINT_TEXT.capexMissing);
    expect(missing.closest('.sov-price')?.querySelector('.sov-price__stage')).toBeNull();
  });

  it('rule 1 · rule 7: every output with no figure reads its "Not available yet" line naming what is missing, never 0, a dash or a blank', async () => {
    serve(printResponse());
    renderAt(PATH);
    await printed();
    for (const id of [PRINT_IDS.pointsIntegration, PRINT_IDS.energy, PRINT_IDS.savings, PRINT_IDS.measures, PRINT_IDS.operatingCost, PRINT_IDS.payback, PRINT_IDS.npv, PRINT_IDS.irr]) {
      const text = bound(id).textContent ?? '';
      expect(text.startsWith('Not available yet: TEST '), id).toBe(true);
    }
    for (const value of document.querySelectorAll('[data-value-id]')) {
      const text = (value.textContent ?? '').trim();
      expect(text, value.getAttribute('data-value-id') ?? '').not.toBe('');
      expect(['0', '-', '–', '—']).not.toContain(text);
    }
  });

  it('rule 2 · G2-7: every value element is bound to a display object the API served, and every value the view names is printed', async () => {
    const response = printResponse({ demo: true, stillReading: true, drafted: true });
    serve(response);
    renderAt(PATH);
    await printed();
    const served = new Set(response.displayObjects.map((display) => display.valueId));
    const shown = new Set([...document.querySelectorAll('[data-value-id]')].map((element) => element.getAttribute('data-value-id') ?? ''));
    for (const id of shown) expect(served.has(id), id).toBe(true);
    const named = [
      ...response.view.appendix.values,
      ...response.view.proposal.basis,
      PRINT_IDS.stillReading,
      PRINT_IDS.interfacePoints,
      PRINT_IDS.fireSentence,
      PRINT_IDS.ownerCount,
      PRINT_IDS.ownerItem,
      PRINT_IDS.engineerLine,
      PRINT_IDS.exclusion,
      PRINT_IDS.projectName,
      PRINT_IDS.generatedOn,
    ];
    for (const id of named) expect(shown.has(id), id).toBe(true);
  });

  it('ADR 0050 decision 1: a printed page has no action: no button, link, input or select, and no "Add" from any value', async () => {
    serve(printResponse({ demo: true, drafted: true, stillReading: true }));
    renderAt(PATH);
    const main = await printed();
    expect(main.querySelectorAll('button, a, input, select, textarea, details, summary')).toHaveLength(0);
  });

  it('2.8 "Prominence" · G10-5 · G13-12 (page half): the appendix starts a new page and lists every value with its source, badge and method, its excerpts in full as stored ("[erased]" after erasure)', async () => {
    const response = printResponse();
    serve(response);
    renderAt(PATH);
    const main = await printed();
    const appendix = main.querySelector<HTMLElement>('.sov-print__appendix');
    expect(appendix).not.toBeNull();
    const values = (appendix as HTMLElement).querySelector('[data-print-section="appendix"]');
    for (const id of response.view.appendix.values) expect(values?.querySelector(`[data-value-id="${id}"]`), id).not.toBeNull();
    const area = values?.querySelector(`[data-value-id="${PRINT_IDS.area}"]`);
    expect(area?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe(PRINT_TEXT.documentBadge);
    expect(area?.querySelector('.sov-value__source')?.textContent).toBe('TEST found in TEST-plan.pdf, page 1');
    expect(values?.querySelector(`[data-value-id="${PRINT_IDS.capexPreliminary}"]`)?.textContent).toContain(PRINT_TEXT.capexMethod);
    const excerpts = [...(values?.querySelectorAll<HTMLElement>('blockquote[data-copy-kind="evidence-excerpt"]') ?? [])];
    expect(excerpts.map((excerpt) => excerpt.textContent)).toEqual([PRINT_TEXT.excerptKept, PRINT_TEXT.erased]);
    for (const excerpt of excerpts) {
      expect(excerpt.getAttribute('data-document-id')).not.toBeNull();
      expect(excerpt.getAttribute('data-content-hash')).toMatch(/^[0-9a-f]{64}$/u);
      expect(excerpt.closest('details')).toBeNull();
    }
  });

  it('rule 7 "In the proposal document. Open items appear once" · 2.8: "What we still need" is one section, in the appendix, with the owner\'s items and SOVITECH\'s, and the headline does not repeat them', async () => {
    serve(printResponse());
    renderAt(PATH);
    const main = await printed();
    expect(within(main).getAllByRole('heading', { name: 'What we still need' })).toHaveLength(1);
    const section = main.querySelector<HTMLElement>('[data-print-section="open-items"]');
    expect(section?.closest('.sov-print__appendix')).not.toBeNull();
    expect(main.querySelectorAll(`[data-value-id="${PRINT_IDS.ownerCount}"]`)).toHaveLength(1);
    expect(main.querySelectorAll(`[data-value-id="${PRINT_IDS.engineerLine}"]`)).toHaveLength(1);
    expect(within(section as HTMLElement).getByText(PRINT_TEXT.engineerLine)).toBeTruthy();
    expect(within(section as HTMLElement).getByText('Your estimate needs this')).toBeTruthy();
    expect(main.querySelector('[data-print-section="headline"]')?.querySelector(`[data-value-id="${PRINT_IDS.ownerCount}"]`)).toBeNull();
  });

  it('rule 11 · R-112 · R-113 · G11-12 (page half): Fire Safety prints its monitoring-only sentence on its scope row, and the interface points are named in the control points, with no figure', async () => {
    serve(printResponse());
    renderAt(PATH);
    const main = await printed();
    const points = section(main, 'points');
    expect(points.querySelector(`[data-value-id="${PRINT_IDS.interfacePoints}"]`)?.textContent).toBe(PRINT_TEXT.interfacePoints);
    expect(points.querySelector('[data-interface-points]')?.textContent).not.toMatch(/\p{N}/u);
    const scope = section(main, 'scope');
    expect(scope.querySelector('[data-system="fire_safety"]')?.textContent).toContain(PRINT_TEXT.fireSentence);
    expect(within(scope).getByText('Fire Safety')).toBeTruthy();
    expect(within(scope).getByText('Water')).toBeTruthy();
  });

  it('DR-3 · G2-7 · rule 11: each rule 11 sentence prints once, as the stored proposal shows it, and the life-safety section is left out when every one printed elsewhere', async () => {
    const response = printResponse();
    // The view lists both sentences among the life-safety values, as the view-model builds them.
    expect(response.view.proposal.lifeSafety).toEqual([PRINT_IDS.fireSentence, PRINT_IDS.interfacePoints]);
    serve(response);
    renderAt(PATH);
    const main = await printed();
    expect(main.querySelectorAll(`[data-value-id="${PRINT_IDS.interfacePoints}"]`)).toHaveLength(1);
    expect(main.querySelectorAll(`[data-value-id="${PRINT_IDS.fireSentence}"]`)).toHaveLength(1);
    expect(within(main).getAllByText(PRINT_TEXT.interfacePoints)).toHaveLength(1);
    expect(within(main).getAllByText(PRINT_TEXT.fireSentence)).toHaveLength(1);
    expect(main.querySelector('[data-print-section="life-safety"]')).toBeNull();
    expect(within(main).queryByRole('heading', { name: copy.proposal.sections.lifeSafety })).toBeNull();
  });

  it('DR-3 · rule 11: a life-safety value no other section printed keeps the life-safety section, and is printed there once', async () => {
    const response = printResponse();
    const other = `proposal:${PRINT_SNAPSHOT}.lifeSafety.TEST_other`;
    const text = 'TEST other life-safety line';
    const shaped: typeof response = {
      ...response,
      displayObjects: [...response.displayObjects, { valueId: other, kind: 'line', text, shape: 'value', lines: [{ id: 'TEST_other', kind: 'rule_line', text }] }],
      view: { ...response.view, proposal: { ...response.view.proposal, lifeSafety: [...response.view.proposal.lifeSafety, other] } },
    };
    serve(shaped);
    renderAt(PATH);
    const main = await printed();
    const lifeSafety = section(main, 'life-safety');
    expect(texts(lifeSafety, '[data-value-id]')).toEqual([text]);
    expect(main.querySelectorAll(`[data-value-id="${PRINT_IDS.interfacePoints}"]`)).toHaveLength(1);
  });

  it('DR-2 · G10-7 (page half) · rule 8: the systems not in scope are listed once among the exclusions, under "Not in scope" in the investment, each named by its system; the systems in scope print no second list', async () => {
    serve(printResponse());
    renderAt(PATH);
    const main = await printed();
    const headings = within(main).getAllByRole('heading', { name: copy.proposal.sections.exclusions });
    expect(headings).toHaveLength(1);
    const investment = section(main, 'investment');
    expect(headings[0]?.closest('[data-print-section]')).toBe(investment);
    const listed = investment.querySelector<HTMLElement>('[data-print-exclusions]');
    expect(listed).not.toBeNull();
    const rows = [...(listed as HTMLElement).querySelectorAll<HTMLElement>('li')];
    expect(rows.map((row) => row.getAttribute('data-excluded'))).toEqual(['water']);
    // Named by its system, as the stored proposal names it; the value is the decision as used, with its badge.
    expect(texts(rows[0] as HTMLElement, '.sov-print__name')).toEqual(['Water']);
    expect(rows[0]?.querySelectorAll(`[data-value-id="${PRINT_IDS.exclusion}"]`)).toHaveLength(1);
    expect(rows[0]?.textContent).not.toContain(PRINT_TEXT.scopeWaterName);
    expect(bound(PRINT_IDS.exclusion).querySelector('[data-copy-kind="badge"]')?.textContent).toBe(PRINT_TEXT.providedBadge);
    // Once among the exclusions: the investment lists it once, and the scope section holds no "Not in scope" list.
    expect(investment.querySelectorAll(`[data-value-id="${PRINT_IDS.exclusion}"]`)).toHaveLength(1);
    const scope = section(main, 'scope');
    expect(within(scope).queryByRole('heading', { name: copy.proposal.sections.exclusions })).toBeNull();
    expect(scope.querySelectorAll('[data-system="water"]')).toHaveLength(1);
    expect(within(scope).getByRole('heading', { level: 2 }).textContent).toBe(copy.proposal.sections.scope);
  });

  it('DR-12 · G2-7 · rule 8: what the estimate is based on prints as a compact two-column table, each value named the same way as in the appendix, its badge on its figure\'s line', async () => {
    const response = printResponse();
    serve(response);
    renderAt(PATH);
    const main = await printed();
    const basis = section(main, 'basis');
    const rows = [...basis.querySelectorAll<HTMLElement>('.sov-print__table > .sov-print__table-row')];
    expect(rows).toHaveLength(response.view.proposal.basis.length);
    const appendix = section(main, 'appendix');
    const nameIn = (root: HTMLElement, id: string): string | undefined => {
      const row = root.querySelector(`[data-value-id="${id}"]`)?.closest('li');
      return row?.querySelector('.sov-print__name')?.textContent ?? undefined;
    };
    for (const [index, id] of response.view.proposal.basis.entries()) {
      const row = rows[index] as HTMLElement;
      // Two columns: the name, then the value element (the name outside it, the badge on its figure's line).
      expect(row.children, id).toHaveLength(2);
      expect(row.children[0]?.classList.contains('sov-print__name'), id).toBe(true);
      const value = row.children[1]?.querySelector(`[data-value-id="${id}"]`);
      expect(value, id).not.toBeNull();
      expect(value?.querySelector('.sov-value__line [data-copy-kind="badge"]'), id).not.toBeNull();
      // One name per value: the body and the appendix name it alike (what it measures, as served).
      expect(nameIn(appendix, id), id).toBe(nameIn(basis, id));
      expect(nameIn(basis, id), id).toBeTruthy();
    }
    expect(nameIn(basis, PRINT_IDS.scopeHvac)).toBe(PRINT_TEXT.scopeHvacName);
    expect(nameIn(appendix, PRINT_IDS.scopeWater)).toBe(PRINT_TEXT.scopeWaterName);
    // The outputs and indicators are named alike too: the body's row names are the appendix's.
    for (const id of [PRINT_IDS.pointsHardware, PRINT_IDS.energy, PRINT_IDS.payback]) {
      const body = bound(id).closest('.sov-print__row')?.querySelector('.sov-print__name')?.textContent;
      expect(nameIn(appendix, id), id).toBe(body);
    }
    expect(basis.querySelector('.sov-print__lead')?.textContent).toBe(copy.proposal.basisIntro);
  });

  it('DR-12 · rule 7: with no input the basis says so in the catalogue\'s words, never an empty section', async () => {
    const response = printResponse();
    serve({ ...response, view: { ...response.view, proposal: { ...response.view.proposal, basis: [] } } });
    renderAt(PATH);
    const main = await printed();
    expect(section(main, 'basis').textContent).toContain(copy.proposal.basisNone);
  });

  it('V-1 (print half) · rule 1 · rule 10: when the headline total is incomplete, the printed head shows its "Incomplete" line with its stage label and no figure', async () => {
    serve(printResponse({ incompleteHeadline: true }));
    renderAt(PATH);
    const main = await printed();
    const head = section(main, 'headline');
    expect(head.querySelector(`[data-value-id="${PRINT_IDS.headlineIncomplete}"]`)?.textContent).toContain(PRINT_TEXT.incompleteLine);
    expect(head.querySelector('.sov-price__stage')?.textContent).toBe(PRINT_TEXT.stageLabel);
    expect(head.querySelector(`[data-value-id="${PRINT_IDS.capexPreliminary}"]`)).toBeNull();
    expect(head.querySelector('.sov-value__figure')).toBeNull();
    expect(head.textContent).not.toContain(PRINT_TEXT.capexRange);
    expect(head.textContent).not.toMatch(/\p{N}/u);
    // The incomplete total itself prints in the investment, its "Incomplete" line with it (rule 1: the same prominence).
    const capex = bound(PRINT_IDS.capexPreliminary);
    expect(capex.closest('[data-print-section]')?.getAttribute('data-print-section')).toBe('investment');
    expect(capex.textContent).toContain(PRINT_TEXT.capexRange);
    expect(capex.textContent).toContain(PRINT_TEXT.incompleteLine);
  });

  it('rule 7: "Still reading <n> files…" prints bound in the headline while analysis runs', async () => {
    serve(printResponse({ stillReading: true }));
    renderAt(PATH);
    const main = await printed();
    expect(main.querySelector('[data-print-section="headline"]')?.querySelector(`[data-value-id="${PRINT_IDS.stillReading}"]`)?.textContent).toBe(PRINT_TEXT.stillReading);
  });

  it('R-115 · rule 2: an AI-drafted paragraph prints its prose and each value token as the value itself, bound', async () => {
    serve(printResponse({ drafted: true }));
    renderAt(PATH);
    const main = await printed();
    const drafted = main.querySelector<HTMLElement>('[data-print-section="drafted"]');
    expect(drafted?.textContent).toContain(PRINT_TEXT.draftedProse.trim());
    expect(drafted?.querySelector(`[data-value-id="${PRINT_IDS.area}"]`)?.textContent).toContain(PRINT_TEXT.areaText);
  });

  it('US-PROPOSAL-11 AC3: an earlier version says it is kept as it was generated', async () => {
    serve(printResponse({ latest: false }));
    renderAt(PATH);
    const main = await printed();
    expect(within(main).getByText('This is an earlier version of your preliminary proposal, kept as it was generated.')).toBeTruthy();
  });

  it('ADR 0050 · rule 7: a print view that cannot be loaded sets the refusal marker, says the document could not be prepared and offers "Try again"', async () => {
    installFakeApi({ [API]: () => json(500, { code: 'internal_error' }) });
    renderAt(PATH);
    await waitFor(() => expect(root().getAttribute(PRINT_READY_ATTRIBUTE)).toBe('failed'));
    expect(screen.getByText('This document could not be prepared.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(document.querySelector('[data-value-id]')).toBeNull();
  });

  it('rule 10 · G10-12\'s reading: on the demo project the loading and failed states carry the demo line the project list serves', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PRINT_PROJECT, name: 'TEST project', demo: true }])),
      [API]: () => json(500, { code: 'internal_error' }),
    });
    renderAt(PATH);
    await waitFor(() => expect(root().getAttribute(PRINT_READY_ATTRIBUTE)).toBe('failed'));
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    expect(screen.getByText(DEMO_LINE.text).closest('thead')).not.toBeNull();
  });

  it('ADR 0050: an id that is not one shows "Page not found" with the refusal marker, outside the print scope', async () => {
    installFakeApi({});
    renderAt(`/projects/${PRINT_PROJECT}/print/proposals/not-a-snapshot`);
    await waitFor(() => expect(root().getAttribute(PRINT_READY_ATTRIBUTE)).toBe('failed'));
    expect(root().hasAttribute(PRINT_PAGE_ATTRIBUTE)).toBe(false);
  });

  it('ADR 0050: leaving the print route takes the light scope and the marker with it', async () => {
    serve(printResponse());
    const { unmount } = renderAt(PATH);
    await printed();
    unmount();
    expect(root().hasAttribute(PRINT_PAGE_ATTRIBUTE)).toBe(false);
    expect(root().hasAttribute(PRINT_READY_ATTRIBUTE)).toBe(false);
  });
});
