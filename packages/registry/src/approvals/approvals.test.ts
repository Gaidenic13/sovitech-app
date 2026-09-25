/**
 * Approval references (prompt 3 section 5.4; docs/guardrails.md section 10).
 * A reference resolves only to a change-log row in docs/guardrails.md whose
 * "Approved by" cell names the approver, to a dataset approval record citing
 * such a row, or to an owner decision recorded with its date and the owner's
 * words. The synthetic documents below exist only in this test.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  approvalDocumentEdits,
  approverOfCell,
  isApproverName,
  loadRepoApprovalContext,
  localDate,
  parseApprovalContext,
  repoApprovalDocumentEdits,
  resolveApprovalRef,
  type ApprovalContext,
} from './index';

function guardrails(approver: string, rows: string[]): string {
  return [
    '# Guardrails',
    '',
    '## 10. Keeping the guardrails improving',
    '',
    '| Approver | Role | Since |',
    '|----------|------|-------|',
    `| ${approver} | Product owner | |`,
    '',
    '### Change log',
    '',
    '| Version | Date | Change | Approved by |',
    '|---------|------|--------|-------------|',
    ...rows,
    '| 1.0 | 2026-01-01 | First version. | Pending the product owner\'s review |',
    '',
  ].join('\n');
}

const NAMED = guardrails('Ana Test', [
  '| 1.7 | 2026-02-02 | Accepted proposal ifc-input 6.2.1 as written. | Ana Test |',
  '| 1.6 | 2026-02-01 | Accepted proposal 7.2.8. Added test case G9-1. | New cases only: allowed without approval (section 10) |',
  '| 1.8 | 2026-02-03 | Approved dataset sovitech-asset-taxonomy version 1. | Ana Test |',
  '| 1.9 | 2026-02-04 | Accepted proposal ifc-input 6.2.10. | Ana Test |',
]);
const UNNAMED = guardrails('*(to be named by the product owner)*', [
  '| 1.7 | 2026-02-02 | Accepted proposal ifc-input 6.2.1 as written. | Ana Test |',
]);

const PRD = [
  '## 15. Open decisions',
  '',
  '| D id | Source id(s) | Question | Kind | Owner | Recommended default | Until decided | Impact | What it blocks |',
  '|---|---|---|---|---|---|---|---|---|',
  '| D-01 | build-readiness decision 4 | Which formats? | product decision | product owner | Decided: Owner decision 2026-03-01 ("read IFC in version 1") | x | y | z |',
  '| D-09 | build-readiness decision 2 | Which route? | product decision | product owner | Recommended, not decided: (a). | x | y | z |',
  '| D-28 | dashboards 8.1 | Operations? | product decision | product owner | Decided 2026-03-02 with no words recorded | x | y | z |',
  '',
  '### Questions the guardrails or the owner already settle',
  '',
  '| Source id | Settled by | Note |',
  '|---|---|---|',
  '| build-readiness decision 2 (settled part) | Owner decision 2026-09-24 (OD-8): "anything" | n |',
  '',
  '## 16. Glossary',
].join('\n');

const BUILD_READINESS = [
  '## 5. Decisions for the product owner',
  '',
  '1. **Name the approver.** Presumably you.',
  '2. **Choose the AI processor route.** Decided 2026-03-05: "route (b), the EU endpoint".',
  '4. **Parsing scope in v1:** Owner direction (2026-09-24): the app is built "based on data".',
  '',
  '## 6. Facts',
].join('\n');

function context(guardrailsText: string, extra: Partial<Parameters<typeof parseApprovalContext>[0]> = {}): ApprovalContext {
  return parseApprovalContext({ guardrails: guardrailsText, prd: PRD, buildReadiness: BUILD_READINESS, ...extra });
}

describe('parseApprovalContext', () => {
  it('reads the named approvers and the change log', () => {
    const parsed = context(NAMED);
    expect(parsed.approvers).toEqual(['Ana Test']);
    expect(parsed.changeLog.map((row) => row.version)).toEqual(['1.7', '1.6', '1.8', '1.9', '1.0']);
    expect(parsed.problems).toEqual([]);
  });

  it('treats the placeholder row as no approver', () => {
    expect(context(UNNAMED).approvers).toEqual([]);
  });

  it('reports a missing approver table or change log as a problem, so nothing resolves by accident', () => {
    const parsed = parseApprovalContext({ guardrails: '# Nothing here\n' });
    expect(parsed.problems.join(' ')).toContain('approver table');
    expect(parsed.problems.join(' ')).toContain('change log');
  });

  it('records an owner decision only from a D row that starts a cell with Decided, a date and quoted words', () => {
    const parsed = context(NAMED);
    expect([...parsed.ownerDecisions.keys()].sort()).toEqual(['D-01', 'build-readiness-2']);
    expect(parsed.ownerDecisions.get('D-01')).toMatchObject({ date: '2026-03-01', words: 'read IFC in version 1' });
  });

  it('never reads the settled-part table or an owner direction as a decision', () => {
    const parsed = context(NAMED);
    expect(parsed.ownerDecisions.has('build-readiness-4')).toBe(false);
    expect(parsed.ownerDecisions.has('D-28')).toBe(false);
  });
});

describe('resolveApprovalRef', () => {
  const proposal = { kind: 'guardrail-proposal', item: 'ifc-input 6.2.1' } as const;

  it('resolves a change-log row that names the approver and the proposal', () => {
    expect(resolveApprovalRef('guardrails-changelog:1.7', proposal, context(NAMED))).toMatchObject({ ok: true });
  });

  it('never resolves while the approver table is empty, whatever the row says', () => {
    const result = resolveApprovalRef('guardrails-changelog:1.7', proposal, context(UNNAMED));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('no approver is named');
  });

  it('does not resolve a row whose Approved by cell names no approver', () => {
    const result = resolveApprovalRef('guardrails-changelog:1.6', { kind: 'guardrail-proposal', item: 'proposal 7.2.8' }, context(NAMED));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('names no approver');
  });

  it('does not resolve a row about another proposal (6.2.10 is not 6.2.1)', () => {
    const result = resolveApprovalRef('guardrails-changelog:1.9', proposal, context(NAMED));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('does not name');
  });

  it('does not resolve a version with no row', () => {
    expect(resolveApprovalRef('guardrails-changelog:4.2', proposal, context(NAMED)).ok).toBe(false);
  });

  it('does not resolve an empty or malformed reference', () => {
    expect(resolveApprovalRef('', proposal, context(NAMED)).ok).toBe(false);
    expect(resolveApprovalRef('approved', proposal, context(NAMED)).ok).toBe(false);
    expect(resolveApprovalRef('guardrails-changelog:', proposal, context(NAMED)).ok).toBe(false);
  });

  it('does not accept an owner-decision reference for a guardrail proposal', () => {
    expect(resolveApprovalRef('owner-decision:D-01', proposal, context(NAMED)).ok).toBe(false);
  });

  it('resolves an owner decision recorded in PRD section 15 for the named D id only', () => {
    const target = { kind: 'owner-decision', item: 'build-readiness decision 4', dId: 'D-01' } as const;
    expect(resolveApprovalRef('owner-decision:D-01', target, context(NAMED)).ok).toBe(true);
    expect(resolveApprovalRef('owner-decision:D-09', target, context(NAMED)).ok).toBe(false);
    // Decision 4 in build-readiness carries an owner direction, not a decision.
    expect(resolveApprovalRef('owner-decision:build-readiness-4', target, context(NAMED)).ok).toBe(false);
  });

  it('resolves an owner decision recorded in docs/build-readiness.md', () => {
    const target = { kind: 'owner-decision', item: 'build-readiness decision 2', dId: 'D-09' } as const;
    expect(resolveApprovalRef('owner-decision:build-readiness-2', target, context(NAMED)).ok).toBe(true);
    expect(resolveApprovalRef('owner-decision:D-09', target, context(NAMED)).ok).toBe(false);
  });

  it('resolves a dataset only through a dataset approval record that cites a resolving row', () => {
    const target = { kind: 'dataset', dataset: 'sovitech-asset-taxonomy' } as const;
    const without = context(NAMED);
    expect(resolveApprovalRef('dataset-approval:sovitech-asset-taxonomy@1', target, without).ok).toBe(false);
    const withRecord = context(NAMED, {
      datasetApprovals: [{ dataset: 'sovitech-asset-taxonomy', version: '1', changeLogVersion: '1.8' }],
    });
    expect(resolveApprovalRef('dataset-approval:sovitech-asset-taxonomy@1', target, withRecord).ok).toBe(true);
    expect(resolveApprovalRef('dataset-approval:sovitech-glossary@1', target, withRecord).ok).toBe(false);
    const citingUnnamedRow = context(NAMED, {
      datasetApprovals: [{ dataset: 'sovitech-asset-taxonomy', version: '1', changeLogVersion: '1.6' }],
    });
    expect(resolveApprovalRef('dataset-approval:sovitech-asset-taxonomy@1', target, citingUnnamedRow).ok).toBe(false);
  });

  it('resolves a registry value only through a row that mentions it', () => {
    const target = { kind: 'registry-value', mentions: ['sovitech-asset-taxonomy'] } as const;
    expect(resolveApprovalRef('guardrails-changelog:1.8', target, context(NAMED)).ok).toBe(true);
    expect(resolveApprovalRef('guardrails-changelog:1.7', target, context(NAMED)).ok).toBe(false);
  });
});

describe('approverOfCell: an "Approved by" cell records an approval only in one of two forms', () => {
  const approvers = ['Ana Test'];

  it('accepts the name as the approver table writes it, alone or with an ISO date', () => {
    expect(approverOfCell('Ana Test', approvers)).toBe('Ana Test');
    expect(approverOfCell('Ana Test, 2026-02-02', approvers)).toBe('Ana Test');
    expect(approverOfCell('  **Ana Test**,  2026-02-02 ', approvers)).toBe('Ana Test');
    expect(approverOfCell('Ana\u00a0Test', approvers)).toBe('Ana Test');
  });

  // Phase 0 review: the cell used to count when it named the approver anywhere.
  it.each([
    "Pending Ana Test's review",
    'Not approved by Ana Test',
    'not approved by Ana Test, 2026-02-02',
    'Rejected by Ana Test',
    'Ana Test declined this on 2026-02-02',
    'Ana Test has not approved this',
    'Ana Test?',
    'Ana Test, pending',
    'Ana Test, 2026-02-30',
    'Ana Test, 02/02/2026',
    'Ana Test 2026-02-02',
    'ana test',
    'Ana Tester',
    'Ana Test and Bob Test',
    'Ana Test (product owner), 2026-02-02',
  ])('records no approval for %j', (cell) => {
    expect(approverOfCell(cell, approvers)).toBeUndefined();
  });

  it('records nothing while the approver table is empty', () => {
    expect(approverOfCell('Ana Test', [])).toBeUndefined();
  });

  it('keeps a row that only mentions the approver from resolving a reference', () => {
    const rows = [
      "| 3.1 | 2026-03-01 | Accepted proposal ifc-input 6.2.1. | Pending Ana Test's review |",
      '| 3.2 | 2026-03-02 | Accepted proposal ifc-input 6.2.1. | Not approved by Ana Test |',
      '| 3.3 | 2026-03-03 | Accepted proposal ifc-input 6.2.1. | Ana Test, 2026-03-03 |',
    ];
    const parsed = context(guardrails('Ana Test', rows));
    const target = { kind: 'guardrail-proposal', item: 'ifc-input 6.2.1' } as const;
    for (const version of ['3.1', '3.2']) {
      const result = resolveApprovalRef(`guardrails-changelog:${version}`, target, parsed);
      expect(result.ok, version).toBe(false);
      expect(result.reason).toContain('names no approver');
    }
    expect(resolveApprovalRef('guardrails-changelog:3.3', target, parsed)).toMatchObject({ ok: true });
  });
});

describe('the repository documents today', () => {
  it('name no approver, so no reference can resolve', () => {
    const repo = loadRepoApprovalContext();
    expect(repo.problems).toEqual([]);
    expect(repo.readFrom).toMatch(/^git merge-base main HEAD/);
    expect(repo.approvers).toEqual([]);
    expect(repo.changeLog.map((row) => row.version)).toContain('1.5');
    for (const version of repo.changeLog.map((row) => row.version)) {
      expect(resolveApprovalRef(`guardrails-changelog:${version}`, { kind: 'guardrail-proposal', item: 'ifc-input 6.2.1' }, repo).ok).toBe(false);
    }
  });

  it('record no owner decision that a gate waits for', () => {
    const repo = loadRepoApprovalContext();
    for (const key of ['D-01', 'D-07', 'D-09', 'D-28', 'build-readiness-2', 'build-readiness-4']) {
      expect(repo.ownerDecisions.has(key)).toBe(false);
    }
  });

  it('hold no approval record the build branch or the working tree added', () => {
    expect(repoApprovalDocumentEdits()).toEqual([]);
  });
});

describe('approverOfCell: a date after the run\'s date records nothing (phase 0 review, round 2)', () => {
  const approvers = ['Ana Test'];

  it('accepts a date up to the run\'s date and refuses a later one', () => {
    expect(approverOfCell('Ana Test, 2026-02-02', approvers, '2026-02-02')).toBe('Ana Test');
    expect(approverOfCell('Ana Test, 2026-02-01', approvers, '2026-02-02')).toBe('Ana Test');
    expect(approverOfCell('Ana Test, 2026-02-03', approvers, '2026-02-02')).toBeUndefined();
    // The verifier's probe: "TEST Approver, 2027-01-01" counted as an approval.
    expect(approverOfCell('TEST Approver, 2027-01-01', ['TEST Approver'], '2026-09-25')).toBeUndefined();
  });

  it('defaults to today in local time', () => {
    expect(localDate(new Date(2026, 8, 25, 0, 30))).toBe('2026-09-25');
    expect(approverOfCell('Ana Test, 2999-01-01', approvers)).toBeUndefined();
  });

  it('keeps a future-dated row from resolving a reference, with the context\'s date', () => {
    const rows = ['| 4.1 | 2026-03-01 | Accepted proposal ifc-input 6.2.1. | Ana Test, 2026-03-02 |'];
    const target = { kind: 'guardrail-proposal', item: 'ifc-input 6.2.1' } as const;
    expect(resolveApprovalRef('guardrails-changelog:4.1', target, context(guardrails('Ana Test', rows), { today: '2026-03-01' })).ok).toBe(false);
    expect(resolveApprovalRef('guardrails-changelog:4.1', target, context(guardrails('Ana Test', rows), { today: '2026-03-02' })).ok).toBe(true);
  });
});

describe('isApproverName: a placeholder names nobody (phase 0 review, round 2)', () => {
  it.each(['TBD', 'tbd', 'TBA', 'n/a', 'N/A', 'NA', '-', '—', '–', '?', 'x', '...', 'Pending', 'pending approval', 'none', 'Unknown', 'To be confirmed', '*(to be named by the product owner)*', '(anyone)', ''])(
    'reads %j as no approver',
    (cell) => {
      expect(isApproverName(cell)).toBe(false);
    },
  );

  it.each(['Ana Test', 'TEST Approver', 'Ștefan Ionescu-Test', '**Ana Test**'])('reads %j as a name', (cell) => {
    expect(isApproverName(cell)).toBe(true);
  });

  it('never lets a placeholder row approve anything', () => {
    const parsed = context(guardrails('TBD', ['| 4.2 | 2026-03-01 | Accepted proposal ifc-input 6.2.1. | TBD |']));
    expect(parsed.approvers).toEqual([]);
    const result = resolveApprovalRef('guardrails-changelog:4.2', { kind: 'guardrail-proposal', item: 'ifc-input 6.2.1' }, parsed);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('no approver is named');
  });
});

describe('approvalDocumentEdits: the tripwire on what the build branch changes (phase 0 review, round 2)', () => {
  const base = { guardrails: guardrails('Ana Test', ['| 1.6 | 2026-02-01 | Accepted proposal 7.2.8. | Ana Test |']), prd: PRD, buildReadiness: BUILD_READINESS, readFrom: 'main' };

  it('finds nothing when nothing changed', () => {
    expect(approvalDocumentEdits(base, base)).toEqual([]);
  });

  it('lets the build add its own rows, which name no approver', () => {
    const current = { ...base, guardrails: guardrails('Ana Test', ['| 1.7 | 2026-02-02 | Added test case G1-13. | New cases only: allowed without approval (section 10) |', '| 1.6 | 2026-02-01 | Accepted proposal 7.2.8. | Ana Test |']) };
    expect(approvalDocumentEdits(base, current)).toEqual([]);
  });

  it('fails a new row whose "Approved by" cell names someone, or is anything but the build\'s own wording', () => {
    for (const cell of ['Ana Test', 'Ana Test, 2026-02-02', 'Pending the product owner\'s review', 'Ana Test: allowed without approval (section 10)', 'Bob Test']) {
      const current = { ...base, guardrails: guardrails('Ana Test', [`| 1.7 | 2026-02-02 | Accepted proposal ifc-input 6.2.1. | ${cell} |`, '| 1.6 | 2026-02-01 | Accepted proposal 7.2.8. | Ana Test |']) };
      expect(approvalDocumentEdits(base, current).join('\n'), cell).toContain('adds a row whose "Approved by" cell');
    }
  });

  it('fails an edited "Approved by" cell and any edit to a row that records an approval', () => {
    const cellEdited = { ...base, guardrails: base.guardrails.replace("| 1.0 | 2026-01-01 | First version. | Pending the product owner's review |", '| 1.0 | 2026-01-01 | First version. | Ana Test |') };
    expect(approvalDocumentEdits(base, cellEdited).join('\n')).toContain('edits its "Approved by" cell to "Ana Test"');
    const changeEdited = { ...base, guardrails: base.guardrails.replace('Accepted proposal 7.2.8.', 'Accepted proposals 7.2.8 and 7.2.9.') };
    expect(approvalDocumentEdits(base, changeEdited).join('\n')).toContain('edits a row that records an approval');
  });

  it('fails any change to the approver table', () => {
    const named = { ...base, guardrails: guardrails('Bob Test', ['| 1.6 | 2026-02-01 | Accepted proposal 7.2.8. | Ana Test |']) };
    const problems = approvalDocumentEdits(base, named).join('\n');
    expect(problems).toContain('adds or edits the approver-table row "Bob Test | Product owner"');
    expect(problems).toContain('removes or edits the approver-table row "Ana Test | Product owner"');
  });

  it('fails an owner decision that main does not hold', () => {
    const decided = { ...base, prd: PRD.replace('Recommended, not decided: (a).', 'Decided 2026-03-09: "route (a), seeded"') };
    expect(approvalDocumentEdits(base, decided).join('\n')).toContain('records the owner decision D-09 (2026-03-09)');
  });
});

describe('approvals are read from git, at the merge base of main and HEAD (phase 0 review, round 2)', () => {
  const repos: string[] = [];
  afterEach(() => {
    for (const root of repos.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function git(root: string, args: string[]): void {
    const env: NodeJS.ProcessEnv = {};
    for (const [name, value] of Object.entries(process.env)) if (!name.startsWith('GIT_')) env[name] = value;
    const result = spawnSync('git', ['-c', 'user.name=Unit (synthetic)', '-c', 'user.email=unit@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', '-C', root, ...args], { encoding: 'utf8', env });
    if (result.status !== 0) throw new Error(result.stderr);
  }

  function write(root: string, files: Record<string, string>): void {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  }

  /** A repository with `main` committed, a build branch with `branch` committed on it, and `worktree` left uncommitted. */
  function repo(layers: { main: string; branch?: string; worktree?: string }): string {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'sovitech-approvals-git-')));
    repos.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    write(root, { 'docs/guardrails.md': layers.main, 'docs/product/prd.md': PRD, 'docs/build-readiness.md': BUILD_READINESS });
    git(root, ['add', '-A']);
    git(root, ['commit', '-q', '-m', 'main']);
    git(root, ['checkout', '-q', '-b', 'build/unit']);
    if (layers.branch !== undefined) {
      write(root, { 'docs/guardrails.md': layers.branch });
      git(root, ['add', '-A']);
      git(root, ['commit', '-q', '-m', 'branch']);
    }
    if (layers.worktree !== undefined) write(root, { 'docs/guardrails.md': layers.worktree });
    return root;
  }

  const approving = guardrails('Ana Test', ['| 1.7 | 2026-02-02 | Accepted proposal ifc-input 6.2.1 as written. | Ana Test |']);
  const target = { kind: 'guardrail-proposal', item: 'ifc-input 6.2.1' } as const;

  it('resolves a row the approver committed on main', () => {
    const root = repo({ main: approving });
    const parsed = loadRepoApprovalContext(root);
    expect(parsed.readFrom).toMatch(/^git merge-base main HEAD \([0-9a-f]{12}\)$/);
    expect(resolveApprovalRef('guardrails-changelog:1.7', target, parsed).ok).toBe(true);
    expect(repoApprovalDocumentEdits(root)).toEqual([]);
  });

  it('never counts a row left in the working tree', () => {
    const root = repo({ main: guardrails('Ana Test', []), worktree: approving });
    expect(resolveApprovalRef('guardrails-changelog:1.7', target, loadRepoApprovalContext(root)).ok).toBe(false);
    expect(repoApprovalDocumentEdits(root).join('\n')).toContain('adds a row whose "Approved by" cell "Ana Test" names someone');
  });

  it('never counts a row committed on the build branch', () => {
    const root = repo({ main: guardrails('Ana Test', []), branch: approving });
    expect(resolveApprovalRef('guardrails-changelog:1.7', target, loadRepoApprovalContext(root)).ok).toBe(false);
    expect(repoApprovalDocumentEdits(root)).not.toEqual([]);
  });

  it('ignores GIT_DIR and every other GIT_* variable', () => {
    const forged = repo({ main: approving });
    const root = repo({ main: guardrails('Ana Test', []) });
    const saved = process.env['GIT_DIR'];
    process.env['GIT_DIR'] = join(forged, '.git');
    try {
      expect(resolveApprovalRef('guardrails-changelog:1.7', target, loadRepoApprovalContext(root)).ok).toBe(false);
    } finally {
      if (saved === undefined) delete process.env['GIT_DIR'];
      else process.env['GIT_DIR'] = saved;
    }
  });

  it('fails closed where there is no main to read from', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'sovitech-approvals-nogit-')));
    repos.push(root);
    write(root, { 'docs/guardrails.md': approving, 'docs/product/prd.md': PRD, 'docs/build-readiness.md': BUILD_READINESS });
    const parsed = loadRepoApprovalContext(root);
    expect(parsed.approvers).toEqual([]);
    expect(parsed.problems.join(' ')).toContain('approvals are read from git');
    expect(resolveApprovalRef('guardrails-changelog:1.7', target, parsed).ok).toBe(false);
    expect(repoApprovalDocumentEdits(root).join(' ')).toContain('approvals are read from git');
  });
});
