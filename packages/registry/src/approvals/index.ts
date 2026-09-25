/**
 * Approval references: how a gate, a looser registry value or an approved
 * snapshot points at the approval behind it (prompt 3 section 5.4;
 * docs/guardrails.md section 10). Only records written by people resolve:
 *
 * - `guardrails-changelog:<version>`: a row of the change log in
 *   docs/guardrails.md whose "Approved by" cell is, in full, an approver's
 *   name as the section 10 table writes it, or that name followed by
 *   ", <YYYY-MM-DD>" (see approverOfCell), and whose Change cell names what it
 *   approves;
 * - `dataset-approval:<dataset>@<version>`: a dataset approval record that
 *   cites such a row. How those records reach the app is open (D-47), so no
 *   loader exists yet and no such reference resolves;
 * - `owner-decision:<D-id>` or `owner-decision:build-readiness-<n>`: the
 *   owner's decision recorded with its date and the owner's words in
 *   docs/product/prd.md section 15 or docs/build-readiness.md section 5.
 *
 * While the approver table is empty, nothing resolves. Code never writes any
 * of these records; it only reads them.
 *
 * Where they are read from (phase 0 review, round 2): the repository's
 * approvals come from git, at the merge base of main and HEAD (./git.ts), never
 * from the working tree, so a row the build writes on its branch or leaves
 * uncommitted never counts. approvalDocumentEdits() is the tripwire the
 * loosening check adds on top: it fails when the build branch or the working
 * tree adds or edits an approver-table row, an "Approved by" cell that names
 * someone, or a recorded owner decision.
 *
 * An "Approved by" cell dated after the day the check runs records nothing,
 * and a placeholder in the approver table ("TBD", "n/a", a dash) names nobody.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPROVAL_DOCUMENT_PATHS, approvalBaseCommit, readAtCommit } from './git';

export { APPROVAL_BRANCH, APPROVAL_DOCUMENT_PATHS, approvalBaseCommit, existsAtRef, readAtCommit, type ApprovalBase } from './git';

export interface ChangeLogRow {
  version: string;
  date: string;
  change: string;
  approvedBy: string;
}

export interface OwnerDecisionRecord {
  /** `D-01`, or `build-readiness-4`. */
  key: string;
  date: string;
  words: string;
  source: 'docs/product/prd.md section 15' | 'docs/build-readiness.md section 5';
}

/** A dataset approval record: a dataset version and the change-log row that approved it. */
export interface DatasetApprovalRecord {
  dataset: string;
  version: string;
  changeLogVersion: string;
}

export interface ApprovalContext {
  /** Approvers named in the table of docs/guardrails.md section 10. */
  approvers: string[];
  changeLog: ChangeLogRow[];
  ownerDecisions: ReadonlyMap<string, OwnerDecisionRecord>;
  datasetApprovals: DatasetApprovalRecord[];
  /** Anything that could not be read. Reported as a failure by the loosening check. */
  problems: string[];
  /** The day the check runs (YYYY-MM-DD, local time): an "Approved by" cell dated after it records nothing. Default: today. */
  today?: string;
  /** Where the documents were read from, for messages: for the repository, the git merge base. */
  readFrom?: string;
}

export interface ApprovalDocuments {
  guardrails: string;
  prd?: string;
  buildReadiness?: string;
  datasetApprovals?: DatasetApprovalRecord[];
  /** The day the check runs; default today (local time). */
  today?: string;
  /** Where the documents were read from, for messages. */
  readFrom?: string;
}

/** Today's calendar date in local time, YYYY-MM-DD: "the run's date". */
export function localDate(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** What a reference must approve. */
export type ApprovalTarget =
  | { kind: 'guardrail-proposal'; item: string }
  | { kind: 'dataset'; dataset: string }
  | { kind: 'owner-decision'; item: string; dId: string }
  | { kind: 'registry-value'; mentions: readonly string[] };

export interface Resolution {
  ok: boolean;
  reason: string;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line.trim());
}

