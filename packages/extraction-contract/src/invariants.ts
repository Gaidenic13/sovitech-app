/**
 * The contract's invariants: the rules the JSON Schema cannot state, one
 * function per `x-invariants` id. The Python side implements the same ids in
 * services/extractor/src/sovitech_extractor/contract/_invariants.py, and a test
 * on each side fails when an id has no implementation or an implementation no
 * id. Each runs on a value that passed its structural check, and returns the
 * paths of what it refuses, never the values (rule 13).
 *
 * Where a rule comes from:
 * - format_sections, status_matches_format: 2.8 status lines and G12-1 (a stored
 *   file has nothing extracted), rule 12, and the ifc-values gate (an IFC file
 *   reads "Not analysed: IFC model stored, not analysed", G12-5);
 * - page_coverage, sheet_coverage, read_below_total: rule 12 and F-INGEST-05
 *   (code records what it read; "Partly analysed (<read> of <total> pages)"; a workbook with a
 *   sheet not read is partly analysed, counted in sheets, never "analysed": phase 2 review);
 * - text_blocks, hidden_reported: rule 14 (hidden text is reported, never used)
 *   and F-EXTRACT-01 (anchor ids and character boxes the verifier can trust);
 * - finding_locators, ifc_model_record: rule 14, R-023 and F-IFC-09 (engineer
 *   items with codes and locations only);
 * - ifc_value_locators, ifc_proposals: prompt 3 section 8 (IFC evidence names
 *   the file by its content hash and the schema it declares; each proposal
 *   waits for the gates of its mechanism);
 * - derivatives_keyed: rule 13 and G13-4 (derived files keyed by project id
 *   plus content hash);
 * - request_consistent: PRD R-027 "Until decided" (no mapping table is
 *   consulted while ifc-values is closed);
 * - box_ordered: a box is [left, bottom, right, top].
 */
import { FORMAT_RULES, INVARIANT_IDS, MECHANISM_RULES } from './generated/annotations';
import type {
  Box,
  DerivativeKind,
  ExtractionOutput,
  ExtractionRequest,
  Finding,
  Format,
  IfcCandidateProposal,
  IfcFact,
  IfcGateId,
  IfcProposalMechanism,
  PartlyAnalysedStatus,
} from './generated/zod';

export type InvariantId = (typeof INVARIANT_IDS)[number];
export type Path = readonly (string | number)[];

export interface InvariantProblem {
  readonly path: Path;
}

type Check = (value: unknown) => readonly InvariantProblem[];

/** A check on a value of one def. It runs only on a value that passed that def's structural check. */
function define<T>(check: (value: T) => readonly InvariantProblem[]): Check {
  return (value) => check(value as T);
}

export interface FormatRule {
  readonly statuses: readonly string[];
  /** What a partly analysed file of this format counts: a PDF's pages, a workbook's sheets. */
  readonly partlyAnalysedUnit?: string;
  readonly storedOnlyWord?: string;
  readonly sections: readonly string[];
  readonly findingLocators: readonly string[];
  readonly derivatives: readonly string[];
}

/** The x-format-rules entry of a format. */
export function formatRule(format: Format): FormatRule {
  const rules: Readonly<Record<Format, FormatRule>> = FORMAT_RULES;
  return rules[format];
}

export interface MechanismRule {
  readonly gates: readonly IfcGateId[];
  readonly needsDataset: boolean;
}

/** The x-mechanism-rules entry of a mechanism: the gates it waits for at least. */
export function mechanismRule(mechanism: IfcProposalMechanism): MechanismRule {
  const rules: Readonly<Record<IfcProposalMechanism, MechanismRule>> = MECHANISM_RULES;
  return rules[mechanism];
}

const at = (...path: Path): InvariantProblem => ({ path });

/** The number of code points in a text: what CharBox offsets count. */
export function codePointLength(text: string): number {
  return [...text].length;
}

/** The first index of each value seen twice. */
function duplicates<T>(values: readonly T[]): readonly number[] {
  const seen = new Set<T>();
  const repeated: number[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) repeated.push(index);
    seen.add(value);
  });
  return repeated;
}

const SECTIONS = ['pdf', 'xlsx', 'ifcModel', 'ifcValues'] as const;

const MEDIA_TYPES: Readonly<Record<DerivativeKind, readonly string[]>> = {
  fragments: ['application/octet-stream'],
  glb: ['model/gltf-binary'],
  svg_plan: ['image/svg+xml'],
  thumbnail: ['image/png', 'image/webp'],
  page_image: ['image/png', 'image/webp'],
};

