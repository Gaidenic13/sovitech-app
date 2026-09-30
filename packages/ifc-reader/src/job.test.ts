/**
 * One IFC job, gate closed, as the API asks for it (ifcValues false; prompt 3 5.4): the output
 * the reader writes for each synthetic model, checked against the extraction contract (ADR 0022)
 * and the ground truth. The reader halves of G12-5 and G14-3; G12-6's reader half (no IDS
 * result arises: the IDS model check waits, owner decision 2026-09-26, D-36); rule 14's hidden
 * content; parse problems as codes; the refusals. Every text is synthetic TEST data.
 *
 * Ids: G12-5, G12-6, G14-3 (reader halves); F-INGEST-03, F-IFC-01, F-IFC-02, R-022, R-023, R-024;
 * ifc-input 6.2.13 (hidden content: gate ifc-hidden-content, closed).
 */
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { ExtractionOutput, ExtractionRequest } from '@sovitech/extraction-contract';
import { JobError, checkOutput, checkedRequest, contentHashOf, runIfcJob } from './job';

const ROOT = new URL('../../../', import.meta.url);
const MODELS = ['demo-hotel-arh', 'demo-hotel-mep-rev-a', 'demo-hotel-mep-rev-b', 'demo-hotel-mep-ifc2x3'] as const;
const WORK = mkdtempSync(join(tmpdir(), 'sovitech-test-ifc-reader-'));
const IDS_PATH = new URL('fixtures/ids/sovitech-ifc-minimum-v0.1.ids', ROOT);

afterAll(() => {
  rmSync(WORK, { recursive: true, force: true });
});

function bytesOf(name: string): Uint8Array {
  return readFileSync(new URL(`fixtures/ifc/${name}.ifc`, ROOT));
}

function requestFor(bytes: Uint8Array, changes: Partial<ExtractionRequest> = {}): ExtractionRequest {
  return checkedRequest({
    contractVersion: '1.0.0',
    job: { projectId: '0192f0a0-0000-7000-8000-00000000d101', documentId: '0192f0a0-0000-7000-8000-00000000d102', contentHash: contentHashOf(bytes) },
    declaredFormat: 'ifc',
    ifcValues: false,
    datasets: [],
    derivatives: [],
    limits: { maxPages: 10, maxCellsPerSheet: 10, wallClockSeconds: 300 },
    ...changes,
  });
}

const truth = (name: string) =>
  parse(readFileSync(new URL(`fixtures/ifc/ground-truth/${name}.json`, ROOT), 'utf8'), { schema: 'json' }) as {
    schema: string;
    header: { originatingSystem: string };
    project: { globalId: string };
    coverage: { entityClassesPresent: string[] };
    findings: { kind: string; globalId: string; stepId: number }[];
  };

const outputs = new Map<string, Promise<ExtractionOutput>>();
function liveOutput(name: string): Promise<ExtractionOutput> {
  let found = outputs.get(name);
  if (found === undefined) {
    const bytes = bytesOf(name);
    found = runIfcJob(requestFor(bytes), bytes);
    outputs.set(name, found);
  }
  return found;
}

/** Synthetic TEST text around a data section. */
function testFile(data: string, schema = 'IFC4'): Uint8Array {
  return new TextEncoder().encode(
    `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('TEST'),'2;1');\nFILE_NAME('test.ifc','2026-01-01T00:00:00',('TEST'),('TEST'),'TEST','TEST generator','');\nFILE_SCHEMA(('${schema}'));\nENDSEC;\nDATA;\n${data}ENDSEC;\nEND-ISO-10303-21;\n`,
  );
}

