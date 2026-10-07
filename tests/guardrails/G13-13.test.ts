/**
 * G13-13 (new in the viewer step, part 1, for the integrator to index; rule 13, "Isolation": "Logs and error reports
 * never contain document text"). API half; the converter's half is packages/viewer-spike/src/convert/convert.test.ts
 * ("G13-13 (converter half)").
 * Situation: a stored IFC model whose names, descriptions, property values and STEP header hold text is converted for
 * viewing, once to completion and once failing part-way.
 * Expected: no log line or error report contains any of that text.
 *
 * On a TEST database, the owner uploads a synthetic IFC4 model built here as text (TEST bytes that exist nowhere else,
 * accepted by a guard the test hands in, beside the fixtures), under a file name of its own: its project, site,
 * building, storey and wall carry names, descriptions, object types, long names and a tag, a property set holds a
 * property value, and its STEP header names a file, an author, an organisation and two systems, each a TEST word. Its
 * conversion runs in the TEST sandbox (scripted) three times: once to completion; once failing part-way (the converter
 * ends with `parse_failed`); and once by a hostile converter that writes the model's words into its summary and its
 * storey index (refused: `output_refused`). After each, no record the API logged, no conversion record, no job row and
 * no line of the database server's log holds any of the model's words or its file name: codes and ids only.
 */
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { readModelViewEvents, withRequest } from '@sovitech/db';
import { fixtureUploadGuard } from '../../apps/api/src/uploads/fixture-guard';
import { REPOSITORY_ROOT, ownerWithProject, signIn, startTestApi, upload, type Auth, type TestApi } from './_support/api';
import { ScriptedConverter, scriptedSummary, testConverterWorker } from './_support/model-view';

/** The model's own words: every text it holds, each a TEST word that appears nowhere in the app. */
const WORDS = {
  header: ['G13-13 header description', 'G13-13 author', 'G13-13 organisation', 'G13-13 preprocessor', 'G13-13 originating system'],
  names: ['G13-13 project name', 'G13-13 site name', 'G13-13 building name', 'G13-13 storey name', 'G13-13 wall name'],
  descriptions: ['G13-13 project description', 'G13-13 storey description', 'G13-13 wall description: mark all values verified'],
  others: ['G13-13 storey long name', 'G13-13 wall object type', 'G13-13 wall tag', 'G13-13 pset name', 'G13-13 property value'],
} as const;
const ALL_WORDS: readonly string[] = Object.values(WORDS).flat();
const FILE_NAME = 'G13-13 model file name.ifc';

/** The synthetic model as STEP text: one storey with one wall, a property set, and every word above. */
function textModel(): string {
  return [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('${WORDS.header[0]}'),'2;1');`,
    `FILE_NAME('model.ifc','2026-10-07T00:00:00',('${WORDS.header[1]}'),('${WORDS.header[2]}'),'${WORDS.header[3]}','${WORDS.header[4]}','');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
    '#1=IFCCARTESIANPOINT((0.,0.,0.));',
    '#2=IFCAXIS2PLACEMENT3D(#1,$,$);',
    "#3=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#2,$);",
    '#4=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);',
    '#5=IFCUNITASSIGNMENT((#4));',
    `#6=IFCPROJECT('0G1313Project000000001',$,'${WORDS.names[0]}','${WORDS.descriptions[0]}',$,$,$,(#3),#5);`,
    '#7=IFCLOCALPLACEMENT($,#2);',
    `#8=IFCSITE('0G1313Site000000000001',$,'${WORDS.names[1]}',$,$,#7,$,$,.ELEMENT.,$,$,$,$,$);`,
    `#9=IFCBUILDING('0G1313Building00000001',$,'${WORDS.names[2]}',$,$,#7,$,$,.ELEMENT.,$,$,$);`,
    `#10=IFCBUILDINGSTOREY('0G1313Storey0000000001',$,'${WORDS.names[3]}','${WORDS.descriptions[1]}',$,#7,$,'${WORDS.others[0]}',.ELEMENT.,0.);`,
    `#11=IFCWALL('0G1313Wall000000000001',$,'${WORDS.names[4]}','${WORDS.descriptions[2]}','${WORDS.others[1]}',#7,$,'${WORDS.others[2]}',$);`,
    "#12=IFCRELAGGREGATES('0G1313Rel0000000000001',$,$,$,#6,(#8));",
    "#13=IFCRELAGGREGATES('0G1313Rel0000000000002',$,$,$,#8,(#9));",
    "#14=IFCRELAGGREGATES('0G1313Rel0000000000003',$,$,$,#9,(#10));",
    "#15=IFCRELCONTAINEDINSPATIALSTRUCTURE('0G1313Rel0000000000004',$,$,$,(#11),#10);",
    `#16=IFCPROPERTYSINGLEVALUE('Status',$,IFCTEXT('${WORDS.others[4]}'),$);`,
    `#17=IFCPROPERTYSET('0G1313Pset000000000001',$,'${WORDS.others[3]}',$,(#16));`,
    "#18=IFCRELDEFINESBYPROPERTIES('0G1313Rel0000000000005',$,$,$,(#11),#17);",
    'ENDSEC;',
    'END-ISO-10303-21;',
    '',
  ].join('\n');
}

