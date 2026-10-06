/**
 * The stored proposal's view-model half of G10-5 (whose case file holds the page and the PDF) and the proposal's own rules
 * (docs/adr/0048, 0049): built by
 * `@sovitech/view-model/server` over a TEST project whose fields are the production registry's, derived by the one
 * derive function, with the engine's own readings (tests/guardrails/_support/proposal.ts). In memory; nothing is stored.
 * Test titles start with the ids they prove (prompt 3 section 12). The view-model halves of G10-7, G10-2, G4-12, G1-28
 * and G9-10 were folded into their case files by the integrator (one file per case id).
 */
import { describe, expect, it } from 'vitest';
import { findReservedTerms } from '@sovitech/registry/reserved-terms';
import { ProposalPrintResponseSchema, ProposalResponseSchema, servedDisplayOf } from '@sovitech/view-model/browser';
import { FIRE_SAFETY_MONITORING_ONLY, proposalPrintView, proposalView } from '@sovitech/view-model/server';
import { testEvents } from '../guardrails/_support/builders';
import { PROJECT_ID, SNAPSHOT_ID, displayById, ownerAnswer, testProposalFields, testProposalInput } from '../guardrails/_support/proposal';

describe('ADR 0048 · ADR 0049: the stored proposal as the API serves it', () => {
  it('G10-5 (the view half) · 2.8 "Prominence": the print view has no action anywhere, a cover, and an appendix listing every input and output with the open items', () => {
    const built = proposalPrintView(testProposalInput());
    const view = ProposalPrintResponseSchema.shape.view.parse(built.view);
    expect(built.displayObjects.every((display) => display.actions === undefined)).toBe(true);
    expect(view.cover.projectName).toBe(`project:${PROJECT_ID}.name`);
    const listed = new Set(view.appendix.values);
    for (const valueId of view.proposal.basis) expect(listed.has(valueId), valueId).toBe(true);
    for (const output of [...view.proposal.investment.outputs, ...view.proposal.points.outputs, ...view.proposal.energy.outputs, ...view.proposal.measures.outputs]) expect(listed.has(output.display), output.output).toBe(true);
    expect(view.appendix.openItems).toEqual(view.proposal.whatWeStillNeed);
  });

  it('G2-7 · F-VALUE-14: one value id, one display: the stored proposal and its print view serve the same display for every value id but its actions', () => {
    const input = testProposalInput();
    const screen = proposalView(input);
    const print = proposalPrintView(input);
    const printed = new Map(print.displayObjects.map((display) => [display.valueId, display]));
    for (const display of screen.displayObjects) {
      const rest = { ...display };
      delete rest.actions;
      expect(printed.get(display.valueId), display.valueId).toEqual(rest);
    }
  });

  it('rule 11 · R-113 · G11-1: Fire Safety in scope reads monitoring only, generated from stored state; no displayed text gives the BMS a life-safety action or claims compliance', () => {
    const fire = ownerAnswer(290, 'project.scope.fire_safety', { choice: 'include' });
    const fields = testProposalFields({ candidates: [fire.candidate], events: testEvents({ candidate: [fire.event] }) });
    const built = proposalView(testProposalInput({ fields }));
    const sentence = built.view.scope.systems.find((system) => system.systemId === 'fire_safety')?.sentence;
    expect(displayById(built.displayObjects, sentence ?? '').text).toBe(FIRE_SAFETY_MONITORING_ONLY);
    const texts = built.displayObjects.flatMap((display) => {
      const served = servedDisplayOf(display);
      return [served.text, ...(served.lines ?? [])];
    });
    for (const text of texts) {
      expect(findReservedTerms(text).map((match) => match.term), text).toEqual([]);
      expect(text, text).not.toMatch(/\b(?:close|stop|shut|reset|inhibit|override|command|control)s?\b/iu);
    }
  });

  it('rule 12 · G12-10 (extended to the proposal): no "Not found in the analysed documents" statement while no completed AI run searched anything', () => {
    const built = proposalView(testProposalInput());
    expect(built.displayObjects.some((display) => display.text.includes('Not found') || display.lines?.some((line) => line.text.includes('Not found')) === true)).toBe(false);
  });

  it('rule 2 · R-115: an accepted draft renders as prose and value segments; a token with no display, or prose holding a figure, leaves the paragraph out', () => {
    const area = ownerAnswer(295, 'building.grossFloorArea', { quantity: { value: 2400, unit: 'm2', qualifier: 'gross_total' } });
    const fields = testProposalFields({ candidates: [area.candidate], events: testEvents({ candidate: [area.event] }) });
    const drafted = [
      { slot: 'summary', ordinal: 0, text: 'This TEST proposal reads the gross floor area of {{value:building.grossFloorArea}} and names what is still missing.' },
      { slot: 'second', ordinal: 0, text: 'A TEST paragraph citing {{calc:points.virtual}} that no figure backs.' },
      { slot: 'third', ordinal: 0, text: 'A TEST paragraph with 12 floors typed as text.' },
    ];
    const built = proposalView(testProposalInput({ fields, drafted }));
    const view = ProposalResponseSchema.shape.view.parse(built.view);
    expect(view.drafted).toHaveLength(2);
    const [summary] = view.drafted;
    expect(summary?.segments).toEqual([
      { kind: 'prose', text: 'This TEST proposal reads the gross floor area of ' },
      { kind: 'value', valueId: `proposal:${SNAPSHOT_ID}.inputs.building.grossFloorArea` },
      { kind: 'prose', text: ' and names what is still missing.' },
    ]);
    // `{{calc:points.virtual}}` names the output's display, which reads "Not available yet": rendered by code, never a number.
    expect(view.drafted[1]?.segments.find((segment) => segment.kind === 'value')).toEqual({ kind: 'value', valueId: `proposal:${SNAPSHOT_ID}.outputs.points.virtual` });
    expect(view.drafted.some((paragraph) => paragraph.slot === 'third')).toBe(false);
  });
});
