/**
 * Reports, the Equipment export and the stored proposal's versions and basis (phase 5; docs/adr/0048, 0049, 0050), on
 * TEST records in memory: the CSV-injection guard under a ';' list separator and the byte order mark (phase 5 part B,
 * A-5; rule 14; rule 8), the dated names and times of Reports' rows and of a version's generation (DR-5; US-PROPOSAL-11
 * AC3), "Superseded" on the issue day the engine now answers as a timestamp (V-2, A-3; rule 10), and the basis by intake
 * step (DR-12). The guardrail case G14-4 proves the guard on a document's tag through the whole export; G1-2 and G10-2
 * prove the stored proposal's head and stage.
 */
import { describe, expect, it } from 'vitest';
import { deriveAssetRegister, documentStatuses, normaliseTag } from '@sovitech/domain';
import { PRODUCTION_CATALOGUE, fieldKeyOf, headlineOutputOf, priceStageOf, runEngine, snapshotRecordOf, type EngineField } from '@sovitech/engine';
import { AUTOMATION_FIELDS, GOAL_FIELDS, SCOPE_FIELDS, productionRegistry } from '@sovitech/registry';
import { GATE_IDS } from '@sovitech/registry/gates';
import { lineOf } from '../resolver';
import { stateOf, testDocument, testId } from '../test-builders';
import type { WorkspaceProject } from '../workspace';
import { CSV_BYTE_ORDER_MARK, csvCell, equipmentCsv, reportsView } from './exports';
import type { GeneratedOutput, ProposalBuildInput, ProposalField } from './inputs';
import { proposalView, versionsView } from './view';

/** A line's cells as a spreadsheet splits it on `separator`, honouring a quoted field only where a cell starts (RFC 4180). */
function cellsOf(line: string, separator: ',' | ';'): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? '';
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"' && cell === '') quoted = true;
    else if (character === separator) {
      cells.push(cell);
      cell = '';
    } else cell += character;
  }
  cells.push(cell);
  return cells;
}

