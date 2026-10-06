/**
 * G10-5 (docs/guardrails.md section 7; 2.8 "Prominence": "Printed and exported proposals show badges, ranges and
 * sources inline. They add an appendix listing every value's source, verification and method, and the open items";
 * rule 7, "In the proposal document. Open items appear once, in a 'What we still need' section"; PRD R-118;
 * US-REPORTS-01, US-REPORTS-03; docs/adr/0050-exports-print-route-and-pdf.md).
 * Situation: a proposal is exported to PDF.
 * Expected: badges and ranges are inline, and the appendix lists sources and open items.
 *
 * The page and PDF half (phase 5, the print builder): a TEST print view in the contract's shapes
 * (apps/web/src/proposal/print/print-fixture.ts: an investment range at its stage, an estimated range with a provisional
 * line, outputs that read "Not available yet", the basis with an excerpt kept and one erased, the open items), printed
 * as the app's print route renders it, by the API's own printer, to an A4 PDF (tests/guardrails/_support/print.tsx),
 * whose pages are read back with pypdfium2. In the PDF's text:
 * - each range prints on one line with its badge (the badge on its figure's line), its source line and its method
 *   lines right under it, in the proposal's body (before the appendix);
 * - the appendix starts a new page and lists every value with its source line, its badge (its verification) and, for
 *   a calculated or estimated value, its method, and each excerpt as stored;
 * - "What we still need" prints once, in the appendix, with the owner's items and SOVITECH's;
 * - nothing on any page is a reserved term outside 2.8's own badge labels.
 * Every value is TEST data.
 *
 * The server's print view half (phase 5 part B, V-6: the half above prints a hand-written fixture, and G10-13 prints the
 * API's view of a proposal with no figure): the print view the server builds, `proposalPrintView` of
 * `@sovitech/view-model/server`, over a TEST stored snapshot with figures (tests/guardrails/_support/proposal.ts: the
 * production registry's fields derived by the one derive function, an owner's TEST answer, two TEST estimates written by
 * a TEST engine account on a TEST formula id, the stage read by the engine's `priceStageOf`, and the open items as step 8
 * serves them: a "For you" count and item, "Site survey needed" and an equipment-classification line), in the envelope
 * the API serves it in, printed the same way. In the PDF's text:
 * - each figure prints on one line with its served badge (the badge on its figure's line), with its range, and its
 *   source line right under it, in the proposal's body; the investment figure names its stage;
 * - the appendix starts a new page and lists every value with its source line and its badge, the figures with their
 *   method, and then "What we still need" once, with the owner's items and "SOVITECH will check" with its lines;
 * - no page holds a reserved term outside 2.8's own badge labels.
 *
 * It launches Chromium: run it under the e2e lock with one worker.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Candidate } from '@sovitech/domain';
import { ProposalPrintResponseSchema, type DisplayObject, type ProposalPrintResponse } from '@sovitech/view-model/browser';
import { DEFAULT_FORMAT_OPTIONS, proposalPrintView, resolveField, resolveLine } from '@sovitech/view-model/server';
import { PRINT_TEXT, printResponse } from '../../apps/web/src/proposal/print/print-fixture';
import { testEvents } from './_support/builders';
import { linesOf, printProposal, reservedTermsInPrint, type PrintedProposal } from './_support/print';
import { BUILDING_ID, GENERATED_AT, PROJECT_ID, SNAPSHOT_ID, displayById, ownerAnswer, productionRows, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';
import { intakeFieldOf, productionField, resolveInputOf, uuid } from './_support/view-model';

const APPENDIX = 'Appendix: where each value comes from';
const OPEN_ITEMS = 'What we still need';

let printed: PrintedProposal | undefined;

beforeAll(async () => {
  printed = await printProposal(ProposalPrintResponseSchema.parse(printResponse({ demo: false })));
}, 120_000);

afterAll(() => {
  printed = undefined;
});

function pdf(): PrintedProposal {
  if (printed === undefined) throw new Error('G10-5: the proposal was not printed');
  return printed;
}

/** The page index where the appendix starts, and the text before and from it. */
function split(): { readonly body: string[]; readonly appendix: string[]; readonly appendixPage: number } {
  const pages = pdf().pages;
  const appendixPage = pages.findIndex((page) => page.includes(APPENDIX));
  expect(appendixPage, pages.join('\n----\n')).toBeGreaterThan(0);
  return {
    body: pages.slice(0, appendixPage).flatMap(linesOf),
    appendix: pages.slice(appendixPage).flatMap(linesOf),
    appendixPage,
  };
}

