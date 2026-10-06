import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProposalResponseSchema } from '@sovitech/view-model/browser';
import { routes } from '../routes';
import { AS_OF, PROJECT, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler } from '../test/harness';
import { frameResponse } from '../workspace/test-views';
import { AREA_BOX, CAPEX_LABEL, CAPEX_LABEL_TEXT, CAPEX_LINE, STILL_READING, proposalView, step8View } from '../steps/step-8/step8-fixture';
import { resetGenerations } from './generation';
import {
  EARLIER,
  ENGINEER_TEXT,
  INCOMPLETE_TEXT,
  INTERFACE_POINTS_TEXT,
  OWNER_COUNT_TEXT,
  POINTS_MISSING,
  RANGE_TEXT,
  SNAPSHOT,
  STAGE_1,
  STAGE_1_MISSING,
  STAGE_1_MISSING_INPUTS,
  STAGE_2,
  STAGE_2_MISSING,
  STILL_READING_TEXT,
  SUPERSEDED_TEXT,
  proposalResponse,
  versionsResponse,
  type ProposalOptions,
} from './test-proposal';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetGenerations();
});

const P = `/api/projects/${PROJECT}`;
/** Words a price must never carry without a stored quotation record (rule 10; G10-1; the reserved pricing terms). */
const RESERVED_PRICING = /\b(quote|quotation|offer|ofert[aă]|deviz)\b/iu;

interface ApiOptions {
  readonly demo?: boolean;
  readonly versions?: readonly string[];
  readonly proposal?: ProposalOptions;
}