/** Every cell a spreadsheet could start, split on ',' or on ';' (with quotes honoured, or read as plain characters), and on tabs and line ends. */
function everyCell(text: string): string[] {
  const lines = text.replace(/^\uFEFF/u, '').split(/\r\n|\r|\n/u);
  return lines.flatMap((line) => [
    ...cellsOf(line, ','),
    ...cellsOf(line, ';'),
    ...line.split(/[,;\t]/u).map((cell) => cell.replace(/^[ "]+/u, '')),
  ]);
}

const FORMULA_START = /^[=+\-@]/u;

const ATTACKS = ['TEST-AHU;=1+1;', "TEST;=cmd|' /C calc'!A0;", 'TEST;@SUM(1+1);', 'TEST;+1+1;', 'TEST;-1+1;', 'TEST\t@SUM(1+1)', 'TEST;  =1+1', 'TEST;"=1+1', 'TEST\r\n=1+1', 'TEST\n-1+1'];

describe('A-5 · rule 14 · the Equipment export\'s CSV-injection guard holds under a \';\' list separator', () => {
  it.each(ATTACKS)('A-5 · a cell %j is quoted, and no cell split on \',\' or \';\' starts with = + - or @', (text) => {
    const written = csvCell(text);
    expect(written.startsWith('"')).toBe(true);
    const line = `${written},From document,"Found in TEST lista.pdf, page 1"`;
    for (const cell of everyCell(line)) expect(cell, JSON.stringify(cell)).not.toMatch(FORMULA_START);
  });

  it('A-5 · the guard writes an apostrophe before the formula prefix only, and leaves other text as it was', () => {
    expect(csvCell('TEST-AHU;=1+1;')).toBe('"TEST-AHU;\'=1+1;"');
    expect(csvCell('TEST;  @SUM(1)')).toBe('"TEST;  \'@SUM(1)"');
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('TEST-AHU-01')).toBe('TEST-AHU-01');
    expect(csvCell('Found in TEST lista.pdf, page 1')).toBe('"Found in TEST lista.pdf, page 1"');
    expect(csvCell('TEST;A')).toBe('"TEST;A"');
    expect(csvCell('TEST "A"')).toBe('"TEST ""A"""');
  });
});

// ---------------------------------------------------------------------------------------------
// The whole export, over a TEST project in memory
// ---------------------------------------------------------------------------------------------

const PROJECT = testId(1);
const BUILDING = testId(2);
const ASSET = testId(3);
const LIST = testDocument(10, 'unknown');

/** A TEST project with one asset whose tag a TEST document wrote as `tag` (no asset field is registered: every other cell is Unknown). */
function projectWithTag(tag: string): WorkspaceProject {
  const evidence = { documentId: LIST.id, contentHash: LIST.contentHash, locator: { page: 1 }, excerpt: 'TEST lista', check: 'text_match' as const };
  const appearances = [{ id: testId(30), projectId: PROJECT, tagAsWritten: tag, evidence: [evidence] }];
  const statuses = documentStatuses([], (id) => (id === LIST.id ? LIST : undefined));
  return {
    projectId: PROJECT,
    buildingId: BUILDING,
    projectType: 'new_construction',
    documents: [LIST],
    activeDocuments: [LIST],
    fileName: (id) => (id === LIST.id ? 'TEST lista.pdf' : undefined),
    searched: false,
    closedGates: new Set(GATE_IDS),
    field: () => undefined,
    fields: [],
    resolve: () => undefined,
    register: deriveAssetRegister({ projectId: PROJECT, identities: [{ assetId: ASSET, projectId: PROJECT, normalisedTag: normaliseTag(tag) ?? 'TEST' }], appearances, events: [], documents: statuses }),
    appearances,
    zoneIds: [],
    suggestions: [],
    readingCount: 0,
  };
}

describe('A-5 · rule 8 · the Equipment export starts with a UTF-8 byte order mark, the demo line still its first line', () => {
  it('A-5 · G10-14 · the file starts with U+FEFF, then the demo line, then the header row; no "sep=" line', () => {
    const demo = lineOf('demo_data').text;
    const csv = equipmentCsv(projectWithTag('TEST-AHU-01'), {}, demo);
    expect(csv.startsWith(CSV_BYTE_ORDER_MARK)).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(cellsOf(lines[0] ?? '', ',')).toEqual([demo]);
    expect(csv).not.toMatch(/^\uFEFF?sep=/mu);
    expect(lines[1]?.startsWith('Tag,')).toBe(true);
  });

  it('A-5 · rule 14 · a tag a document wrote as "TEST-AHU;=1+1;" exports with no cell, split on \',\' or \';\', starting with a formula prefix', () => {
    const csv = equipmentCsv(projectWithTag('TEST-AHU;=1+1;'), {}, null);
    expect(csv).toContain('"TEST-AHU;\'=1+1;"');
    for (const cell of everyCell(csv)) expect(cell, JSON.stringify(cell)).not.toMatch(FORMULA_START);
  });
});

// ---------------------------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------------------------

const output = (n: number, startedAt: string, snapshotCreatedAt: string, superseded: GeneratedOutput['superseded'] = null): GeneratedOutput => ({
  id: testId(n),
  kind: 'proposal_pdf',
  snapshotId: testId(n + 100),
  startedAt,
  snapshotCreatedAt,
  startedByName: 'TEST owner',
  superseded,
});

const textOf = (built: ReturnType<typeof reportsView>, valueId: string | null | undefined): string | undefined => built.displayObjects.find((display) => display.valueId === valueId)?.text;

describe('DR-5 · US-PROPOSAL-11 AC3 · Reports names a proposal by its generation date and time', () => {
  it('DR-5 · two versions generated on one day are two names, each "Preliminary proposal generated D MMM YYYY, HH:MM"', () => {
    const built = reportsView([output(1, '2026-10-06T09:10:00.000000Z', '2026-10-06T09:04:00.000000Z'), output(2, '2026-10-06T14:40:00.000000Z', '2026-10-06T14:31:00.000000Z')], {});
    const names = built.view.rows.map((row) => textOf(built, row.name));
    expect(names).toEqual(['Preliminary proposal generated 6 Oct 2026, 14:31', 'Preliminary proposal generated 6 Oct 2026, 09:04']);
    expect(built.view.rows.map((row) => textOf(built, row.generatedAt))).toEqual(['6 Oct 2026, 14:40', '6 Oct 2026, 09:10']);
    // Search still reads the name.
    expect(reportsView([output(1, '2026-10-06T09:10:00Z', '2026-10-06T09:04:00Z')], { search: 'generated 6 oct' }).view.rows).toHaveLength(1);
  });
});

describe('V-2 · A-3 · rule 10 · "Superseded" on a record\'s issue day', () => {
  it('V-2 · A-3 · a row whose record is superseded on its issue day (as the engine answers it, a timestamp) reads "Superseded: inputs changed on 1 Oct 2026" and does not fail', () => {
    const built = reportsView([output(1, '2026-10-02T10:00:00.000000Z', '2026-10-01T09:00:00.000000Z', { changedOn: '2026-10-01T00:00:00Z' })], {});
    expect(textOf(built, built.view.rows[0]?.superseded)).toBe('Superseded: inputs changed on 1 Oct 2026');
  });
});

// ---------------------------------------------------------------------------------------------
// The stored proposal's versions and basis (view.ts)
// ---------------------------------------------------------------------------------------------

const SNAPSHOT = testId(100);
const EARLIER = testId(101);

/** A TEST project with no answer yet, as the API reads it for a stored version generated at `createdAt` (nothing stored anywhere). */
function emptyProposal(versions: ProposalBuildInput['versions']): ProposalBuildInput {
  const fields: ProposalField[] = productionRegistry.fields
    .filter((field) => field.subject === 'project' || field.subject === 'building')
    .map((field) => {
      const subjectId = field.subject === 'building' ? BUILDING : PROJECT;
      return { field, subjectId, subjectKind: field.subject, state: stateOf(field, subjectId, []), candidates: [], candidateEvents: [], asked: true, missingNow: true };
    });
  const engineFields = new Map<string, EngineField>(fields.map((field) => [fieldKeyOf(field.subjectId, field.field.key), { definition: field.field, subjectId: field.subjectId, state: field.state, candidates: [] }]));
  const run = runEngine(
    PRODUCTION_CATALOGUE,
    { projectId: PROJECT, fields: engineFields, subjectOf: (key) => fields.find((field) => field.field.key === key)?.subjectId, closedGates: new Set(GATE_IDS), datasets: () => undefined, author: testId(90) },
    { newId: () => testId(999), at: '2026-10-06T14:31:00.000000Z' },
  );
  const rows = [...snapshotRecordOf(run, []).outputs];
  return {
    projectId: PROJECT,
    buildingId: BUILDING,
    header: { projectId: PROJECT, name: `project:${PROJECT}.name`, isDemo: false, demoLine: null },
    snapshot: {
      id: SNAPSHOT,
      createdAt: '2026-10-06T14:31:00.000000Z',
      inputsHash: run.inputsHash,
      candidateIds: [],
      outputs: rows.map((row) => {
        const at = row.formula.lastIndexOf('@');
        return { output: row.output, formulaId: row.formula.slice(0, at), formulaVersion: row.formula.slice(at + 1), candidateId: row.candidateId, missing: [...row.missing], incomplete: row.incomplete };
      }),
      pendingDocumentIds: [],
      drafted: [],
    },
    snapshotCandidates: new Map(),
    current: fields,
    changes: { changedFields: [], outOfDateOutputs: new Set(), outOfDateOn: new Map(), changedOn: null },
    quotations: [],
    stage: (output) => {
      const row = rows.find((entry) => entry.output === output);
      return row === undefined ? { stage: null, quotationRecordId: null, superseded: null } : priceStageOf({ output: row, records: [], snapshotId: SNAPSHOT });
    },
    headlineOutput: headlineOutputOf(rows, false),
    catalogue: PRODUCTION_CATALOGUE,
    versions,
    stillReading: null,
    openItems: { view: { count: null, items: [], more: null, sovitechWillCheck: [] }, displays: [] },
    closedGates: new Set(GATE_IDS),
    documents: [],
    activeDocumentIds: new Set(),
    fileName: () => undefined,
    projectType: 'new_construction',
    verificationOf: () => 'unverified',
  };
}

const VERSIONS = [
  { snapshotId: SNAPSHOT, createdAt: '2026-10-06T14:31:00.000000Z' },
  { snapshotId: EARLIER, createdAt: '2026-10-06T09:04:00.000000Z' },
];

describe('DR-5 · US-PROPOSAL-11 AC3 · versions generated on one day read apart', () => {
  it('DR-5 · each version\'s generation reads "D MMM YYYY, HH:MM", on the versions list and on the stored proposal', () => {
    const listed = versionsView(VERSIONS);
    expect(listed.view.versions.map((version) => listed.displayObjects.find((display) => display.valueId === version.generatedOn)?.text)).toEqual(['6 Oct 2026, 14:31', '6 Oct 2026, 09:04']);
    const built = proposalView(emptyProposal(VERSIONS));
    const generatedOn = built.displayObjects.find((display) => display.valueId === built.view.generatedOn);
    expect(generatedOn).toMatchObject({ kind: 'record', text: '6 Oct 2026, 14:31', parts: ['6 Oct 2026, 14:31'] });
  });
});

describe('DR-12 · the basis lists the inputs by intake step, then in registry order', () => {
  it('DR-12 · the project, the building, the systems, the operation, the goals, the automation areas: each step\'s inputs together', () => {
    const built = proposalView(emptyProposal(VERSIONS));
    const prefix = `proposal:${SNAPSHOT}.inputs.`;
    const keys = built.view.basis.map((valueId) => valueId.slice(prefix.length));
    const step = (key: string): number =>
      ['project.name', 'project.type', 'project.country', 'project.city'].includes(key) ? 1
      : ['building.grossFloorArea', 'building.floors', 'building.rooms', 'building.zones'].includes(key) ? 3
      : SCOPE_FIELDS.includes(key) ? 4
      : ['building.type', 'project.operatingSchedule', 'project.occupancy'].includes(key) ? 5
      : GOAL_FIELDS.includes(key) ? 6
      : AUTOMATION_FIELDS.includes(key) ? 7
      : 9;
    const steps = keys.map(step);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(new Set(steps).size).toBeGreaterThanOrEqual(4);
    // Within a step, the registry's order; each input once.
    const registryOrder = productionRegistry.fields.map((field) => field.key);
    for (let index = 1; index < keys.length; index += 1) {
      const [before, after] = [keys[index - 1] ?? '', keys[index] ?? ''];
      if (step(before) === step(after)) expect(registryOrder.indexOf(before)).toBeLessThan(registryOrder.indexOf(after));
    }
    expect(new Set(keys).size).toBe(keys.length);
    // The systems in scope sit together, as do the automation areas.
    const scope = keys.flatMap((key, index) => (SCOPE_FIELDS.includes(key) ? [index] : []));
    const [first] = scope;
    const last = scope.at(-1);
    if (first === undefined || last === undefined) throw new Error('the basis lists no system in scope');
    expect(last - first).toBe(scope.length - 1);
  });
});