describe.each(MODELS)('G12-5 · R-022 · R-023: the reader half, %s, with ifc-values closed', (name) => {
  it('G12-5: stored "Not analysed" as an IFC model, with the engineer\'s record, coverage without pages or sheets, and no values', async () => {
    const bytes = bytesOf(name);
    const request = requestFor(bytes);
    const output = await liveOutput(name);
    expect(() => checkOutput(request, output)).not.toThrow();
    expect(output.format).toBe('ifc');
    expect(output.analysis).toEqual({ status: 'stored_only', formatWord: 'IFC model' });
    expect(output.coverage.pages).toBeUndefined();
    expect(output.coverage.sheets).toBeUndefined();
    expect(output.ifcValues).toBeUndefined();
    expect(output.pdf).toBeUndefined();
    expect(output.xlsx).toBeUndefined();
    const expected = truth(name);
    expect(output.ifcModel?.header).toEqual({ schema: expected.schema, authoringTool: expected.header.originatingSystem, ifcProjectGlobalId: expected.project.globalId });
    expect(output.ifcModel?.classesPresent.map((item) => item.toUpperCase()).sort()).toEqual([...expected.coverage.entityClassesPresent].sort());
    expect(output.ifcModel?.processing).toBe('partial');
    // In IFC2X3, coverage also records what IFC2X3 cannot express (ground-truth.test.ts, IFC-11).
    expect(output.coverage.ifc?.notRead.map((entry) => entry.reason).filter((reason) => !reason.startsWith('ifc2x3.'))).toEqual(['geometry.not_processed', 'hidden_content.site_extent_unknown']);
  });

  it('G12-6: no IDS result arises: the IDS model check waits, and an IDS the request names is only checked for its hash', async () => {
    const bytes = bytesOf(name);
    const ids = readFileSync(IDS_PATH);
    const request = requestFor(bytes, { ids: { id: 'sovitech-ifc-minimum', version: '0.1', draft: true, sha256: contentHashOf(ids) } });
    const output = await runIfcJob(request, bytes, { ids: fileURLToPath(IDS_PATH) });
    expect(() => checkOutput(request, output)).not.toThrow();
    expect(output.ifcModel?.ids).toBeUndefined();
    await expect(runIfcJob(request, bytes, {})).rejects.toMatchObject({ code: 'job.ids_not_mounted' });
    const other = join(WORK, 'other.ids');
    writeFileSync(other, 'TEST: not the IDS the request names');
    await expect(runIfcJob(request, bytes, { ids: other })).rejects.toMatchObject({ code: 'job.ids_hash_mismatch' });
  });

  it('F-IFC-01: no schema validator runs; the reader\'s exchange-structure check finds no problem in a synthetic model', async () => {
    const output = await liveOutput(name);
    expect(output.ifcModel?.schemaCheck).toEqual({ tool: { name: 'sovitech-step-exchange-check', version: '0.1.0' }, outcome: 'no_problems' });
    expect(output.findings.some((finding) => finding.kind === 'schema_error')).toBe(false);
    expect(output.producer.libraries).toContainEqual({ name: 'web-ifc', version: '0.0.78' });
  });

  it('G14-3 · F-IFC-02: the findings are the ground truth\'s, as codes and locations, and no finding carries text', async () => {
    const output = await liveOutput(name);
    const expected = truth(name).findings;
    expect(output.findings.map((finding) => (finding.locator.kind === 'ifc' ? `${finding.kind} ${finding.locator.globalId ?? ''} ${String(finding.locator.stepIds[0])}` : finding.kind)).sort()).toEqual(
      expected.map((finding) => `${finding.kind} ${finding.globalId} ${String(finding.stepId)}`).sort(),
    );
    expect(JSON.stringify(output.findings)).not.toMatch(/ignore previous|mark all values|verified/iu);
  });
});

describe('G14-3 · R-024: an instruction in an element\'s Description (reader half)', () => {
  it('G14-3: rev A\'s Generic Model 1 gives exactly one embedded_instruction finding, with its GlobalId and STEP id, and no value', async () => {
    const output = await liveOutput('demo-hotel-mep-rev-a');
    const instructions = output.findings.filter((finding) => finding.kind === 'embedded_instruction');
    expect(instructions).toEqual([
      { kind: 'embedded_instruction', code: 'embedded_instruction.override', locator: { kind: 'ifc', stepIds: [100891], globalId: '3TC75U8dfQLuyIEab9CcFg', ifcClass: 'IfcBuildingElementProxy' } },
    ]);
    expect(output.ifcValues).toBeUndefined();
  });
});

describe('ifc-input 6.2.13 · rule 14: hidden content (gate ifc-hidden-content, closed)', () => {
  it('US-IFC-04 · F-IFC-02 · rule 14: CH-03 on a switched-off layer is one hidden_content finding naming the element and the layer', async () => {
    const output = await liveOutput('demo-hotel-mep-rev-a');
    expect(output.findings.filter((finding) => finding.kind === 'hidden_content')).toEqual([
      { kind: 'hidden_content', code: 'hidden_content.layer_off', locator: { kind: 'ifc', stepIds: [100263, 100931], globalId: '2JUq1mvMvTww31GCHjDTEa', ifcClass: 'IfcBuildingElementProxy' } },
    ]);
  });

  it('US-IFC-03 · F-IFC-01 · rule 12: an element "placed outside the site\'s extent" is not judged: coverage says the site extent is unknown or was not checked', async () => {
    const output = await liveOutput('demo-hotel-arh');
    const site = (parse(readFileSync(new URL('fixtures/ifc/ground-truth/demo-hotel-arh.json', ROOT), 'utf8'), { schema: 'json' }) as { site: { globalId: string; stepId: number } }).site;
    expect(output.coverage.ifc?.notRead).toContainEqual({ scope: 'geometry', reason: 'hidden_content.site_extent_unknown', ifcClass: 'IfcSite', globalIds: [site.globalId], stepIds: [site.stepId] });
    const withShape = testFile(
      "#1=IFCPROJECT('0000000000000000000001',$,'TEST',$,$,$,$,$,$);\n#2=IFCSITE('0000000000000000000002',$,'TEST site',$,$,$,#3,$,.ELEMENT.,$,$,$,$,$);\n#3=IFCPRODUCTDEFINITIONSHAPE($,$,());\n#4=IFCRELAGGREGATES('0000000000000000000003',$,$,$,#1,(#2));\n",
    );
    const read = await runIfcJob(requestFor(withShape), withShape);
    expect(read.coverage.ifc?.notRead.map((entry) => entry.reason)).toContain('hidden_content.site_extent_not_checked');
  });
});