/** Where each kind of finding can be. */
const FINDING_LOCATOR_KINDS: Readonly<Record<Finding['kind'], readonly string[]>> = {
  embedded_instruction: ['pdf', 'xlsx', 'ifc', 'file'],
  hidden_text: ['pdf', 'xlsx'],
  schema_error: ['ifc', 'file'],
  hidden_content: ['ifc'],
};

const boxOrdered = define<Box>((box) => {
  const [left, bottom, right, top] = box;
  return left === undefined || bottom === undefined || right === undefined || top === undefined || left > right || bottom > top
    ? [at()]
    : [];
});

const readBelowTotal = define<PartlyAnalysedStatus>((status) => (status.read < status.total ? [] : [at('read')]));

const requestConsistent = define<ExtractionRequest>((request) => {
  const problems: InvariantProblem[] = [];
  if (request.ifcValues && request.declaredFormat !== 'ifc') problems.push(at('ifcValues'));
  if (!request.ifcValues && request.datasets.length > 0) problems.push(at('datasets'));
  if (request.ids !== undefined && request.declaredFormat !== 'ifc') problems.push(at('ids'));
  const allowed = formatRule(request.declaredFormat).derivatives;
  request.derivatives.forEach((kind, index) => {
    if (!allowed.includes(kind)) problems.push(at('derivatives', index));
  });
  return problems;
});

const formatSections = define<ExtractionOutput>((output) => {
  const problems: InvariantProblem[] = [];
  const rule = formatRule(output.format);
  const status = output.analysis.status;
  for (const section of SECTIONS) {
    if (output[section] === undefined) continue;
    const notForFormat = !rule.sections.includes(section);
    const nothingExtracted = (status === 'stored_only' || status === 'failed') && (section === 'pdf' || section === 'xlsx');
    const failedModel = status === 'failed' && section === 'ifcValues';
    if (notForFormat || nothingExtracted || failedModel) problems.push(at(section));
  }
  if (output.ifcValues !== undefined && output.ifcModel === undefined) problems.push(at('ifcValues'));
  if (output.coverage.pages !== undefined && output.format !== 'pdf') problems.push(at('coverage', 'pages'));
  if (output.coverage.sheets !== undefined && output.format !== 'xlsx') problems.push(at('coverage', 'sheets'));
  if (output.coverage.ifc !== undefined && output.format !== 'ifc') problems.push(at('coverage', 'ifc'));
  const read = status === 'analysed' || status === 'partly_analysed';
  if (read && output.format === 'pdf') {
    if (output.pdf === undefined) problems.push(at('pdf'));
    if (output.coverage.pages === undefined) problems.push(at('coverage', 'pages'));
  }
  if (read && output.format === 'xlsx') {
    if (output.xlsx === undefined) problems.push(at('xlsx'));
    if (output.coverage.sheets === undefined) problems.push(at('coverage', 'sheets'));
  }
  if (status === 'stored_only' && output.format === 'pdf' && output.coverage.pages === undefined) problems.push(at('coverage', 'pages'));
  return problems;
});

const statusMatchesFormat = define<ExtractionOutput>((output) => {
  const rule = formatRule(output.format);
  const analysis = output.analysis;
  if (!rule.statuses.includes(analysis.status)) return [at('analysis', 'status')];
  if (analysis.status === 'stored_only' && analysis.formatWord !== rule.storedOnlyWord) return [at('analysis', 'formatWord')];
  if (analysis.status === 'partly_analysed' && analysis.unit !== rule.partlyAnalysedUnit) return [at('analysis', 'unit')];
  return [];
});

const pageCoverage = define<ExtractionOutput>((output) => {
  const coverage = output.coverage.pages;
  if (coverage === undefined) return [];
  const problems: InvariantProblem[] = [];
  const seen = new Set<number>();
  const readPages = new Set<number>();
  const collect = (list: 'read' | 'unread', ranges: readonly { first: number; last: number }[], into: Set<number>): void => {
    ranges.forEach((range, index) => {
      if (range.first > range.last || range.last > coverage.total) {
        problems.push(at('coverage', 'pages', list, index));
        return;
      }
      for (let page = range.first; page <= range.last; page += 1) {
        if (seen.has(page)) {
          problems.push(at('coverage', 'pages', list, index));
          return;
        }
        seen.add(page);
        into.add(page);
      }
    });
  };
  collect('read', coverage.read, readPages);
  collect('unread', coverage.unread, new Set<number>());
  if (seen.size !== coverage.total) problems.push(at('coverage', 'pages'));
  const analysis = output.analysis;
  if (analysis.status === 'analysed' && coverage.unread.length > 0) problems.push(at('coverage', 'pages', 'unread'));
  if (analysis.status === 'partly_analysed' && (analysis.read !== readPages.size || analysis.total !== coverage.total)) {
    problems.push(at('analysis'));
  }
  if (analysis.status === 'stored_only') {
    if (readPages.size > 0) problems.push(at('coverage', 'pages', 'read'));
    coverage.unread.forEach((range, index) => {
      if (range.reason !== 'no_text_layer') problems.push(at('coverage', 'pages', 'unread', index, 'reason'));
    });
  }
  if (output.pdf !== undefined) {
    const listed = new Set<number>();
    output.pdf.pages.forEach((page, index) => {
      if (listed.has(page.page) || !readPages.has(page.page)) problems.push(at('pdf', 'pages', index));
      listed.add(page.page);
    });
    if ([...readPages].some((page) => !listed.has(page))) problems.push(at('pdf', 'pages'));
  }
  return problems;
});