/** The index of the first line holding `text` in `lines`, after `from`. */
function lineWith(lines: readonly string[], text: string, from = 0): number {
  return lines.findIndex((line, index) => index >= from && line.includes(text));
}

describe('G10-5 · R-118 · US-REPORTS-01 · US-REPORTS-03: a proposal exported to PDF', () => {
  it('G10-5: the export is a PDF of several A4 pages, and the cover is its own page', () => {
    const pages = pdf().pages;
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(linesOf(pages[0] ?? '')).toContain('Preliminary proposal');
    expect(pages[0]).toContain(PRINT_TEXT.projectName);
    expect(pages[0]).not.toContain('Where your proposal stands');
  });

  it('G10-5: badges and ranges are inline: each range prints on one line with its badge, with its source and method lines right under it', () => {
    const { body } = split();
    const account = body.join('\n');
    for (const [range, badge] of [
      [PRINT_TEXT.capexRange, PRINT_TEXT.estimatedBadge],
      [PRINT_TEXT.pointsRange, PRINT_TEXT.estimatedBadge],
    ] as const) {
      const at = lineWith(body, range);
      expect(at, `${range}\n${account}`).toBeGreaterThanOrEqual(0);
      expect(body[at], account).toContain(badge);
    }
    const capex = lineWith(body, PRINT_TEXT.capexRange);
    expect(body.slice(capex + 1, capex + 5).join('\n'), account).toContain(PRINT_TEXT.capexSource);
    expect(body.slice(capex + 1, capex + 6).join('\n'), account).toContain(PRINT_TEXT.capexMethod);
    const points = lineWith(body, PRINT_TEXT.pointsRange);
    expect(body.slice(points + 1, points + 4).join('\n'), account).toContain(PRINT_TEXT.pointsProvisional);
    expect(account).toContain(PRINT_TEXT.stageLabel);
  });

  it('G10-5 · rule 1 · rule 7: an output with no figure prints its "Not available yet" line naming what is missing, never a zero or a blank', () => {
    const { body } = split();
    const account = body.join('\n');
    for (const what of ['TEST cost ranges', 'TEST point templates', 'TEST climate data', 'TEST savings factors', 'TEST function set', 'TEST duration unit', 'TEST open question on annual amounts']) {
      expect(account).toContain(`Not available yet: ${what}`);
    }
    expect(body.filter((line) => /^(?:0|-|–|—)$/u.test(line))).toEqual([]);
  });

  it('G10-5 · 2.8 "Prominence": the appendix starts a new page and lists every value with its source, its badge and, for a figure, its method; excerpts as stored', () => {
    const { appendix, appendixPage } = split();
    expect(linesOf(pdf().pages[appendixPage] ?? '')[0]).toBe(APPENDIX);
    const account = appendix.join('\n');
    for (const source of ['TEST calculated source line', 'TEST estimated from TEST point templates', 'TEST found in TEST-plan.pdf, page 1', 'TEST found in TEST-erased.pdf', 'TEST entered by you']) {
      expect(account).toContain(source);
    }
    for (const badge of [PRINT_TEXT.estimatedBadge, PRINT_TEXT.documentBadge, PRINT_TEXT.providedBadge]) expect(account).toContain(badge);
    expect(account).toContain(PRINT_TEXT.capexMethod);
    expect(account).toContain(PRINT_TEXT.capexBasis);
    expect(appendix[lineWith(appendix, PRINT_TEXT.capexRange)]).toContain(PRINT_TEXT.estimatedBadge);
    expect(appendix[lineWith(appendix, PRINT_TEXT.areaText)]).toContain(PRINT_TEXT.documentBadge);
    expect(account).toContain(PRINT_TEXT.excerptKept);
    expect(appendix).toContain(PRINT_TEXT.erased);
  });

  it('G10-5 · rule 7: the appendix lists the open items once, under "What we still need", with the owner\'s items and SOVITECH\'s', () => {
    const { body, appendix } = split();
    const all = pdf().pages.flatMap(linesOf);
    expect(all.filter((line) => line === OPEN_ITEMS)).toHaveLength(1);
    expect(body).not.toContain(OPEN_ITEMS);
    const at = appendix.indexOf(OPEN_ITEMS);
    expect(at).toBeGreaterThan(0);
    const items = appendix.slice(at).join('\n');
    expect(items).toContain(PRINT_TEXT.ownerCount);
    expect(items).toContain('Your estimate needs this');
    expect(items).toContain('SOVITECH will check');
    expect(items).toContain(PRINT_TEXT.engineerLine);
    expect(all.filter((line) => line.includes(PRINT_TEXT.ownerCount))).toHaveLength(1);
  });

  it('G10-5 · 2.8 "Reserved terms": no page of the export holds a reserved term outside 2.8\'s own badge labels', () => {
    for (const [index, page] of pdf().pages.entries()) expect(reservedTermsInPrint(page), `page ${String(index + 1)}`).toEqual([]);
  });
});