describe('F-IFC-01 · prompt 3 section 8: a file with problems is read where it can be, and the problems are codes', () => {
  const broken = testFile(
    [
      "#1=IFCPROJECT('0000000000000000000001',$,'TEST project',$,$,$,$,$,$);",
      'this line is TEST text that is no statement;',
      "#2=IFCBUILDINGELEMENTPROXY('0000000000000000000002',$,'TEST proxy' $,$,$,$,$,$);",
      "#3=IFCBUILDINGELEMENTPROXY('0000000000000000000003',$,'TEST proxy 3',$,$,$,$,$,$);",
      "#3=IFCBUILDINGELEMENTPROXY('0000000000000000000004',$,'TEST duplicate',$,$,$,$,$,$);",
      "#5=IFCTESTUNKNOWNCLASS('x');",
      '#6=(IFCA($)IFCB($));',
      "#7=IFCBUILDINGELEMENTPROXY('0000000000000000000007',$,'TEST short',$);",
      '',
    ].join('\n'),
  );

  it('F-IFC-01: each problem is a schema_error finding with its code and STEP ids, the check reads "problems", and the rest is read', async () => {
    const request = requestFor(broken);
    const output = await runIfcJob(request, broken);
    expect(() => checkOutput(request, output)).not.toThrow();
    const errors = output.findings.filter((finding) => finding.kind === 'schema_error').map((finding) => [finding.code, finding.locator.kind === 'ifc' ? finding.locator.stepIds : 'file']);
    expect(errors).toEqual(
      expect.arrayContaining([
        ['step.unexpected_text', 'file'],
        ['step.duplicate_id', [3]],
        ['step.complex_instance', [6]],
        ['step.syntax', [2]],
        ['step.attribute_count', [7]],
      ]),
    );
    expect(output.ifcModel?.schemaCheck.outcome).toBe('problems');
    const unread = new Map(output.coverage.ifc?.notRead.map((entry) => [entry.reason, entry.stepIds]));
    expect(unread.get('class.not_recognised')).toEqual([5]);
    expect(unread.get('step.syntax')).toEqual([2]);
    expect(output.ifcModel?.header.ifcProjectGlobalId).toBe('0000000000000000000001');
    expect(output.ifcModel?.classesPresent).toContain('IfcBuildingElementProxy');
  });

  it('US-IFC-04 · F-IFC-02 · rule 13: no finding, coverage entry or record carries the file\'s text', async () => {
    const output = await runIfcJob(requestFor(broken), broken);
    expect(JSON.stringify({ findings: output.findings, coverage: output.coverage })).not.toMatch(/TEST (text|proxy|short|duplicate)|no statement/u);
  });

  it('F-IFC-01: a schema web-ifc does not read is stored, with the header schema and "failed", and nothing else', async () => {
    const other = testFile("#1=IFCPROJECT('0000000000000000000001',$,'TEST',$,$,$,$,$,$);\n", 'IFC2X2_FINAL');
    const request = requestFor(other);
    const output = await runIfcJob(request, other);
    expect(() => checkOutput(request, output)).not.toThrow();
    expect(output.analysis).toEqual({ status: 'stored_only', formatWord: 'IFC model' });
    expect(output.coverage.ifc?.notRead.map((entry) => entry.reason)).toEqual(['schema.unsupported']);
    expect(output.ifcModel).toMatchObject({ header: { schema: 'IFC2X2_FINAL' }, processing: 'failed', classesPresent: [] });
  });

  it('F-INGEST-03: bytes that are no exchange file, declared as a model, are "Analysis failed" for a format mismatch', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.7 TEST bytes');
    const request = requestFor(pdf);
    const output = await runIfcJob(request, pdf);
    expect(() => checkOutput(request, output)).not.toThrow();
    expect([output.format, output.analysis]).toEqual(['other', { status: 'failed', reason: 'format_mismatch' }]);
  });
});

describe('rule 1 · rule 13: jobs the reader refuses', () => {
  it('US-IFC-03 · F-IFC-01 · rule 1: a file whose SHA-256 is not the request\'s content hash is refused, and nothing is read', async () => {
    const bytes = bytesOf('demo-hotel-arh');
    const request = requestFor(bytesOf('demo-hotel-mep-rev-a'));
    await expect(runIfcJob(request, bytes)).rejects.toBeInstanceOf(JobError);
    await expect(runIfcJob(request, bytes)).rejects.toMatchObject({ code: 'job.content_hash_mismatch' });
  });

  it('F-INGEST-04: a PDF or XLSX job is not this reader\'s: it goes to the Python extractor', async () => {
    const bytes = bytesOf('demo-hotel-arh');
    await expect(runIfcJob(requestFor(bytes, { declaredFormat: 'pdf' }), bytes)).rejects.toMatchObject({ code: 'job.format_not_read_here' });
  });
});