const textBlocks = define<ExtractionOutput>((output) => {
  if (output.pdf === undefined) return [];
  const problems: InvariantProblem[] = [];
  const anchors = new Set<string>();
  output.pdf.pages.forEach((page, pageIndex) => {
    page.blocks.forEach((block, blockIndex) => {
      if (anchors.has(block.anchorId)) problems.push(at('pdf', 'pages', pageIndex, 'blocks', blockIndex, 'anchorId'));
      anchors.add(block.anchorId);
      const length = codePointLength(block.text);
      let previousEnd = 0;
      block.charBoxes.forEach((charBox, boxIndex) => {
        if (charBox.start >= charBox.end || charBox.end > length || charBox.start < previousEnd) {
          problems.push(at('pdf', 'pages', pageIndex, 'blocks', blockIndex, 'charBoxes', boxIndex));
        }
        previousEnd = charBox.end;
      });
    });
  });
  return problems;
});

const sheetCoverage = define<ExtractionOutput>((output) => {
  const problems: InvariantProblem[] = [];
  const coverage = output.coverage.sheets;
  const sheets = output.xlsx?.sheets;
  if (coverage !== undefined) {
    for (const index of duplicates(coverage.map((entry) => entry.sheet))) problems.push(at('coverage', 'sheets', index));
    coverage.forEach((entry, index) => {
      if ((entry.status === 'not_read') !== (entry.reason !== undefined)) problems.push(at('coverage', 'sheets', index, 'reason'));
    });
  }
  if (sheets !== undefined) {
    for (const index of duplicates(sheets.map((sheet) => sheet.name))) problems.push(at('xlsx', 'sheets', index));
    sheets.forEach((sheet, sheetIndex) => {
      for (const cellIndex of duplicates(sheet.cells.map((cell) => cell.ref))) problems.push(at('xlsx', 'sheets', sheetIndex, 'cells', cellIndex));
    });
  }
  if (coverage !== undefined && sheets !== undefined) {
    const status = new Map(coverage.map((entry) => [entry.sheet, entry.status]));
    const names = new Set(sheets.map((sheet) => sheet.name));
    sheets.forEach((sheet, index) => {
      const read = status.get(sheet.name);
      if (read === undefined) problems.push(at('xlsx', 'sheets', index));
      else if (read === 'not_read' && sheet.cells.length > 0) problems.push(at('xlsx', 'sheets', index, 'cells'));
    });
    coverage.forEach((entry, index) => {
      if (entry.status === 'read' && !names.has(entry.sheet)) problems.push(at('coverage', 'sheets', index));
    });
  }
  // The status says what the sheet coverage says (rule 12): analysed only when every sheet was
  // read; partly analysed with the sheets read of the sheets listed; failed with none read.
  if (coverage !== undefined && output.format === 'xlsx') {
    const read = coverage.filter((entry) => entry.status === 'read').length;
    const analysis = output.analysis;
    if (analysis.status === 'analysed' && read !== coverage.length) problems.push(at('coverage', 'sheets'));
    if (analysis.status === 'partly_analysed' && (analysis.read !== read || analysis.total !== coverage.length)) problems.push(at('analysis'));
    if (analysis.status === 'failed' && read > 0) problems.push(at('coverage', 'sheets'));
  }
  return problems;
});