/** The body rows of the first table whose header matches, as cells. */
function tableRows(lines: readonly string[], header: RegExp): string[][] | undefined {
  const start = lines.findIndex((line) => header.test(line));
  if (start < 0) return undefined;
  const rows: string[][] = [];
  for (let position = start + 1; position < lines.length; position += 1) {
    const line = lines[position] ?? '';
    if (!line.trim().startsWith('|')) break;
    if (isSeparator(line)) continue;
    rows.push(splitRow(line));
  }
  return rows;
}

function plain(cell: string): string {
  return cell.replace(/[*_`]/g, '').trim();
}

function section(text: string, heading: RegExp): string[] {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) return [];
  const end = lines.findIndex((line, position) => position > start && /^## /.test(line));
  return lines.slice(start, end < 0 ? undefined : end);
}

const DECIDED_CELL = /^Decided\b[\s\S]*?\b(\d{4}-\d{2}-\d{2})\b([\s\S]*)$/;
const QUOTED = /["“]([^"”]{2,}?)["”]/;

function readPrdDecisions(prd: string, into: Map<string, OwnerDecisionRecord>): void {
  for (const line of section(prd, /^## 15\.\s/)) {
    const cells = splitRow(line);
    const key = cells[0];
    if (!line.trim().startsWith('|') || key === undefined || !/^D-\d+$/.test(key) || cells.length < 9) continue;
    for (const cell of cells.slice(1)) {
      const decided = DECIDED_CELL.exec(plain(cell));
      const date = decided?.[1];
      const words = decided?.[2] === undefined ? undefined : QUOTED.exec(decided[2])?.[1];
      if (date !== undefined && words !== undefined) {
        into.set(key, { key, date, words, source: 'docs/product/prd.md section 15' });
        break;
      }
    }
  }
}

const DECIDED_ITEM = /\bDecided\b[:\s(]*(\d{4}-\d{2}-\d{2})\)?([\s\S]*)$/;

function readBuildReadinessDecisions(text: string, into: Map<string, OwnerDecisionRecord>): void {
  const items = new Map<string, string>();
  let current: string | undefined;
  for (const line of section(text, /^## 5\.\s/).slice(1)) {
    const start = /^(\d+)\.\s+(.*)$/.exec(line);
    if (start?.[1] !== undefined) {
      current = start[1];
      items.set(current, start[2] ?? '');
    } else if (current !== undefined) {
      items.set(current, `${items.get(current) ?? ''}\n${line}`);
    }
  }
  for (const [number, body] of items) {
    const decided = DECIDED_ITEM.exec(plain(body));
    const date = decided?.[1];
    const words = decided?.[2] === undefined ? undefined : QUOTED.exec(decided[2])?.[1];
    if (date !== undefined && words !== undefined) {
      const key = `build-readiness-${number}`;
      into.set(key, { key, date, words, source: 'docs/build-readiness.md section 5' });
    }
  }
}

/** Words that mark a placeholder in the approver table, never a person (phase 0 review, round 2). */
const PLACEHOLDER_WORDS = /\b(?:tbd|tba|tbc|n\/a|pending|unknown|none|nobody|placeholder|to be (?:named|confirmed|decided|agreed))\b/i;

/**
 * Whether an approver-table cell names a person: not empty, not a
 * parenthesised note, at least one letter, and none of the placeholder words
 * ("TBD", "n/a", "pending", "to be named") or a cell of dashes or dots.
 */
export function isApproverName(cell: string): boolean {
  const name = plain(cell).replace(/[\s\u00a0\u202f]+/g, ' ').trim();
  if (name === '' || name.startsWith('(')) return false;
  if (!/\p{L}/u.test(name)) return false;
  if (/^[\p{P}\p{S}\s]*(?:x|na)?[\p{P}\s]*$/iu.test(name)) return false;
  return !PLACEHOLDER_WORDS.test(name);
}

export function parseApprovalContext(documents: ApprovalDocuments): ApprovalContext {
  const problems: string[] = [];
  const lines = documents.guardrails.split('\n');

  const approverRows = tableRows(lines, APPROVER_TABLE_HEADER);
  if (approverRows === undefined) problems.push('docs/guardrails.md: the approver table of section 10 was not found');
  const approvers = (approverRows ?? []).map((cells) => plain(cells[0] ?? '')).filter(isApproverName);

  const logRows = tableRows(lines, CHANGE_LOG_HEADER);
  if (logRows === undefined) problems.push('docs/guardrails.md: the change log table of section 10 was not found');
  const changeLog = (logRows ?? []).map((cells) => ({
    version: plain(cells[0] ?? ''),
    date: plain(cells[1] ?? ''),
    change: cells[2] ?? '',
    approvedBy: plain(cells[3] ?? ''),
  }));

  const ownerDecisions = new Map<string, OwnerDecisionRecord>();
  if (documents.prd !== undefined) readPrdDecisions(documents.prd, ownerDecisions);
  if (documents.buildReadiness !== undefined) readBuildReadinessDecisions(documents.buildReadiness, ownerDecisions);

  return {
    approvers,
    changeLog,
    ownerDecisions,
    datasetApprovals: [...(documents.datasetApprovals ?? [])],
    problems,
    today: documents.today ?? localDate(),
    ...(documents.readFrom === undefined ? {} : { readFrom: documents.readFrom }),
  };
}

const APPROVER_TABLE_HEADER = /^\|\s*Approver\s*\|\s*Role\s*\|/;
const CHANGE_LOG_HEADER = /^\|\s*Version\s*\|\s*Date\s*\|\s*Change\s*\|\s*Approved by\s*\|/;

/** The repository root, from this file's place in packages/registry/src/approvals/. */
export const REPO_ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/** The approval documents as they are at the merge base of main and HEAD, or why they cannot be read. */
export function readBaseApprovalDocuments(root: string = REPO_ROOT): { documents: ApprovalDocuments } | { problem: string } {
  const base = approvalBaseCommit(root);
  if (!base.ok) return { problem: base.reason };
  try {
    const read = (path: string): string => readAtCommit(root, base.commit, path) ?? '';
    return {
      documents: {
        guardrails: read(APPROVAL_DOCUMENT_PATHS.guardrails),
        prd: read(APPROVAL_DOCUMENT_PATHS.prd),
        buildReadiness: read(APPROVAL_DOCUMENT_PATHS.buildReadiness),
        datasetApprovals: [],
        readFrom: `git merge-base main HEAD (${base.commit.slice(0, 12)})`,
      },
    };
  } catch (error) {
    return { problem: `the approval documents could not be read at ${base.commit.slice(0, 12)}: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** The approval documents in the working tree: never a source of approval, only the tripwire's other side. */
export function readWorkingTreeApprovalDocuments(root: string = REPO_ROOT): ApprovalDocuments {
  const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');
  return {
    guardrails: read(APPROVAL_DOCUMENT_PATHS.guardrails),
    prd: read(APPROVAL_DOCUMENT_PATHS.prd),
    buildReadiness: read(APPROVAL_DOCUMENT_PATHS.buildReadiness),
    datasetApprovals: [],
    readFrom: 'the working tree',
  };
}

/**
 * The repository's approval context, read from git at the merge base of main
 * and HEAD (./git.ts). When there is no such base, nothing resolves and the
 * reason is a problem, so the loosening check fails closed. No dataset
 * approval record is loaded: how records reach the app is open (D-47).
 */
export function loadRepoApprovalContext(root: string = REPO_ROOT): ApprovalContext {
  const base = readBaseApprovalDocuments(root);
  if ('problem' in base) {
    return { approvers: [], changeLog: [], ownerDecisions: new Map(), datasetApprovals: [], problems: [base.problem], today: localDate() };
  }
  return parseApprovalContext(base.documents);
}

// ---------------------------------------------------------------------------
// The tripwire: what the build branch and the working tree may not change.

/** The approver table's rows, normalised, or undefined when the table is missing. */
function approverTable(text: string): string[] | undefined {
  return tableRows(text.split('\n'), APPROVER_TABLE_HEADER)?.map((cells) => {
    const parts = cells.map(normalised);
    while (parts.length > 1 && parts.at(-1) === '') parts.pop();
    return parts.join(' | ');
  });
}

function changeLogOf(text: string): ChangeLogRow[] {
  return (tableRows(text.split('\n'), CHANGE_LOG_HEADER) ?? []).map((cells) => ({
    version: plain(cells[0] ?? ''),
    date: plain(cells[1] ?? ''),
    change: normalised(cells[2] ?? ''),
    approvedBy: normalised(cells[3] ?? ''),
  }));
}

/** The only "Approved by" wording the build writes in its own change-log rows (prompt 3 section 5.4). */
const BUILD_OWN_APPROVED_BY = /\ballowed without approval\b/i;

/**
 * Tripwire (phase 0 review, round 2): what the build branch and the working
 * tree (`current`) changed in the approval documents against main's merge
 * base (`base`), where only the approver writes. One line per problem:
 * - any approver-table row added, edited or removed;
 * - a change-log row whose "Approved by" cell is edited, or a new row whose
 *   cell names someone: anything other than the build's own "... allowed
 *   without approval (section 10)" with no approver's name in it;
 * - any edit to a change-log row that records an approval;
 * - an owner decision recorded that main does not hold.
 */
export function approvalDocumentEdits(base: ApprovalDocuments, current: ApprovalDocuments, where = 'the build branch or the working tree'): string[] {
  const problems: string[] = [];
  const against = base.readFrom ?? 'main';

  const baseTable = approverTable(base.guardrails) ?? [];
  const currentTable = approverTable(current.guardrails) ?? [];
  for (const row of currentTable.filter((item) => !baseTable.includes(item))) {
    problems.push(`docs/guardrails.md section 10: ${where} adds or edits the approver-table row "${row}" (against ${against}); only the approver names the approver (section 10; prompt 3 section 5.4)`);
  }
  for (const row of baseTable.filter((item) => !currentTable.includes(item))) {
    problems.push(`docs/guardrails.md section 10: ${where} removes or edits the approver-table row "${row}" (against ${against}); only the approver changes that table`);
  }

  const names = [...new Set([...baseTable, ...currentTable].map((row) => row.split(' | ')[0] ?? '').filter(isApproverName))];
  const baseApprovers = (approverTable(base.guardrails) ?? []).map((row) => row.split(' | ')[0] ?? '').filter(isApproverName);
  const baseLog = changeLogOf(base.guardrails);
  const sameRow = (left: ChangeLogRow, right: ChangeLogRow): boolean =>
    left.version === right.version && left.date === right.date && left.change === right.change && left.approvedBy === right.approvedBy;
  for (const row of changeLogOf(current.guardrails)) {
    if (baseLog.some((item) => sameRow(item, row))) continue;
    const earlier = baseLog.filter((item) => item.version === row.version);
    const label = `docs/guardrails.md change log, row ${row.version || '(no version)'}`;
    if (earlier.length > 0) {
      if (!earlier.some((item) => item.approvedBy === row.approvedBy)) {
        problems.push(`${label}: ${where} edits its "Approved by" cell to "${row.approvedBy}" (against ${against}); only the approver writes that cell`);
        continue;
      }
      if (earlier.some((item) => approverOfCell(item.approvedBy, baseApprovers, '9999-12-31') !== undefined)) {
        problems.push(`${label}: ${where} edits a row that records an approval (against ${against}); an approved row is never edited`);
      }
      continue;
    }
    const namesSomeone =
      !BUILD_OWN_APPROVED_BY.test(row.approvedBy) ||
      approverOfCell(row.approvedBy, names, '9999-12-31') !== undefined ||
      names.some((name) => row.approvedBy.toLowerCase().includes(name.toLowerCase()));
    if (namesSomeone) {
      problems.push(
        `${label}: ${where} adds a row whose "Approved by" cell "${row.approvedBy}" names someone (against ${against}); ` +
          'rows the build writes say "<what>: allowed without approval (section 10)" and name no approver (prompt 3 section 5.4)',
      );
    }
  }

  const decisions = (documents: ApprovalDocuments): Map<string, OwnerDecisionRecord> => {
    const into = new Map<string, OwnerDecisionRecord>();
    if (documents.prd !== undefined) readPrdDecisions(documents.prd, into);
    if (documents.buildReadiness !== undefined) readBuildReadinessDecisions(documents.buildReadiness, into);
    return into;
  };
  const baseDecisions = decisions(base);
  for (const [key, record] of decisions(current)) {
    const earlier = baseDecisions.get(key);
    if (earlier === undefined || earlier.date !== record.date || earlier.words !== record.words) {
      problems.push(`${record.source}: ${where} records the owner decision ${key} (${record.date}) that ${against} does not hold; only the owner records decisions`);
    }
  }
  return problems;
}

/** The tripwire on the repository: the working tree against main's merge base. A missing base is a problem. */
export function repoApprovalDocumentEdits(root: string = REPO_ROOT): string[] {
  const base = readBaseApprovalDocuments(root);
  if ('problem' in base) return [base.problem];
  return approvalDocumentEdits(base.documents, readWorkingTreeApprovalDocuments(root));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether `text` names `term` as a whole: "6.2.1" is not found inside "6.2.10". */
function names(text: string, term: string): boolean {
  return new RegExp(`(?<![\\w.])${escapeRegExp(term)}(?![\\w]|\\.\\d)`, 'i').test(text);
}

/** The words a change-log row must contain to approve a guardrail proposal item. */
function proposalMentions(item: string): string[] {
  const number = /(\d+(?:\.\d+)+)\s*$/.exec(item)?.[1];
  if (number === undefined) return [item];
  return item.startsWith('ifc-input') ? [`ifc-input ${number}`] : [number];
}

/** Collapses whitespace (including no-break spaces) and strips Markdown emphasis. */
function normalised(text: string): string {
  return plain(text).replace(/[\s\u00a0\u202f]+/g, ' ').trim();
}

/** A calendar date written YYYY-MM-DD (a day that exists: 2026-02-30 is not one). */
function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const time = Date.parse(`${text}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === text;
}

/**
 * The approver an "Approved by" cell records, or undefined. The cell counts
 * only in one of two forms (docs/guardrails.md section 10, "What counts as
 * approval"): the approver's name as the section 10 table writes it,
 * alone, or followed by ", <YYYY-MM-DD>" with a date no later than `today`
 * (the run's date; phase 0 review, round 2: "2027-01-01" counted). A cell
 * that only mentions the name ("Pending <name>'s review", "Not approved by
 * <name>", "<name> declined this") records no approval. Case and wording are
 * compared as written; only whitespace and Markdown emphasis are ignored.
 */
export function approverOfCell(cell: string, approvers: readonly string[], today: string = localDate()): string | undefined {
  const text = normalised(cell);
  for (const approver of approvers) {
    const name = normalised(approver);
    if (name === '') continue;
    if (text === name) return approver;
    if (!text.startsWith(`${name}, `)) continue;
    const date = text.slice(name.length + 2);
    if (isIsoDate(date) && date <= today) return approver;
  }
  return undefined;
}

function resolveChangeLog(version: string, mentions: readonly string[], context: ApprovalContext): Resolution {
  if (context.problems.length > 0) return { ok: false, reason: context.problems.join('; ') };
  if (context.approvers.length === 0) {
    return { ok: false, reason: 'no approver is named in docs/guardrails.md section 10, so no approval exists yet (D-05)' };
  }
  const rows = context.changeLog.filter((row) => row.version === version);
  if (rows.length === 0) {
    return { ok: false, reason: `docs/guardrails.md has no change-log row ${version}${context.readFrom === undefined ? '' : ` at ${context.readFrom}`}` };
  }
  for (const row of rows) {
    const approver = approverOfCell(row.approvedBy, context.approvers, context.today ?? localDate());
    if (approver === undefined) continue;
    if (!mentions.some((term) => names(row.change, term))) {
      return { ok: false, reason: `change-log row ${version} does not name ${mentions.join(' or ')}` };
    }
    return { ok: true, reason: `change-log row ${version}, approved by ${approver}` };
  }
  return {
    ok: false,
    reason:
      `change-log row ${version}: its "Approved by" cell names no approver in one of the two forms that record an approval ` +
      '("<name>" or "<name>, <YYYY-MM-DD>" dated no later than today, the name as the docs/guardrails.md section 10 table writes it)',
  };
}

const REF = /^(guardrails-changelog|dataset-approval|owner-decision):(.+)$/;

export function resolveApprovalRef(ref: string, target: ApprovalTarget, context: ApprovalContext): Resolution {
  const match = REF.exec(ref.trim());
  const kind = match?.[1];
  const value = match?.[2]?.trim();
  if (kind === undefined || value === undefined || value === '') {
    return {
      ok: false,
      reason: `"${ref}" is not an approval reference (guardrails-changelog:<version>, dataset-approval:<dataset>@<version> or owner-decision:<D-id>)`,
    };
  }
  switch (target.kind) {
    case 'guardrail-proposal':
      if (kind !== 'guardrails-changelog') return { ok: false, reason: `${target.item} is a guardrail proposal: only a guardrails-changelog reference approves it` };
      return resolveChangeLog(value, proposalMentions(target.item), context);
    case 'registry-value':
      if (kind !== 'guardrails-changelog') return { ok: false, reason: 'a registry value is approved only through a guardrails-changelog reference' };
      return resolveChangeLog(value, target.mentions, context);
    case 'dataset': {
      if (kind !== 'dataset-approval') return { ok: false, reason: `${target.dataset} is a dataset: only a dataset-approval reference approves it` };
      const at = value.lastIndexOf('@');
      const dataset = at < 0 ? value : value.slice(0, at);
      const version = at < 0 ? '' : value.slice(at + 1);
      if (dataset !== target.dataset || version === '') {
        return { ok: false, reason: `"${ref}" does not name the dataset ${target.dataset} with a version` };
      }
      const record = context.datasetApprovals.find((item) => item.dataset === dataset && item.version === version);
      if (record === undefined) {
        return { ok: false, reason: `no dataset approval record exists for ${dataset}@${version} (how records reach the app is open: D-47)` };
      }
      const row = resolveChangeLog(record.changeLogVersion, [dataset], context);
      return row.ok ? { ok: true, reason: `dataset approval record for ${dataset}@${version}, ${row.reason}` } : row;
    }
    case 'owner-decision': {
      if (kind !== 'owner-decision') return { ok: false, reason: `${target.item} is an owner decision: only an owner-decision reference records it` };
      const allowed = [target.dId];
      const readiness = /^build-readiness decision (\d+)$/.exec(target.item)?.[1];
      if (readiness !== undefined) allowed.push(`build-readiness-${readiness}`);
      if (!allowed.includes(value)) {
        return { ok: false, reason: `"${ref}" names another decision; ${target.item} is ${allowed.join(' or ')}` };
      }
      const record = context.ownerDecisions.get(value);
      if (record === undefined) {
        return {
          ok: false,
          reason: `${value} is not recorded as decided, with its date and the owner's words, in docs/product/prd.md section 15 or docs/build-readiness.md`,
        };
      }
      return { ok: true, reason: `${value}, decided ${record.date} (${record.source})` };
    }
  }
}
