/**
 * G2-6 (docs/guardrails.md section 7; 2.3, "Stage matters more than date": "For the project types
 * existing building and BMS modernization: labels name the stage"; 2.8, "From design drawings").
 * Situation: existing building with only PT Rev. 02 drawings.
 * Expected: badge From design drawings, and the line names the stage.
 *
 * Built in phase 3, where the one resolver lands (the case was listed for phase 2 and had no
 * automated check until the resolver existed). A value the technical design (PT) Rev. 02 states, on
 * an owner field so no earlier 2.8 badge applies (on an engineer field "SOVITECH will check" comes
 * first in 2.8's order), on an existing building and on a BMS modernization: From design drawings,
 * the source line naming the stage and the revision. On a new building the same value reads From
 * document.
 */
import { expect, test } from 'vitest';
import type { DocumentStage } from '@sovitech/domain';
import { resolveField } from '@sovitech/view-model/server';
import { documentReading, testDocument } from './_support/builders';
import { intakeFieldOf, productionField, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const DESIGN_STAGES: readonly DocumentStage[] = ['feasibility', 'permit', 'technical_design', 'tender', 'execution', 'shop_drawing'];

test('US-REVIEW-01 AC4 · F-VALUE-10 · G2-6: existing building with only PT Rev. 02 drawings: From design drawings, the line naming the stage', () => {
  const buildingType = productionField('building.type');
  expect(buildingType.confirmBy).toBe('owner');
  for (const stage of DESIGN_STAGES) {
    const drawings = { ...testDocument(uuid(10), PROJECT, stage, { revision: 'Rev. 02', issueDate: '2007-05-14' }), contentHash: `sha256:${'2'.repeat(64)}` };
    const read = documentReading({ id: uuid(20), subjectId: BUILDING, field: buildingType, document: drawings, value: { choice: 'hotel' }, minute: 1, page: 3 });
    const field = intakeFieldOf(buildingType, BUILDING, [read], undefined, [drawings]);
    for (const projectType of ['existing_building', 'bms_modernization']) {
      const [display] = resolveField(resolveInputOf(field, 'building', { projectType, documents: [drawings], fileNames: { [drawings.id]: 'PT arhitectura.pdf' } }));
      expect(display?.badge).toEqual({ id: 'from_design_drawings', label: 'From design drawings' });
      expect(display?.sourceLine?.text).toMatch(/^.+ Rev\. 02 \(2007\): PT arhitectura\.pdf, page 3$/u);
      if (stage === 'technical_design') expect(display?.sourceLine?.text).toBe('Technical design Rev. 02 (2007): PT arhitectura.pdf, page 3');
    }
    const [newBuilding] = resolveField(resolveInputOf(field, 'building', { projectType: 'new_construction', documents: [drawings], fileNames: { [drawings.id]: 'PT arhitectura.pdf' } }));
    expect(newBuilding?.badge?.id).toBe('from_document');
  }
});
