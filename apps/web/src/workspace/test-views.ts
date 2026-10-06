/**
 * TEST responses of the workspace routes for the web's component tests (happy-dom), in the contract's
 * shapes (packages/view-model/src/browser/contract/workspace.ts): the client parses every fake answer with
 * the route's schema, as it parses the API's. Not a test itself, and never imported by the app. Every
 * name and value is TEST data in a digit pattern; none is a figure of the mockups or of a real building.
 */
import type { DisplayObject, DocumentRow, Line } from '@sovitech/view-model/browser';

/** As ../test/harness.ts serves them (kept here so this file needs no test runner). */
const DEMO_LINE: Line = { id: 'demo_project', kind: 'demo_line', text: 'TEST demo line' };
function nameDisplay(projectId: string, text: string): DisplayObject {
  return { valueId: `project:${projectId}.name`, kind: 'field', text, shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
}

export const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e70';
export const AS_OF = '2026-10-02T09:00:00.000Z';

function envelopeOf(projectId: string, displayObjects: readonly DisplayObject[], options: { readonly demo?: boolean; readonly name?: string }) {
  const name = nameDisplay(projectId, options.name ?? 'TEST project');
  return {
    asOf: AS_OF,
    project: { projectId, name: name.valueId, isDemo: options.demo === true, demoLine: options.demo === true ? DEMO_LINE : null },
    displayObjects: [name, ...displayObjects],
  };
}

const unknown = (valueId: string, label?: string): DisplayObject => ({
  valueId,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
  ...(label === undefined ? {} : { measure: { label } }),
});

const line = (valueId: string, text: string): DisplayObject => ({ valueId, kind: 'line', text, shape: 'value', lines: [{ id: 'still_reading', kind: 'status_line', text }] });

export interface FrameOptions {
  readonly demo?: boolean;
  readonly name?: string;
  /** Serves the footer's "Still reading" line. */
  readonly stillReading?: boolean;
  readonly pages?: readonly string[];
}

/** `GET /api/projects/:projectId/workspace` for a TEST project: the card's facts, the footer, no floor structure known. */
export function frameResponse(projectId: string, options: FrameOptions = {}) {
  const projectType: DisplayObject = {
    valueId: `project:${projectId}.type`,
    kind: 'field',
    text: 'TEST project type',
    shape: 'value',
    badge: { id: 'provided_by_you', label: 'TEST provided badge' },
    measure: { label: 'TEST project type label' },
    sourceLine: { id: 'source_step_1', kind: 'source_line', text: 'TEST entered on step 1' },
  };
  const area: DisplayObject = {
    valueId: `building:${BUILDING}.grossFloorArea`,
    kind: 'field',
    text: 'TEST 1234 m²',
    parts: ['1234', 'm²'],
    shape: 'value',
    badge: { id: 'from_document', label: 'TEST document badge' },
    measure: { label: 'TEST area label', unit: { code: 'm2', symbol: 'm²' }, qualifierLabel: 'TEST basis' },
    sourceLine: { id: 'source_document', kind: 'source_line', text: 'TEST found in TEST-1.pdf' },
  };
  const displays: DisplayObject[] = [
    projectType,
    unknown(`building:${BUILDING}.type`, 'TEST building type label'),
    area,
    { valueId: `project:${projectId}.floors.missing`, kind: 'line', text: 'TEST not available: the floor structure', shape: 'missing', missing: 'not_available_yet' },
  ];
  if (options.stillReading === true) displays.push(line(`project:${projectId}.stillReading`, 'TEST still reading 2 files'));
  return {
    ...envelopeOf(projectId, displays, options),
    view: {
      pages: options.pages ?? ['proposal', 'system_scope', 'topology', 'zones', 'equipment', 'documents', 'reports'],
      projectCard: { projectType: projectType.valueId, buildingType: `building:${BUILDING}.type`, grossFloorArea: area.valueId, rooms: [], floors: [] },
      footer: { stillReading: options.stillReading === true ? `project:${projectId}.stillReading` : null },
      levels: { state: 'unknown', line: `project:${projectId}.floors.missing`, actions: ['upload_document', 'enter_floors'] },
    },
  };
}

export interface TestDocument {
  readonly documentId: string;
  readonly name: string;
  readonly addedAt: string;
  readonly format?: DocumentRow['format'];
  /** The kind's chip, when a classifier set it (TEST): null reads Unknown (G1-26). */
  readonly category?: DocumentRow['category'];
  /** The stage's served text, or Unknown. */
  readonly stage?: string;
  /** Still being read: the row's bar, with no line. */
  readonly reading?: boolean;
  readonly revisionOf?: string;
  readonly downloadable?: boolean;
}

/** `GET /api/projects/:projectId/workspace/documents` with the given TEST documents. */
export function documentsResponse(projectId: string, documents: readonly TestDocument[], options: { readonly demo?: boolean } = {}) {
  const displays: DisplayObject[] = [];
  const rows = documents.map((document) => {
    const id = document.documentId;
    displays.push({ valueId: `document:${id}.fileName`, kind: 'record', text: document.name, shape: 'value' });
    displays.push(
      document.category === undefined || document.category === null
        ? unknown(`document:${id}.kind`)
        : { valueId: `document:${id}.kind`, kind: 'field', text: `TEST ${document.category}`, shape: 'value', badge: { id: 'likely', label: 'TEST likely badge' } },
    );
    displays.push({ valueId: `document:${id}.revision`, kind: 'record', text: 'TEST rev 2', shape: 'value', sourceLine: { id: 'source_title_block', kind: 'source_line', text: 'TEST as written' } });
    displays.push(
      document.stage === undefined
        ? unknown(`document:${id}.stage`)
        : { valueId: `document:${id}.stage`, kind: 'field', text: document.stage, shape: 'value', badge: { id: 'from_document', label: 'TEST document badge' } },
    );
    if (document.reading !== true) displays.push(line(`document:${id}.coverage`, 'TEST read, pages 1 to 4'));
    return {
      documentId: id,
      fileName: `document:${id}.fileName`,
      format: document.format ?? 'pdf',
      category: document.category ?? null,
      categoryValue: `document:${id}.kind`,
      revision: `document:${id}.revision`,
      stage: `document:${id}.stage`,
      addedAt: document.addedAt,
      status: document.reading === true ? { kind: 'progress' } : { kind: 'line', valueId: `document:${id}.coverage` },
      revisionOf: document.revisionOf === undefined ? null : `document:${document.revisionOf}.fileName`,
      downloadable: document.downloadable ?? true,
    };
  });
  return {
    ...envelopeOf(projectId, displays, options),
    view: { state: rows.length === 0 ? 'no_documents' : 'listed', rows, stillReading: null },
  };
}

/** `GET …/documents/:documentId/delete-effect`: the served effect line, its count bound. */
export function deleteEffectResponse(projectId: string, documentId: string, text = 'TEST 3 values will return to Unknown') {
  const effect: DisplayObject = { valueId: `document:${documentId}.deleteEffect`, kind: 'line', text, shape: 'value' };
  const name: DisplayObject = { valueId: `document:${documentId}.fileName`, kind: 'record', text: 'TEST effect name', shape: 'value' };
  return { ...envelopeOf(projectId, [effect, name], {}), view: { documentId, fileName: name.valueId, effect: effect.valueId } };
}

/** A TEST document id with a two-digit suffix (`doc(1)` … `doc(25)`). */
export function doc(n: number): string {
  return `0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8f${String(n).padStart(2, '0')}`;
}

/** A TEST date, day `day` of September 2026, at noon UTC. */
export function addedOn(day: number): string {
  return `2026-09-${String(day).padStart(2, '0')}T12:00:00.000Z`;
}