// ---- The server's print view half (phase 5 part B, V-6): proposalPrintView of a TEST snapshot with figures ----

const SERVER_PROJECT_NAME = 'TEST Server Print Project';
const CAPEX = `proposal:${SNAPSHOT_ID}.outputs.capex.preliminaryEstimate`;
const ENERGY = `proposal:${SNAPSHOT_ID}.outputs.energy.annualConsumption`;
const AREA = `proposal:${SNAPSHOT_ID}.inputs.building.grossFloorArea`;

/** The print view the server builds for a TEST stored snapshot with two TEST figures, in the API's envelope. */
function serverPrintResponse(): { readonly response: ProposalPrintResponse; readonly displays: readonly DisplayObject[] } {
  const area = ownerAnswer(501, 'building.grossFloorArea', { quantity: { value: 2400, unit: 'm2', qualifier: 'gross_total' } });
  const name: Candidate = { id: uuid(502), subjectId: PROJECT_ID, fieldKey: 'project.name', text: SERVER_PROJECT_NAME, source: 'user', evidence: [], createdBy: uuid(80), authorRole: 'owner', createdAt: '2026-09-30T09:00:00.000000Z' };
  const nameEvent = { candidateId: name.id, type: 'user_confirmed' as const, by: uuid(80), role: 'owner' as const, at: name.createdAt };
  const fields = testProposalFields({ candidates: [area.candidate, name], events: testEvents({ candidate: [area.event, nameEvent] }) });
  const capex = testEstimate(503, { output: 'capex.preliminaryEstimate', value: 92000, low: 81000, high: 108000, unit: 'EUR', inputCandidateIds: [area.candidate.id] });
  const energy = testEstimate(504, { output: 'energy.annualConsumption', value: 300000, low: 240000, high: 380000, unit: 'kWh/a', inputCandidateIds: [area.candidate.id] });
  const figures = new Map([
    ['capex.preliminaryEstimate', capex.id],
    ['energy.annualConsumption', energy.id],
  ]);
  const rows = productionRows(fields).rows.map((row) => {
    const candidateId = figures.get(row.output);
    return candidateId === undefined ? row : { ...row, candidateId, missing: [], incomplete: false };
  });
  // The open items as step 8 serves them (apps/api wizard/views.ts reviewLists): the owner's count and item, and two
  // "SOVITECH will check" lines.
  const ownerCount = resolveLine(`project:${PROJECT_ID}.openItems.owner`, 'things_for_you', { count: 1 }, DEFAULT_FORMAT_OPTIONS);
  const [typeMissing] = resolveField(resolveInputOf(intakeFieldOf(productionField('building.type'), BUILDING_ID), 'building'));
  if (typeMissing === undefined) throw new Error('no display for the building type');
  const survey = resolveLine(`project:${PROJECT_ID}.openItems.engineer.siteSurvey`, 'site_survey_needed', {}, DEFAULT_FORMAT_OPTIONS);
  const classifications = resolveLine(`project:${PROJECT_ID}.openItems.engineer.equipmentClassifications`, 'sovitech_will_check_equipment', { count: 3 }, DEFAULT_FORMAT_OPTIONS);
  const input = testProposalInput({
    fields,
    rows,
    snapshotCandidates: [area.candidate, capex, energy],
    openItems: {
      view: { count: ownerCount.valueId, items: [{ itemId: 'first_estimate_missing:building.type', reason: 'first_estimate_missing', concerns: typeMissing.valueId }], more: null, sovitechWillCheck: [survey.valueId, classifications.valueId] },
      displays: [ownerCount, typeMissing, survey, classifications],
    },
  });
  const built = proposalPrintView(input);
  // The API's envelope adds the shell's header and the project's name display (apps/api proposal/service.ts envelope).
  const nameField = fields.find((field) => field.field.key === 'project.name');
  if (nameField === undefined) throw new Error('no project name field');
  const [nameDisplay] = resolveField(resolveInputOf({ field: nameField.field, subjectId: PROJECT_ID, state: nameField.state, candidates: nameField.candidates, skippedAt: [] }, 'project'));
  if (nameDisplay === undefined) throw new Error('no display for the project name');
  expect(nameDisplay.valueId).toBe(input.header.name);
  const displayObjects = [nameDisplay, ...built.displayObjects.filter((display) => display.valueId !== nameDisplay.valueId)];
  const response = ProposalPrintResponseSchema.parse({ asOf: GENERATED_AT, project: input.header, displayObjects, view: built.view });
  return { response, displays: response.displayObjects };
}