const hiddenReported = define<ExtractionOutput>((output) => {
  const problems: InvariantProblem[] = [];
  const hiddenFindings = output.findings.filter((finding) => finding.kind === 'hidden_text').map((finding) => finding.locator);
  output.pdf?.pages.forEach((page, pageIndex) => {
    page.blocks.forEach((block, blockIndex) => {
      if (block.hidden.length === 0) return;
      const reported = hiddenFindings.some(
        (locator) => locator.kind === 'pdf' && locator.page === page.page && locator.anchorId === block.anchorId,
      );
      if (!reported) problems.push(at('pdf', 'pages', pageIndex, 'blocks', blockIndex, 'hidden'));
    });
  });
  output.xlsx?.sheets.forEach((sheet, sheetIndex) => {
    sheet.cells.forEach((cell, cellIndex) => {
      const path = at('xlsx', 'sheets', sheetIndex, 'cells', cellIndex, 'hidden');
      const hiddenSheet = cell.hidden.includes('hidden_sheet');
      const veryHiddenSheet = cell.hidden.includes('very_hidden_sheet');
      if (hiddenSheet !== (sheet.visibility === 'hidden') || veryHiddenSheet !== (sheet.visibility === 'very_hidden')) {
        problems.push(path);
        return;
      }
      if (cell.hidden.length === 0) return;
      const reported = hiddenFindings.some(
        (locator) => locator.kind === 'xlsx' && locator.sheet === sheet.name && (locator.cell === undefined || locator.cell === cell.ref),
      );
      if (!reported) problems.push(path);
    });
  });
  return problems;
});

const findingLocators = define<ExtractionOutput>((output) => {
  const problems: InvariantProblem[] = [];
  const allowed = formatRule(output.format).findingLocators;
  output.findings.forEach((finding, index) => {
    const locator = finding.locator;
    if (!allowed.includes(locator.kind)) {
      problems.push(at('findings', index, 'locator'));
      return;
    }
    if (!FINDING_LOCATOR_KINDS[finding.kind].includes(locator.kind)) {
      problems.push(at('findings', index, 'kind'));
      return;
    }
    if (locator.kind === 'pdf') {
      const total = output.coverage.pages?.total;
      if (total !== undefined && locator.page > total) problems.push(at('findings', index, 'locator', 'page'));
      if (locator.anchorId !== undefined) {
        const page = output.pdf?.pages.find((candidate) => candidate.blocks.some((block) => block.anchorId === locator.anchorId));
        if (page?.page !== locator.page) problems.push(at('findings', index, 'locator', 'anchorId'));
      }
    }
    if (locator.kind === 'xlsx') {
      const sheet = output.xlsx?.sheets.find((candidate) => candidate.name === locator.sheet);
      if (sheet === undefined) problems.push(at('findings', index, 'locator', 'sheet'));
      else if (locator.cell !== undefined && !sheet.cells.some((cell) => cell.ref === locator.cell)) {
        problems.push(at('findings', index, 'locator', 'cell'));
      }
    }
  });
  return problems;
});

const ifcModelRecord = define<ExtractionOutput>((output) => {
  const model = output.ifcModel;
  if (model === undefined) return [];
  const problems: InvariantProblem[] = [];
  const schemaErrors = output.findings.some((finding) => finding.kind === 'schema_error');
  if ((model.schemaCheck.outcome === 'problems') !== schemaErrors) problems.push(at('ifcModel', 'schemaCheck', 'outcome'));
  if (model.ids !== undefined) {
    const specifications = model.ids.specifications;
    for (const index of duplicates(specifications.map((spec) => spec.specId))) {
      problems.push(at('ifcModel', 'ids', 'specifications', index, 'specId'));
    }
    specifications.forEach((spec, index) => {
      if (spec.outcome !== 'fail' && spec.failingGlobalIds.length > 0) {
        problems.push(at('ifcModel', 'ids', 'specifications', index, 'failingGlobalIds'));
      }
    });
  }
  output.coverage.ifc?.classesRead.forEach((ifcClass, index) => {
    if (!model.classesPresent.includes(ifcClass)) problems.push(at('coverage', 'ifc', 'classesRead', index));
  });
  return problems;
});

/**
 * ifc_value_locators for one fact: its locator names the output's file by content hash and the
 * schema its model record declares. Paths are under the fact. Shared by the whole-output check
 * below and the per-line form of the section (./ifc-values-stream.ts).
 */
export function factLocatorProblems(fact: IfcFact, output: Pick<ExtractionOutput, 'job' | 'ifcModel'>): readonly Path[] {
  const problems: Path[] = [];
  if (fact.locator.contentHash !== output.job.contentHash) problems.push(['locator', 'contentHash']);
  if (fact.locator.schema !== output.ifcModel?.header.schema) problems.push(['locator', 'schema']);
  return problems;
}