function api(extra: Readonly<Record<string, Handler>> = {}, options: ApiOptions = {}) {
  const demo = options.demo === true;
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo }])),
    [`GET ${P}/workspace`]: () => json(200, frameResponse(PROJECT, { demo })),
    [`GET ${P}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    [`GET ${P}/steps/8`]: () => json(200, step8View({ demo })),
    [`POST ${P}/fields/skip`]: () => json(200, { displayObjects: [] }),
    [`POST ${P}/steps/8/continue`]: () => json(200, { nextStep: 'proposal', displayObjects: [] }),
    [`GET ${P}/proposals`]: () => json(200, versionsResponse(options.versions ?? [SNAPSHOT], demo)),
    [`GET ${P}/proposals/${SNAPSHOT}`]: () => json(200, proposalResponse({ demo, ...options.proposal })),
    [`GET ${P}/proposal`]: () => json(200, proposalView(demo)),
    ...extra,
  });
}

async function ready() {
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
}

/** Waits until a stored proposal's head is on screen (its stage 2 line shows twice: the head and the investment section, one value id). */
async function headShown(): Promise<HTMLElement> {
  return waitFor(() => {
    const head = document.querySelector('[data-proposal-head]');
    if (!(head instanceof HTMLElement)) throw new Error('no stored proposal on screen yet');
    return head;
  });
}

/** The order of the writes a press sent: the skips, step 8's Continue, then Generate. */
function writes(seen: ReturnType<typeof installFakeApi>): string[] {
  return seen.filter((request) => request.method === 'POST').map((request) => request.path.replace(P, ''));
}

describe('R-109 · US-PROPOSAL-01 · US-PROPOSAL-02 · UD-07 · UD-47 · docs/adr/0048 decision 1: Generate, from the press to the stored proposal', () => {
  it('R-109 · US-PROPOSAL-02 AC1 AC3 · UD-07 · G3-23 (web half) · G2-8: Generate skips the open asks once, sends step 8\'s Continue, then one POST with an empty body; while it is on its way the landing shows the generating state (no figure, a bar with no number); then the stored proposal with its head', async () => {
    const held = heldHandler(() => json(201, { snapshotId: SNAPSHOT }));
    const seen = api({ [`POST ${P}/proposals`]: held.handler });
    const view = renderAt(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    await screen.findByRole('heading', { name: 'Preparing your preliminary proposal', level: 1 });
    await waitFor(() => expect(sentTo(seen, 'POST', '/proposals')).toBe(1));
    expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/proposal`);
    // The skips first, then step 8's Continue, then the one POST (it writes no answer: its body names nothing).
    const sent = writes(seen);
    expect(sent.at(-1)).toBe('/proposals');
    expect(sent.at(-2)).toBe('/steps/8/continue');
    expect(sent.slice(0, -2).every((path) => path === '/fields/skip')).toBe(true);
    expect(seen.find((request) => request.method === 'POST' && request.path === `${P}/proposals`)?.body).toEqual({});
    // UD-07: a bar with no number, no figure, no value of the proposal, nothing modal; the screen is ready to be read.
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(document.querySelector('[data-value-id^="proposal:"]')).toBeNull();
    expect(document.querySelector('[role="dialog"], dialog')).toBeNull();
    await ready();
    held.answer();
    await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
    await headShown();
    expect(sentTo(seen, 'GET', `/proposals/${SNAPSHOT}`)).toBe(1);
    expect(sentTo(seen, 'POST', '/proposals')).toBe(1);
  });

  it('US-PROPOSAL-02 AC1 · rule 7 · G7-18 (web half, generating state): a press while documents are being read shows step 8\'s "Still reading" line on the generating state, bound, and opens no dialog', async () => {
    const held = heldHandler(() => json(201, { snapshotId: SNAPSHOT }));
    api({ [`POST ${P}/proposals`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    await screen.findByRole('heading', { name: 'Preparing your preliminary proposal', level: 1 });
    expect(screen.getByText('TEST still reading line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(STILL_READING);
    expect(document.querySelector('[role="dialog"], dialog')).toBeNull();
    held.answer();
    await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
  });

  it('R-109 · ADR 0048 decision 1 · use-in-flight: two presses of Generate before React renders again send one Continue and one POST', async () => {
    const held = heldHandler(() => json(201, { snapshotId: SNAPSHOT }));
    const seen = api({ [`POST ${P}/proposals`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    pressTwice(screen.getByRole('button', { name: 'Generate Proposal' }));
    await screen.findByRole('heading', { name: 'Preparing your preliminary proposal', level: 1 });
    await settle();
    expect(sentTo(seen, 'POST', '/steps/8/continue')).toBe(1);
    expect(sentTo(seen, 'POST', '/proposals')).toBe(1);
    held.answer();
    await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
  });

  it('US-PROPOSAL-11 AC1 · 2.4 · G4-45 (web half): opening, reloading or remounting the landing (React StrictMode runs its effects twice) never sends Generate; it shows the latest stored version', async () => {
    const seen = api({ [`POST ${P}/proposals`]: () => json(201, { snapshotId: SNAPSHOT }) }, { versions: [SNAPSHOT, EARLIER] });
    const router = createMemoryRouter(routes, { initialEntries: [`/projects/${PROJECT}/proposal`] });
    render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
    await headShown();
    await ready();
    expect(sentTo(seen, 'POST', '/proposals')).toBe(0);
    expect(sentTo(seen, 'GET', `/proposals/${SNAPSHOT}`)).toBeGreaterThan(0);
    expect(sentTo(seen, 'GET', `/proposals/${EARLIER}`)).toBe(0);
    cleanup();
    // A second page session (a reload) on the same path: still no POST.
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    await settle();
    expect(sentTo(seen, 'POST', '/proposals')).toBe(0);
  });

  it('UD-47 · US-PROPOSAL-02 AC4 · rule 7: a refused Generate shows the failed state (answers and uploads kept), "Try again" sends one new POST per press, and "Back to review" opens step 8', async () => {
    let calls = 0;
    const seen = api({
      [`POST ${P}/proposals`]: () => {
        calls += 1;
        return calls === 1 ? json(500, { code: 'internal_error' }) : json(201, { snapshotId: SNAPSHOT });
      },
    });
    const view = renderAt(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Your preliminary proposal could not be generated. Your answers and uploads are kept. Try again, or go back to the review.');
    expect(document.querySelector('[data-value-id^="proposal:"]')).toBeNull();
    await ready();
    pressTwice(within(alert).getByRole('button', { name: 'Try again' }));
    await headShown();
    expect(sentTo(seen, 'POST', '/proposals')).toBe(2);
    // The failure is over once a new press stored a proposal; "Back to review" from the failed state opens step 8.
    calls = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
  });

  it('US-INTAKE-16 AC5 · rule 7: when step 8\'s Continue is refused, no Generate is sent and step 8 says so, with Generate still enabled', async () => {
    const seen = api({ [`POST ${P}/steps/8/continue`]: () => json(500, { code: 'internal_error' }) });
    renderAt(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    await screen.findByText('The proposal could not be opened. Your answers are kept. Try again.');
    await settle();
    expect(sentTo(seen, 'POST', '/proposals')).toBe(0);
    expect(screen.getByRole('button', { name: 'Generate Proposal' }).hasAttribute('disabled')).toBe(false);
  });

  it('G10-10 · GS-1 (web side): the demo line shows on the generating state, the failed state and the stored proposal of the demo project', async () => {
    const held = heldHandler(() => json(201, { snapshotId: SNAPSHOT }));
    api({ [`POST ${P}/proposals`]: held.handler }, { demo: true });
    renderAt(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    await screen.findByRole('heading', { name: 'Preparing your preliminary proposal', level: 1 });
    expect(screen.getByText('TEST demo line')).toBeTruthy();
    held.answer();
    await headShown();
    expect(screen.getByText('TEST demo line')).toBeTruthy();
  });
});

describe('R-111 · R-116 "Until decided" · UD-06 · UD-01\'s content · docs/adr/0048 decision 9: the landing', () => {
  it('prompt 3 5.2 "Generate before phase 5" · R-012: with no proposal stored, the landing says none was generated, names what each output still needs (bound), and leads to the review; an owner input\'s "Add" opens step 8 at its inline ask', async () => {
    const seen = api({}, { versions: [] });
    const view = renderAt(`/projects/${PROJECT}/proposal`);
    await screen.findByText('No preliminary proposal has been generated for this project yet.');
    await ready();
    expect(screen.getByText(CAPEX_LABEL_TEXT).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_LABEL);
    expect(screen.getByText('TEST not available: a dataset and the area').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_LINE);
    expect(sentTo(seen, 'POST', '/proposals')).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'TEST add the area' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    const input = await screen.findByRole('textbox', { name: AREA_BOX });
    await waitFor(() => expect(document.activeElement).toBe(input));
    cleanup();
    resetGenerations();
    const again = renderAt(`/projects/${PROJECT}/proposal`);
    fireEvent.click(await screen.findByRole('button', { name: 'Go to the review' }));
    await waitFor(() => expect(again.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
  });

  it('UD-06 · DR-7: the stored proposal is titled a preliminary proposal in the workspace page layout, in the frame with the sidebar, the "Proposal" page marked current', async () => {
    api();
    renderAt(`/projects/${PROJECT}/proposal`);
    const title = await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
    expect(title.classList.contains('sov-page-header__title')).toBe(true);
    const nav = screen.getByRole('navigation', { name: 'Project pages' });
    expect(within(nav).getByRole('link', { name: 'Proposal' }).getAttribute('aria-current')).toBe('page');
    const back = screen.getByRole('button', { name: 'Back to review' });
    expect(back.getAttribute('data-variant')).toBe('secondary');
  });

  it('UD-47 (load) · R-003: a stored proposal that cannot be loaded says so, offers "Try again", shows no value, and keeps "Back to review"', async () => {
    let calls = 0;
    api({
      [`GET ${P}/proposals/${SNAPSHOT}`]: () => {
        calls += 1;
        return calls === 1 ? json(500, { code: 'internal_error' }) : json(200, proposalResponse());
      },
    });
    renderAt(`/projects/${PROJECT}/proposal`);
    await screen.findByText('Your preliminary proposal could not be loaded. Your answers are kept. Try again, or go back to the review.');
    expect(document.querySelector('[data-value-id^="proposal:"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Back to review' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await headShown();
  });
});

describe('UD-06 · R-110 to R-113 · R-127 · rules 7, 10, 11: the stored proposal\'s sections', () => {
  it('the TEST fixture is a response the contract accepts', () => {
    for (const figure of ['none', 'range', 'superseded', 'formal'] as const) expect(() => ProposalResponseSchema.parse(proposalResponse({ figure, stage3Text: 'Formal quotation', stillReading: true, drafted: true, stageNames: true }))).not.toThrow();
  });

  it('G10-11 (web half, the stored proposal) · G10-1 (live half) · R-112: with every dataset gate closed, the head names no stage and shows the stage 2 output\'s "Not available yet" line, bound, with its Add action; no stage wording appears; no reserved pricing term', async () => {
    api();
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    await ready();
    const head = document.querySelector('[data-proposal-head]') as HTMLElement;
    expect(head.textContent).not.toContain(STAGE_2);
    expect(head.textContent).not.toContain(STAGE_1);
    expect(within(head).getByText(STAGE_2_MISSING).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate`);
    expect(within(head).getByRole('button', { name: 'TEST add the area' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('Formal quotation');
    expect(document.body.textContent ?? '').not.toMatch(RESERVED_PRICING);
  });

  it('G10-11 (web half, the stored proposal): where the API serves each investment output\'s stage label (`label`), the investment section names each output by it once, bound, beside its "Not available yet" line; the head still names none', async () => {
    api({}, { proposal: { stageNames: true } });
    renderAt(`/projects/${PROJECT}/proposal`);
    await screen.findByText(STAGE_1_MISSING);
    const investment = screen.getByRole('region', { name: 'Investment' });
    expect(within(investment).getByText(STAGE_2).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate.label`);
    expect(within(investment).getByText(STAGE_1).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`proposal:${SNAPSHOT}.outputs.capex.indicativeRange.label`);
    // Named only by the stage labels: not also by what the output measures.
    expect(investment.textContent).not.toContain('Investment from');
    expect(within(investment).getAllByText(STAGE_2)).toHaveLength(1);
    expect((document.querySelector('[data-proposal-head]') as HTMLElement).textContent).not.toContain(STAGE_2);
  });

  it('G10-1 (rendered, TEST figure) · G9-1 (rendered) · rule 9 · 2.8: a TEST stage 2 range shows through the one price component with its stage label read from the served display, the Estimated badge on its line, its basis and Provisional line; no reserved pricing term', async () => {
    api({}, { proposal: { figure: 'range' } });
    renderAt(`/projects/${PROJECT}/proposal`);
    const head = await waitFor(() => {
      const found = document.querySelector('[data-proposal-head]');
      if (!(found instanceof HTMLElement) || !(found.textContent ?? '').includes('TEST 1,200')) throw new Error('not yet');
      return found;
    });
    const price = head.querySelector(`[data-value-id="proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate"]`) as HTMLElement;
    expect(price.textContent).toContain(RANGE_TEXT);
    expect(within(price).getByText(STAGE_2).getAttribute('data-copy-kind')).toBe('status-line');
    expect(within(price).getByText('Estimated')).toBeTruthy();
    expect(within(price).getByText('Provisional: depends on TEST 3 equipment items not yet checked')).toBeTruthy();
    // One stage label per figure: the served stage display is not shown again beside a figure that carries it.
    expect(within(head).getAllByText(STAGE_2)).toHaveLength(1);
    expect(document.body.textContent ?? '').not.toMatch(RESERVED_PRICING);
  });

  it('G10-2 (rendered) · rule 10 "A quotation goes stale": a TEST figure whose stored quotation record went stale shows "Superseded: inputs changed on <date>" beside it, bound, with stage 2\'s label and never "Formal quotation"', async () => {
    api({}, { proposal: { figure: 'superseded' } });
    renderAt(`/projects/${PROJECT}/proposal`);
    const lines = await screen.findAllByText(SUPERSEDED_TEXT);
    expect(lines[0]?.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate.superseded`);
    expect(document.body.textContent).not.toContain('Formal quotation');
    expect(screen.getAllByText(STAGE_2).length).toBeGreaterThan(0);
  });

  it('G10-9 (kept) · rule 10 "Stage 3 is derived, not passed": a stage 3 TEST figure shows "Formal quotation" only with its stored record; one that names no record is refused, and the frame keeps its sidebar and demo line', async () => {
    api({}, { proposal: { figure: 'formal', stage3Text: 'Formal quotation' }, demo: true });
    renderAt(`/projects/${PROJECT}/proposal`);
    expect((await screen.findAllByText('Formal quotation')).length).toBeGreaterThan(0);
    cleanup();
    resetGenerations();
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    api({}, { proposal: { figure: 'formal_unrecorded', stage3Text: 'Formal quotation' }, demo: true });
    renderAt(`/projects/${PROJECT}/proposal`);
    await screen.findByRole('navigation', { name: 'Project pages' });
    await waitFor(() => expect(document.querySelector(`[data-value-id="proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate"]`)).toBeNull());
    await settle();
    expect(document.body.textContent).not.toContain('Formal quotation');
    expect(screen.getByText('TEST demo line')).toBeTruthy();
    quiet.mockRestore();
  });

  it('G7-18 (web half) · rule 7 "Analysis still running never blocks Generate": a proposal stored while files were being read shows "Still reading <n> files. Your estimate will update when they finish." at its head, bound, and no dialog', async () => {
    api({}, { proposal: { stillReading: true } });
    renderAt(`/projects/${PROJECT}/proposal`);
    const line = await screen.findByText(STILL_READING_TEXT);
    expect(line.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.documents.stillReading`);
    expect(line.closest('[data-proposal-head]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"], dialog')).toBeNull();
  });

  it('G11-12 (web half) · rule 11 "The interface points stay in scope" · G9-3 (rendered): the points section names each type with its "Not available yet" line and rule 11\'s interface points with no figure, bound', async () => {
    api();
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    const points = screen.getByRole('region', { name: 'Control points' });
    for (const name of ['Control points: hardware inputs and outputs', 'Control points: links to other systems', 'Control points: virtual points']) expect(within(points).getByText(name)).toBeTruthy();
    expect(within(points).getAllByText(POINTS_MISSING)).toHaveLength(3);
    const interfacePoints = within(points).getByText(INTERFACE_POINTS_TEXT);
    expect(interfacePoints.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`proposal:${SNAPSHOT}.lifeSafety.interfacePoints`);
    expect(points.querySelector('[data-interface-points]')?.textContent).not.toMatch(/\d/u);
  });

  it('US-PROPOSAL-04 AC3 AC5 · R-087 · R-095 · R-102 · G10-7 · rule 7: the indicators read "Not available yet" naming what is missing; the excluded system is listed apart; the open items appear once, in "What we still need", with the head showing only their count', async () => {
    api();
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    const indicators = screen.getByRole('region', { name: 'Operating cost and payback' });
    for (const name of ['Operating cost', 'Payback', 'Net present value (NPV)', 'Internal rate of return (IRR)']) expect(within(indicators).getByText(name)).toBeTruthy();
    expect(within(indicators).queryByText(/ROI/u)).toBeNull();
    const scope = screen.getByRole('region', { name: 'System scope' });
    expect(within(scope).getByText('TEST monitoring only sentence')).toBeTruthy();
    expect(scope.querySelector('[data-system="cctv"]')?.hasAttribute('data-excluded')).toBe(true);
    // Rule 11's sentence once on the page: on its system's row, not again under Life safety.
    expect(screen.getAllByText('TEST monitoring only sentence')).toHaveLength(1);
    const investment = screen.getByRole('region', { name: 'Investment' });
    expect(investment.querySelector('[data-investment-exclusions]')?.textContent).toContain('CCTV');
    const still = screen.getByRole('region', { name: 'What we still need' });
    expect(within(still).getByText(OWNER_COUNT_TEXT)).toBeTruthy();
    expect(within(still).getByText(ENGINEER_TEXT)).toBeTruthy();
    expect(within(still).getByText('Your estimate needs this')).toBeTruthy();
    // The items once: the head shows the count and the way to them, not the items.
    const head = document.querySelector('[data-proposal-head]') as HTMLElement;
    expect(within(head).getByText(OWNER_COUNT_TEXT)).toBeTruthy();
    expect(within(head).queryByText(ENGINEER_TEXT)).toBeNull();
    expect(screen.getAllByText('Your estimate needs this')).toHaveLength(1);
    fireEvent.click(within(head).getByRole('button', { name: 'See what we still need' }));
    expect(document.activeElement).toBe(document.getElementById('proposal-what-we-still-need'));
  });

  it('R-012 "Until decided" · US-INTAKE-22 AC6 · G7-2b (rendered): "Add" on the head\'s "Not available yet" line opens step 8 with that field named, its inline ask focused', async () => {
    const seen = api();
    const view = renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    const head = document.querySelector('[data-proposal-head]') as HTMLElement;
    fireEvent.click(within(head).getByRole('button', { name: 'TEST add the area' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    await screen.findByRole('textbox', { name: AREA_BOX });
    expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8')).at(-1)?.url.searchParams.get('add')).toBe('building.grossFloorArea');
  });

  it('G7-11 (web half) · US-INTAKE-22 AC6 · R-012: after Generate skipped the area\'s inline ask, "Add" on the stored proposal opens step 8 with the field named, and the ask served again is focused; the other skipped asks stay skipped', async () => {
    const base = step8View();
    const skipped = new Set<string>();
    const seen = api({
      [`POST ${P}/fields/skip`]: (request) => {
        skipped.add((request.body as { questionId: string }).questionId);
        return json(200, { displayObjects: [] });
      },
      [`POST ${P}/proposals`]: () => json(201, { snapshotId: SNAPSHOT }),
      // The API serves an ask until it is skipped, and again for the field the `add` query names (rule 7).
      [`GET ${P}/steps/8`]: (request) => {
        const add = request.url.searchParams.get('add');
        const inlineAsks = base.view.proposal.inlineAsks.filter((ask) => !skipped.has(ask.questionId) || ask.fields.some((field) => field.fieldKey === add));
        return json(200, { ...base, view: { ...base.view, proposal: { ...base.view.proposal, inlineAsks } } });
      },
    });
    const view = renderAt(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    const head = await headShown();
    expect(skipped.size).toBeGreaterThan(0);
    fireEvent.click(within(head).getByRole('button', { name: 'TEST add the area' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    const input = await screen.findByRole('textbox', { name: AREA_BOX });
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8')).at(-1)?.url.searchParams.get('add')).toBe('building.grossFloorArea');
    expect(screen.queryByText('TEST ask for the type')).toBeNull();
  });

  it('US-PROPOSAL-11 AC3 · US-PROPOSAL-03 AC3 · G4-45 (web half): an earlier version reads as generated, says it is an earlier version, links to the latest, and the versions rail marks the one shown', async () => {
    api({ [`GET ${P}/proposals/${EARLIER}`]: () => json(200, proposalResponse({ snapshotId: EARLIER, latest: false, versions: [SNAPSHOT, EARLIER] })) }, { versions: [SNAPSHOT, EARLIER] });
    const view = renderAt(`/projects/${PROJECT}/proposals/${EARLIER}`);
    await screen.findByText('This is an earlier version of your preliminary proposal, kept as it was generated.');
    const versions = screen.getByRole('navigation', { name: 'Versions' });
    const links = within(versions).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[1]?.getAttribute('aria-current')).toBe('page');
    expect(links[0]?.getAttribute('aria-current')).toBeNull();
    expect(links[0]?.textContent).toContain('Latest');
    // The sidebar still marks the Proposal page on a stored version.
    expect(within(screen.getByRole('navigation', { name: 'Project pages' })).getByRole('link', { name: 'Proposal' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('link', { name: 'Open the latest version' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/proposal`));
    await headShown();
  });

  it('rule 13 · R-110: a version this project does not hold reads as not in this project, inside the frame, with the way to the latest', async () => {
    api({ [`GET ${P}/proposals/${EARLIER}`]: () => json(404, { code: 'not_found' }) });
    renderAt(`/projects/${PROJECT}/proposals/${EARLIER}`);
    await screen.findByText('This version of the proposal is not in this project.');
    expect(screen.getByRole('navigation', { name: 'Project pages' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the latest version' })).toBeTruthy();
  });

  it('R-115 "Until decided" · rule 2 "Numbers in prose are references": a stored drafted paragraph renders its prose and each value token as that value\'s own bound display; none is shown when none is stored', async () => {
    api({}, { proposal: { drafted: true } });
    renderAt(`/projects/${PROJECT}/proposal`);
    const paragraph = await waitFor(() => {
      const found = document.querySelector('[data-drafted="summary"]');
      if (found === null) throw new Error('not yet');
      return found;
    });
    expect(paragraph.textContent).toContain('TEST drafted prose about the building of');
    expect(paragraph.querySelector(`[data-value-id="proposal:${SNAPSHOT}.inputs.building.grossFloorArea"]`)?.textContent).toContain('TEST 1,234 m²');
    cleanup();
    resetGenerations();
    api();
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    expect(screen.queryByRole('region', { name: 'About this proposal' })).toBeNull();
  });
});

describe('phase 5 part B · the design review and the verifier on the stored proposal', () => {
  it('DR-1 · R-012 · rule 7 ("names what is missing and offers the action"): an output whose line names three owner inputs offers the three served Adds, in served order, under its line; identically named Adds are each described by their own output\'s name', async () => {
    const seen = api({}, { proposal: { missingInputs: true, stageNames: true } });
    const view = renderAt(`/projects/${PROJECT}/proposal`);
    await screen.findByText(STAGE_1_MISSING_INPUTS);
    const investment = screen.getByRole('region', { name: 'Investment' });
    const stage1 = investment.querySelector('[data-output="capex.indicativeRange"]') as HTMLElement;
    const bound = stage1.querySelector(`[data-value-id="proposal:${SNAPSHOT}.outputs.capex.indicativeRange"]`) as HTMLElement;
    expect(within(bound).getAllByRole('button').map((button) => button.textContent)).toEqual(['TEST add the area', 'TEST add the type', 'TEST add the systems']);
    // "TEST add the area" shows under both investment outputs (and at the head): each names its own output.
    const areaAdds = within(investment).getAllByRole('button', { name: 'TEST add the area' });
    expect(areaAdds).toHaveLength(2);
    const describedBy = areaAdds.map((button) => button.getAttribute('aria-describedby') ?? '');
    expect(new Set(describedBy).size).toBe(2);
    expect(describedBy.map((id) => document.getElementById(id)?.textContent)).toEqual([STAGE_2, STAGE_1]);
    const head = document.querySelector('[data-proposal-head]') as HTMLElement;
    expect(document.getElementById(within(head).getByRole('button', { name: 'TEST add the area' }).getAttribute('aria-describedby') ?? '')?.textContent).toBe('Where your proposal stands');
    // The second Add opens step 8 with its own field named.
    fireEvent.click(within(bound).getByRole('button', { name: 'TEST add the type' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8')).at(-1)?.url.searchParams.get('add')).toBe('building.type'));
  });

  it('DR-1 (open items): each "What we still need" item shows the field\'s name as its primary text and why it is asked as its secondary line; its served Add stays, described by the item\'s name', async () => {
    api();
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    const still = screen.getByRole('region', { name: 'What we still need' });
    const item = still.querySelector('[data-open-item="first_estimate_missing"]') as HTMLElement;
    const [primary, secondary] = [...item.querySelectorAll('[data-open-item-name], [data-open-item-reason]')];
    expect(primary?.getAttribute('data-open-item-name')).not.toBeNull();
    expect(primary?.textContent).toBe('TEST gross floor area');
    expect(secondary?.getAttribute('data-open-item-reason')).not.toBeNull();
    expect(secondary?.textContent).toBe('Your estimate needs this');
    // The field's name is said once, as the item's name: not again as the value's label.
    expect(within(item).getAllByText('TEST gross floor area')).toHaveLength(1);
    const add = within(item).getByRole('button', { name: 'TEST add the area' });
    expect(document.getElementById(add.getAttribute('aria-describedby') ?? '')?.textContent).toBe('TEST gross floor area');
  });

  it('DR-2 · G10-7: the scope section is "System scope" (each system\'s decision as used); the systems left out are listed once under Investment\'s "Not in scope", each named by its system', async () => {
    api();
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    expect(screen.queryByRole('region', { name: 'Systems in scope' })).toBeNull();
    const scope = screen.getByRole('region', { name: 'System scope' });
    expect([...scope.querySelectorAll('[data-system]')].map((row) => row.getAttribute('data-system'))).toEqual(['hvac', 'fire_safety', 'cctv']);
    const exclusions = screen.getByRole('region', { name: 'Investment' }).querySelector('[data-investment-exclusions]') as HTMLElement;
    expect(within(exclusions).getByRole('heading', { name: 'Not in scope' })).toBeTruthy();
    expect([...exclusions.querySelectorAll('[data-excluded]')].map((row) => row.getAttribute('data-excluded'))).toEqual(['cctv']);
    expect(within(exclusions).getAllByText('CCTV')).toHaveLength(1);
  });

  it('DR-12: "What the estimate is based on" is one list in the order served, one input per row, never a two-column grid', async () => {
    api({}, { proposal: { basisMore: true } });
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    const basis = screen.getByRole('region', { name: 'What the estimate is based on' });
    const list = basis.querySelector('[data-proposal-basis]') as HTMLElement;
    expect(list.tagName).toBe('UL');
    expect(list.className).not.toMatch(/grid-cols/u);
    expect([...list.children].map((item) => item.querySelector('[data-value-id]')?.getAttribute('data-value-id'))).toEqual([
      `proposal:${SNAPSHOT}.inputs.building.grossFloorArea`,
      `proposal:${SNAPSHOT}.inputs.building.type`,
      `proposal:${SNAPSHOT}.inputs.building.rooms`,
    ]);
  });

  it('DR-16: the stored proposal\'s header keeps Download PDF at the top of the title row, and its "Preparing" and failure lines out of the header\'s height, so the title keeps one position in every state', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:TEST', revokeObjectURL: () => undefined }));
    api({
      [`POST ${P}/proposals/${SNAPSHOT}/exports`]: () => json(201, { outputId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01' }),
      [`GET ${P}/exports/0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01/file`]: () => json(503, { code: 'export_unavailable' }),
    });
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    const row = screen.getByRole('heading', { name: 'Preliminary proposal', level: 1 }).closest('.sov-page-header__row') as HTMLElement;
    expect(row.getAttribute('data-actions-align')).toBe('start');
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    const failure = await screen.findByText('The PDF could not be prepared. Your proposal is unchanged. Try again.');
    // The lines under the button sit in a box taken out of the flow: the header is as tall as the button alone.
    const messages = failure.closest('[data-download-messages]') as HTMLElement;
    expect(messages.className.split(/\s+/u)).toContain('absolute');
    expect(within(messages).getAllByRole('status')).toHaveLength(1);
    expect(messages.closest('.sov-page-header')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Download PDF' }).getAttribute('aria-describedby')).toBe(failure.closest('[id]')?.id);
  });

  it('V-1 (rendered half) · rule 1 "Material exclusions" ("no headline … is computed from it") · G1-2: a total with material exclusions, served as its "Incomplete: excludes …" line with its stage label, shows at the head as that line, bound, with no figure', async () => {
    api({}, { proposal: { figure: 'incomplete' } });
    renderAt(`/projects/${PROJECT}/proposal`);
    const head = await waitFor(() => {
      const found = document.querySelector('[data-proposal-head]');
      if (!(found instanceof HTMLElement) || !(found.textContent ?? '').includes(INCOMPLETE_TEXT)) throw new Error('not yet');
      return found;
    });
    // The head's own display (`headline.investment`, as the API serves it), never the investment output's figure.
    const bound = head.querySelector(`[data-value-id="proposal:${SNAPSHOT}.headline.investment"]`) as HTMLElement;
    expect(within(bound).getAllByText(INCOMPLETE_TEXT)).toHaveLength(1);
    expect(within(bound).getByText(STAGE_2).getAttribute('data-copy-kind')).toBe('status-line');
    expect(head.querySelector(`[data-value-id="proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate"]`)).toBeNull();
    // No figure at the head: no range, no number of the estimate, no currency.
    expect(head.textContent).not.toContain(RANGE_TEXT);
    expect(head.textContent).not.toMatch(/TEST 1,|EUR|€/u);
    expect(within(head).getAllByText(STAGE_2)).toHaveLength(1);
    // The Investment section keeps the figure with its Incomplete line.
    const investment = screen.getByRole('region', { name: 'Investment' });
    const figure = investment.querySelector(`[data-value-id="proposal:${SNAPSHOT}.outputs.capex.preliminaryEstimate"]`) as HTMLElement;
    expect(figure.textContent).toContain(RANGE_TEXT);
    expect(within(figure).getAllByText(INCOMPLETE_TEXT)).toHaveLength(1);
  });
});

describe('R-118 · US-REPORTS-02 · docs/adr/0050: Download PDF', () => {
  function stubObjectUrls() {
    const created: Blob[] = [];
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (blob: Blob) => (created.push(blob), 'blob:TEST'), revokeObjectURL: () => undefined }));
    return created;
  }

  it('US-REPORTS-02 AC1 AC6 · rule 7: one press records the export and reads its file once; two presses send one of each; the button is never disabled', async () => {
    const created = stubObjectUrls();
    const held = heldHandler(() => json(201, { outputId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01' }));
    const seen = api({
      [`POST ${P}/proposals/${SNAPSHOT}/exports`]: held.handler,
      [`GET ${P}/exports/0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01/file`]: () => new Response('%PDF-TEST', { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="TEST-proposal.pdf"' } }),
    });
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    const button = screen.getByRole('button', { name: 'Download PDF' });
    pressTwice(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    await screen.findByText('Preparing the PDF');
    held.answer();
    await waitFor(() => expect(created).toHaveLength(1));
    expect(sentTo(seen, 'POST', '/exports')).toBe(1);
    expect(sentTo(seen, 'GET', '/file')).toBe(1);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'));
  });

  it('docs/adr/0050 decision 2 · rule 7: a PDF the API could not prepare (503 export_unavailable) says so; the proposal stays and the button takes presses again', async () => {
    stubObjectUrls();
    api({
      [`POST ${P}/proposals/${SNAPSHOT}/exports`]: () => json(201, { outputId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01' }),
      [`GET ${P}/exports/0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01/file`]: () => json(503, { code: 'export_unavailable' }),
    });
    renderAt(`/projects/${PROJECT}/proposal`);
    await headShown();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await screen.findByText('The PDF could not be prepared. Your proposal is unchanged. Try again.');
    expect(screen.getAllByText(STAGE_2_MISSING).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Download PDF' }).getAttribute('aria-busy')).toBe('false');
  });
});