let server: { readonly printed: PrintedProposal; readonly displays: readonly DisplayObject[] } | undefined;

describe('G10-5 (the server\'s print view) · R-118 · 2.8 "Prominence": proposalPrintView of a TEST snapshot with figures, exported to PDF', () => {
  beforeAll(async () => {
    const { response, displays } = serverPrintResponse();
    server = { printed: await printProposal(response), displays };
  }, 120_000);

  afterAll(() => {
    server = undefined;
  });

  function printedServer(): { readonly printed: PrintedProposal; readonly displays: readonly DisplayObject[] } {
    if (server === undefined) throw new Error('G10-5: the server\'s print view was not printed');
    return server;
  }

  /** The body's and the appendix's lines of the server's print view. */
  function serverSplit(): { readonly body: string[]; readonly appendix: string[]; readonly appendixPage: number } {
    const pages = printedServer().printed.pages;
    const appendixPage = pages.findIndex((page) => page.includes(APPENDIX));
    expect(appendixPage, pages.join('\n----\n')).toBeGreaterThan(0);
    return { body: pages.slice(0, appendixPage).flatMap(linesOf), appendix: pages.slice(appendixPage).flatMap(linesOf), appendixPage };
  }

  it('G10-5 · V-6: the TEST figures are served as estimated ranges with their badge, source line and method, and the investment figure with its stage', () => {
    const { displays } = printedServer();
    for (const id of [CAPEX, ENERGY]) {
      const display = displayById(displays, id);
      expect(display.shape, id).toBe('range');
      expect(display.badge?.id, id).toBe('estimated');
      expect(display.sourceLine?.text, id).toBe('Method: TEST-pointsEstimate, version 1');
    }
    expect(displayById(displays, CAPEX).lines?.some((line) => line.kind === 'stage_label' && line.text === 'Preliminary investment estimate')).toBe(true);
    expect(linesOf(printedServer().printed.pages[0] ?? '')).toContain('Preliminary proposal');
    expect(printedServer().printed.pages[0]).toContain(SERVER_PROJECT_NAME);
  });

  it('G10-5 · V-6 · 2.8 "Prominence": badges and ranges are inline: each figure prints on one line with its badge, and its source line right under it', () => {
    const { displays } = printedServer();
    const { body } = serverSplit();
    const account = body.join('\n');
    for (const id of [CAPEX, ENERGY]) {
      const display = displayById(displays, id);
      const at = body.findIndex((line) => line.includes(display.text));
      expect(at, `${display.text}\n${account}`).toBeGreaterThanOrEqual(0);
      expect(body[at], account).toContain(display.badge?.label ?? 'no badge');
      expect(body.slice(at + 1, at + 4).join('\n'), account).toContain(display.sourceLine?.text ?? 'no source line');
    }
    expect(account).toContain('Preliminary investment estimate');
    // The owner's answer, as used, with its badge on its line.
    const area = displayById(displays, AREA);
    const areaAt = body.findIndex((line) => line.includes(area.text));
    expect(areaAt, account).toBeGreaterThanOrEqual(0);
    expect(body[areaAt], account).toContain(area.badge?.label ?? 'no badge');
  });

  it('G10-5 · V-6 · 2.8 "Prominence": the appendix starts a new page and lists every value with its source line and badge, the figures with their method', () => {
    const { displays } = printedServer();
    const { appendix, appendixPage } = serverSplit();
    expect(linesOf(printedServer().printed.pages[appendixPage] ?? '')[0]).toBe(APPENDIX);
    const account = appendix.join('\n');
    for (const id of [CAPEX, ENERGY, AREA]) {
      const display = displayById(displays, id);
      const at = appendix.findIndex((line) => line.includes(display.text));
      expect(at, `${display.text}\n${account}`).toBeGreaterThanOrEqual(0);
      expect(appendix[at], account).toContain(display.badge?.label ?? 'no badge');
      if (display.sourceLine !== undefined) expect(account).toContain(display.sourceLine.text);
    }
    for (const id of [CAPEX, ENERGY]) {
      for (const line of displayById(displays, id).lines ?? []) if (line.kind === 'rule_line') expect(account, line.text).toContain(line.text);
    }
  });

  it('G10-5 · V-6 · rule 7: "What we still need" prints once, in the appendix, with the owner\'s items and "SOVITECH will check" with its lines', () => {
    const { body, appendix } = serverSplit();
    const all = printedServer().printed.pages.flatMap(linesOf);
    expect(all.filter((line) => line === OPEN_ITEMS)).toHaveLength(1);
    expect(body).not.toContain(OPEN_ITEMS);
    const at = appendix.indexOf(OPEN_ITEMS);
    expect(at).toBeGreaterThan(0);
    const items = appendix.slice(at);
    const account = items.join('\n');
    expect(account).toContain('1 thing for you to check');
    expect(account).toContain('Your estimate needs this');
    const check = items.indexOf('SOVITECH will check');
    expect(check, account).toBeGreaterThan(0);
    const engineer = items.slice(check).join('\n');
    expect(engineer).toContain('Site survey needed');
    expect(engineer).toContain('SOVITECH will check 3 equipment classifications');
  });

  it('G10-5 · V-6 · 2.8 "Reserved terms": no page of the server\'s print view holds a reserved term outside 2.8\'s own badge labels', () => {
    for (const [index, page] of printedServer().printed.pages.entries()) expect(reservedTermsInPrint(page), `page ${String(index + 1)}`).toEqual([]);
  });
});
