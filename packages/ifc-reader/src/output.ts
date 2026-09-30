/**
 * From what the data pass read to the contract's ExtractionOutput (ADR 0022).
 *
 * An IFC file is always "Not analysed: IFC model stored, not analysed" while its values cannot
 * be stored (G12-5), with what the reader processed in `ifcModel`, for the engineer only
 * (R-023): the header's schema as written, the authoring tool, the IfcProject GlobalId, the
 * classes present, whether the data pass completed, the reader's exchange-structure check (no
 * schema validator is used: owner decision 2026-09-26) and no IDS result (the IDS model check
 * waits, D-36). Coverage says what was read and what was not, by code; findings carry codes and
 * locations, never text (rule 13). The sealed values go in only when the request asked for them.
 */
import type { ExtractionOutput, Finding, IfcCandidateProposal, IfcFact, Job } from '@sovitech/extraction-contract';
import type { NotRead } from './model';
import type { ModelReading, Finding as ReadingFinding } from './reading';

/** The reader's version: the producer's version in every output it writes. */
export const READER_VERSION = '0.1.0';
/** The extraction service's name in the contract (Producer.name is one constant for both readers). */
const PRODUCER = 'sovitech-extractor';
const SCHEMA_ID = /^IFC[0-9A-Z_]{1,24}$/u;
const AUTHORING_MAX = 500;
const FINDINGS_MAX = 100000;

/**
 * The check the contract's schemaCheck records. No schema validator runs: the owner's decision
 * of 2026-09-26 leaves ifcopenshell.validate unused, and web-ifc validates nothing. What runs is
 * the reader's exchange-structure check, named as such: the file's statements read under
 * ISO 10303-21, and every instance the data pass reads read alike by web-ifc and the text reader
 * (the schema's attribute count, the same literals). Its problems are the schema_error findings.
 * It checks no type, WHERE rule or inverse cardinality: it is not a schema validation.
 */
function schemaCheck(findings: readonly Finding[]): NonNullable<ExtractionOutput['ifcModel']>['schemaCheck'] {
  const problems = findings.some((item) => item.kind === 'schema_error');
  return { tool: { name: 'sovitech-step-exchange-check', version: READER_VERSION }, outcome: problems ? 'problems' : 'no_problems' };
}

function producer(webIfcVersion: string): ExtractionOutput['producer'] {
  return {
    name: PRODUCER,
    version: READER_VERSION,
    libraries: [
      { name: 'sovitech-ifc-reader', version: READER_VERSION },
      { name: 'web-ifc', version: webIfcVersion },
      { name: 'sovitech-step-text', version: READER_VERSION },
    ],
  };
}

function unreadEntry(entry: NotRead): NonNullable<ExtractionOutput['coverage']['ifc']>['notRead'][number] {
  return {
    scope: entry.scope,
    reason: entry.reason,
    globalIds: [...entry.globalIds],
    stepIds: [...entry.stepIds],
    ...(entry.ifcClass === undefined ? {} : { ifcClass: entry.ifcClass }),
  };
}

function finding(item: ReadingFinding): Finding {
  if (item.inHeader && item.globalId === undefined && item.stepIds.length === 0) return { kind: item.kind, code: item.code, locator: { kind: 'file' } };
  return {
    kind: item.kind,
    code: item.code,
    locator: {
      kind: 'ifc',
      stepIds: [...new Set(item.stepIds)].slice(0, 64),
      ...(item.globalId === undefined ? {} : { globalId: item.globalId }),
      ...(item.ifcClass === undefined ? {} : { ifcClass: item.ifcClass }),
    },
  };
}

/** A file that is not an exchange file at all, declared as a model: "Analysis failed" with its reason. */
export function notStepOutput(job: Job, webIfcVersion: string, reason: 'format_mismatch' | 'unrecognised_format'): ExtractionOutput {
  return {
    contractVersion: '1.0.0',
    producer: producer(webIfcVersion),
    job,
    format: 'other',
    analysis: { status: 'failed', reason },
    coverage: {},
    findings: [],
    derivatives: [],
  };
}

/** A model the data pass could not open (no schema web-ifc reads, or the memory limit). */
export function unopenedOutput(job: Job, webIfcVersion: string, reason: string, schemaName: string | undefined): ExtractionOutput {
  const base: ExtractionOutput = {
    contractVersion: '1.0.0',
    producer: producer(webIfcVersion),
    job,
    format: 'ifc',
    analysis: { status: 'stored_only', formatWord: 'IFC model' },
    coverage: { ifc: { classesRead: [], notRead: [{ scope: 'header', reason, globalIds: [], stepIds: [] }] } },
    findings: [],
    derivatives: [],
  };
  if (schemaName === undefined || !SCHEMA_ID.test(schemaName)) return base;
  return { ...base, ifcModel: { header: { schema: schemaName }, classesPresent: [], processing: 'failed', schemaCheck: schemaCheck([]) } };
}

/** The IFC output: stored "Not analysed" (G12-5), the engineer's record, coverage, findings, and the sealed values when asked. */
export function ifcOutput(
  job: Job,
  webIfcVersion: string,
  reading: ModelReading,
  values: { readonly facts: readonly IfcFact[]; readonly candidateProposals: readonly IfcCandidateProposal[] } | undefined,
): ExtractionOutput {
  const unread = reading.model.notReadList().map(unreadEntry);
  const authoring = reading.header.originatingSystem;
  const project = reading.project;
  const schema = reading.schemaName;
  const findings = reading.findings.slice(0, FINDINGS_MAX).map(finding);
  const output: ExtractionOutput = {
    contractVersion: '1.0.0',
    producer: producer(webIfcVersion),
    job,
    format: 'ifc',
    analysis: { status: 'stored_only', formatWord: 'IFC model' },
    coverage: { ifc: { classesRead: [...reading.model.classesRead].sort(), notRead: unread } },
    findings,
    derivatives: [],
  };
  if (!SCHEMA_ID.test(schema)) return output;
  return {
    ...output,
    ifcModel: {
      header: {
        schema,
        ...(authoring !== undefined && authoring !== '' && [...authoring].length <= AUTHORING_MAX ? { authoringTool: authoring } : {}),
        ...(project === undefined ? {} : { ifcProjectGlobalId: project.globalId }),
      },
      classesPresent: reading.classesPresent,
      processing: unread.length > 0 ? 'partial' : 'complete',
      schemaCheck: schemaCheck(findings),
    },
    ...(values === undefined ? {} : { ifcValues: { facts: [...values.facts], candidateProposals: [...values.candidateProposals] } }),
  };
}