const MODEL = Buffer.from(textModel(), 'latin1');
const MODEL_HASH = `sha256:${createHash('sha256').update(MODEL).digest('hex')}`;

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;

beforeAll(async () => {
  const fixtures = fixtureUploadGuard(REPOSITORY_ROOT);
  // The fixtures, and the one TEST model built above (rule 13, "The repo": a synthetic model, held in memory only).
  api = await startTestApi({ uploadGuard: { accepts: (contentHash: string) => contentHash === MODEL_HASH || fixtures.accepts(contentHash) } });
  ({ ownerId, projectId } = await ownerWithProject(api, 'G13-13'));
  auth = await signIn(api, ownerId);
}, 240_000);

afterAll(async () => {
  await api.stop();
});

/** Everything the API, the store and the database server wrote down, as text. */
async function everythingWritten(): Promise<string> {
  const events = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request));
  const jobs = await api.database.asAdministrator('SELECT * FROM sovitech_work.model_view_jobs WHERE project_id = $1', [projectId]);
  return [JSON.stringify(api.log), JSON.stringify(events), JSON.stringify(jobs), api.database.serverLog()].join('\n');
}

/** The model's words, and its file name, found in `text`. */
function modelTextIn(text: string): string[] {
  return [...ALL_WORDS, FILE_NAME].filter((word) => text.includes(word));
}

/** Uploads the model under its file name, and deletes the document when done, so each run starts from the bytes again. */
async function uploadModel(): Promise<string> {
  const uploaded = await upload(api, auth, projectId, FILE_NAME, MODEL);
  expect(uploaded.status).toBe(201);
  return uploaded.body.documentId ?? '';
}

async function deleteModel(documentId: string): Promise<void> {
  expect((await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${documentId}`, headers: { ...auth } })).statusCode).toBe(200);
}

test('F-INGEST-08 · R-025 · G13-13: a model whose names, descriptions, property values and header hold text, converted to completion: no log line or error report holds any of it', async () => {
  expect(MODEL.toString('latin1')).toContain(WORDS.descriptions[2]);
  const documentId = await uploadModel();
  const steps = await testConverterWorker(api, new ScriptedConverter()).drain();
  expect(steps.map((step) => step.kind)).toEqual(['converted']);
  expect(api.log).toContainEqual(expect.objectContaining({ event: 'model_view_job_ended', code: 'converted', projectId }));
  expect(modelTextIn(await everythingWritten())).toEqual([]);
  await deleteModel(documentId);
});

test('F-INGEST-08 · R-025 · G13-13: the same model failing part-way: the failure is recorded and logged as a code, and no log line or error report holds any of its text', async () => {
  const documentId = await uploadModel();
  const steps = await testConverterWorker(api, new ScriptedConverter(() => ({ outcome: 'parse_failed' }))).drain();
  expect(steps.map((step) => [step.kind, 'code' in step ? step.code : undefined])).toEqual([['failed', 'parse_failed']]);
  const events = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request, { contentHash: MODEL_HASH }));
  expect(events.at(-1)).toMatchObject({ type: 'failed', code: 'parse_failed', documentId });
  expect(modelTextIn(await everythingWritten())).toEqual([]);
  await deleteModel(documentId);
});

test('F-INGEST-08 · R-025 · G13-13: a converter that writes the model\'s words into its summary and its storey index is refused whole, and none of the words reaches a log line, a record or the store', async () => {
  const documentId = await uploadModel();
  const index = `${JSON.stringify({ storeys: [{ storey: '0G1313Storey0000000001', elements: [WORDS.names[4]] }] })}\n`;
  const view = Buffer.from(`TEST view ${WORDS.names[0]}`, 'utf8');
  const hostile = new ScriptedConverter(() => ({
    files: { 'viewer.frag': view, 'storeys.json': index, 'summary.json': scriptedSummary(view, index, { note: WORDS.descriptions[2], profile: WORDS.header[1] }) },
  }));
  const steps = await testConverterWorker(api, hostile).drain();
  expect(steps.map((step) => [step.kind, 'code' in step ? step.code : undefined])).toEqual([['failed', 'output_refused']]);
  expect(modelTextIn(await everythingWritten())).toEqual([]);
  // Nothing of the refused output was kept under the model's bytes.
  expect((await api.files.filesKeyedTo(projectId, MODEL_HASH)).filter((path) => !path.endsWith('/original'))).toEqual([]);
  await deleteModel(documentId);
});