const ifcValueLocators = define<ExtractionOutput>((output) => {
  const values = output.ifcValues;
  if (values === undefined) return [];
  const problems: InvariantProblem[] = [];
  for (const index of duplicates(values.facts.map((fact) => fact.id))) problems.push(at('ifcValues', 'facts', index, 'id'));
  values.facts.forEach((fact, index) => {
    for (const path of factLocatorProblems(fact, output)) problems.push(at('ifcValues', 'facts', index, ...path));
  });
  return problems;
});

const ifcProposals = define<ExtractionOutput>((output) => {
  const values = output.ifcValues;
  if (values === undefined) return [];
  const problems: InvariantProblem[] = [];
  const factIds = new Set(values.facts.map((fact) => fact.id));
  for (const index of duplicates(values.candidateProposals.map((proposal) => proposal.id))) {
    problems.push(at('ifcValues', 'candidateProposals', index, 'id'));
  }
  values.candidateProposals.forEach((proposal, index) => {
    for (const path of proposalProblems(proposal, factIds)) problems.push(at('ifcValues', 'candidateProposals', index, ...path));
  });
  return problems;
});

/**
 * ifc_proposals for one proposal, given the fact ids of its section: its evidence names facts
 * of the section, a fact value is among its evidence, only the geometry mechanism claims
 * `calculated`, only `ai_inference` carries a confidence, and it waits for at least its
 * mechanism's gates, with a dataset where the mechanism needs one. Paths are under the proposal.
 * Shared by the whole-output check above and the per-line form (./ifc-values-stream.ts).
 */
export function proposalProblems(proposal: IfcCandidateProposal, factIds: ReadonlySet<string>): readonly Path[] {
  const problems: Path[] = [];
  proposal.evidenceFactIds.forEach((factId, factIndex) => {
    if (!factIds.has(factId)) problems.push(['evidenceFactIds', factIndex]);
  });
  if (proposal.value.kind === 'fact' && !proposal.evidenceFactIds.includes(proposal.value.factId)) problems.push(['value']);
  if ((proposal.sourceClaim === 'calculated') !== (proposal.mechanism === 'geometry')) problems.push(['sourceClaim']);
  if ((proposal.sourceClaim === 'ai_inference') !== (proposal.confidence !== undefined)) problems.push(['confidence']);
  const rule = mechanismRule(proposal.mechanism);
  if (!rule.gates.every((gate) => proposal.requiresGates.includes(gate))) problems.push(['requiresGates']);
  if (rule.needsDataset && proposal.datasets.length === 0) problems.push(['datasets']);
  return problems;
}

const derivativesKeyed = define<ExtractionOutput>((output) => {
  const problems: InvariantProblem[] = [];
  const { projectId, contentHash } = output.job;
  const prefix = `${projectId}/${contentHash}/derived/`;
  const allowed = formatRule(output.format).derivatives;
  const total = output.coverage.pages?.total;
  for (const index of duplicates(output.derivatives.map((derivative) => derivative.relativePath))) {
    problems.push(at('derivatives', index, 'relativePath'));
  }
  output.derivatives.forEach((derivative, index) => {
    const path = (...rest: Path): InvariantProblem => at('derivatives', index, ...rest);
    if (derivative.projectId !== projectId) problems.push(path('projectId'));
    if (derivative.contentHash !== contentHash) problems.push(path('contentHash'));
    if (!derivative.relativePath.startsWith(prefix)) problems.push(path('relativePath'));
    if (!allowed.includes(derivative.kind)) problems.push(path('kind'));
    if (!MEDIA_TYPES[derivative.kind].includes(derivative.mediaType)) problems.push(path('mediaType'));
    const wantsStorey = derivative.kind === 'svg_plan';
    const wantsPage = derivative.kind === 'page_image';
    if (wantsStorey !== (derivative.storeyGlobalId !== undefined)) problems.push(path('storeyGlobalId'));
    if (wantsPage !== (derivative.page !== undefined)) problems.push(path('page'));
    if (derivative.page !== undefined && total !== undefined && derivative.page > total) problems.push(path('page'));
  });
  return problems;
});

/** Every invariant, by id. */
export const INVARIANTS: Readonly<Record<InvariantId, Check>> = {
  box_ordered: boxOrdered,
  read_below_total: readBelowTotal,
  request_consistent: requestConsistent,
  format_sections: formatSections,
  status_matches_format: statusMatchesFormat,
  page_coverage: pageCoverage,
  text_blocks: textBlocks,
  sheet_coverage: sheetCoverage,
  hidden_reported: hiddenReported,
  finding_locators: findingLocators,
  ifc_model_record: ifcModelRecord,
  ifc_value_locators: ifcValueLocators,
  ifc_proposals: ifcProposals,
  derivatives_keyed: derivativesKeyed,
};
