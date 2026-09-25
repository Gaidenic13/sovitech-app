/**
 * The exception lists in the loosening snapshot (phase 0 review, round 2).
 * The seeded inputs whose folder names start with exception-list- prove the
 * check on the real lists; these tests pin the comparison, the hashing and the approval path.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseApprovalContext } from '@sovitech/registry/gates';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import {
  CHECK_ROSTER_LIST,
  EXCEPTION_LISTS,
  EXCEPTION_LISTS_BASELINE_PATH,
  checkRoster,
  compareExceptionLists,
  evaluateExceptionLists,
  figureEntries,
  parseExceptionListSnapshot,
  planExceptionListBaseline,
  readCurrentLists,
  sha256,
  type CurrentList,
  type ExceptionListSnapshot,
} from './exception-lists';
import { common2_8, matches2_8, parse2_8, type Texts2_8 } from './guardrails-2-8';

/** No 2.8 text: nothing is accepted as 2.8 itself (ADR 0011). */
const NO_2_8: Texts2_8 = { texts: [], problems: [] };

function snapshot(lists: ExceptionListSnapshot['lists'], extra: Partial<ExceptionListSnapshot> = {}): ExceptionListSnapshot {
  return { name: 'unapproved baseline v0 (exception lists)', status: 'unapproved', version: 0, recordedOn: '2026-09-25', approvalRef: '', lists, ...extra };
}

function current(direction: 'allow' | 'deny', entries: Record<string, unknown>): Map<string, CurrentList> {
  return new Map([
    ['test.list', { direction, source: 'test', entries: new Map(Object.entries(entries).map(([key, content]) => [key, { sha256: sha256(content), label: key }])) }],
  ]);
}

const recorded = (direction: 'allow' | 'deny', entries: Record<string, unknown>): ExceptionListSnapshot['lists'] => ({
  'test.list': {
    direction,
    source: 'test',
    entries: Object.fromEntries(
      Object.entries(entries).map(([key, content]) => [key, direction === 'allow' ? { sha256: sha256(content), recordedOn: '2026-09-25' } : { recordedOn: '2026-09-25' }]),
    ),
  },
});

describe('compareExceptionLists', () => {
  it('reads an addition to an allow list, and a changed allow entry, as loosenings', () => {
    const differences = compareExceptionLists(snapshot(recorded('allow', { a: 1 })), current('allow', { a: 2, b: 1 }));
    expect(differences.map((item) => item.kind)).toEqual(['loosening', 'loosening']);
    expect(differences.map((item) => item.message).join('\n')).toMatch(/entry changed: a[\s\S]*entry added: b/);
  });

  it('reads a removal from a deny list as a loosening, and an addition to it as a tightening', () => {
    const differences = compareExceptionLists(snapshot(recorded('deny', { a: 'a', b: 'b' })), current('deny', { a: 'a', c: 'c' }));
    expect(differences).toEqual([
      { list: 'test.list', kind: 'tightening', message: 'exception list test.list: entry added to a deny list: c', key: 'c', change: 'added' },
      { list: 'test.list', kind: 'loosening', message: 'exception list test.list: entry removed from a deny list: b', key: 'b', change: 'removed' },
    ]);
  });

  it('reads a removal from an allow list as a tightening', () => {
    expect(compareExceptionLists(snapshot(recorded('allow', { a: 1 })), current('allow', {})).map((item) => item.kind)).toEqual(['tightening']);
  });

  it('reads a list no longer read, and a changed direction, as loosenings', () => {
    expect(compareExceptionLists(snapshot(recorded('allow', { a: 1 })), new Map())[0]?.kind).toBe('loosening');
    expect(compareExceptionLists(snapshot(recorded('deny', { a: 'a' })), current('allow', { a: 'a' }))[0]?.message).toContain('direction changed');
  });
});

// Phase 1 review, verifier finding 3: a brand-new allow list was read as a tightening whatever
// its entries, so index.stub-aware-support-modules recorded property.ts, a widening of the
// index check's [support] rule, without the approver.
describe('a brand-new allow list', () => {
  const roster = (checks: readonly string[]): ExceptionListSnapshot['lists'] => ({
    [CHECK_ROSTER_LIST]: { direction: 'deny', source: 'test', entries: Object.fromEntries(checks.map((check) => [check, { recordedOn: '2026-09-25' }])) },
  });
  const lists = (checks: readonly string[], allow: Record<string, unknown>, check: string): Map<string, CurrentList> =>
    new Map<string, CurrentList>([
      [CHECK_ROSTER_LIST, { direction: 'deny', source: 'test', check: 'loosening', entries: new Map(checks.map((item) => [item, { sha256: sha256(item), label: item }])) }],
      ['test.new-allow', { direction: 'allow', source: 'test', check, entries: new Map(Object.entries(allow).map(([key, content]) => [key, { sha256: sha256(content), label: key }])) }],
    ]);

  it('counts each entry as an added allow entry, a loosening, when its check is in the base roster', () => {
    const differences = compareExceptionLists(snapshot(roster(['index', 'loosening'])), lists(['index', 'loosening'], { 'TEST/a.ts': 1, 'TEST/b.ts': 2 }, 'index'));
    expect(differences.map((item) => [item.kind, item.change, item.key])).toEqual([
      ['loosening', 'added', 'TEST/a.ts'],
      ['loosening', 'added', 'TEST/b.ts'],
    ]);
    expect(differences[0]?.message).toContain('its check index is in unapproved baseline v0 (exception lists)\'s roster, so the list widens a check the base already has');
  });

  it('counts each entry as a loosening when the base holds no roster, so the check cannot be told new', () => {
    const differences = compareExceptionLists(snapshot({}), lists(['index', 'loosening'], { 'TEST/a.ts': 1 }, 'index'));
    expect(differences.filter((item) => item.list === 'test.new-allow').map((item) => item.kind)).toEqual(['loosening']);
    expect(differences.find((item) => item.list === 'test.new-allow')?.message).toContain('holds no roster of checks');
  });

  it('is a tightening only for a check absent from the base roster, and reports its entries apart for the owner', () => {
    const differences = compareExceptionLists(snapshot(roster(['index', 'loosening'])), lists(['index', 'loosening', 'eslint:no-test-ban'], { 'TEST/c.ts': 1 }, 'eslint:no-test-ban'));
    const list = differences.find((item) => item.list === 'test.new-allow');
    expect(list?.kind).toBe('tightening');
    expect(list?.newAllowEntries).toEqual(['test.new-allow: TEST/c.ts (the new check eslint:no-test-ban)']);
    // The check's own roster entry is a deny-list addition: a tightening too.
    expect(differences.find((item) => item.list === CHECK_ROSTER_LIST)?.kind).toBe('tightening');
    const report = evaluateExceptionLists({
      current: { lists: lists(['index', 'loosening', 'eslint:no-test-ban'], { 'TEST/c.ts': 1 }, 'eslint:no-test-ban'), problems: [] },
      baseline: snapshot(roster(['index', 'loosening'])),
      approvedSnapshots: [],
      approvals: parseApprovalContext({ guardrails: readFileSync(join(repoRoot, 'docs/guardrails.md'), 'utf8') }),
      texts2_8: NO_2_8,
      buildLog: undefined,
    });
    expect(report.newAllowEntries).toEqual(['test.new-allow: TEST/c.ts (the new check eslint:no-test-ban)']);
  });

  it('is refused by the writer when it widens a check the base has, and recorded when its check is new', () => {
    const base = snapshot(roster(['index', 'loosening']));
    const plan = (current: Map<string, CurrentList>) =>
      planExceptionListBaseline({ current: { lists: current, problems: [] }, existing: base, onDisk: '', today: '2099-01-01', inHead: true });
    const widening = plan(lists(['index', 'loosening'], { 'TEST/a.ts': 1 }, 'index'));
    expect(widening.ok).toBe(false);
    expect(widening.problems.join('\n')).toContain('exception list test.new-allow: entry added: TEST/a.ts');
    const newCheck = plan(lists(['index', 'loosening', 'eslint:no-test-ban'], { 'TEST/c.ts': 1 }, 'eslint:no-test-ban'));
    expect(newCheck.problems).toEqual([]);
    expect(newCheck.newEntries).toContain('test.new-allow (allow list of the new check eslint:no-test-ban): TEST/c.ts');
  });

  it('keeps a recorded widening note with its unchanged entry, and reports the entry apart', () => {
    const lists1: ExceptionListSnapshot['lists'] = {
      ...roster(['index', 'loosening']),
      'test.list': { direction: 'allow', source: 'test', entries: { 'TEST/p.ts': { sha256: sha256(1), recordedOn: '2026-09-25', widening: 'TEST: widens the index check' } } },
    };
    const current = new Map<string, CurrentList>([
      [CHECK_ROSTER_LIST, { direction: 'deny', source: 'test', check: 'loosening', entries: new Map(['index', 'loosening'].map((item) => [item, { sha256: sha256(item), label: item }])) }],
      ['test.list', { direction: 'allow', source: 'test', check: 'index', entries: new Map([['TEST/p.ts', { sha256: sha256(1), label: 'TEST/p.ts' }]]) }],
    ]);
    const plan = planExceptionListBaseline({ current: { lists: current, problems: [] }, existing: snapshot(lists1), onDisk: '', today: '2099-01-01', inHead: true });
    expect(parseExceptionListSnapshot(plan.text, 'plan').lists['test.list']?.entries['TEST/p.ts']?.widening).toBe('TEST: widens the index check');
    const report = evaluateExceptionLists({
      current: { lists: current, problems: [] },
      baseline: snapshot(lists1),
      approvedSnapshots: [],
      approvals: parseApprovalContext({ guardrails: readFileSync(join(repoRoot, 'docs/guardrails.md'), 'utf8') }),
      texts2_8: NO_2_8,
      buildLog: undefined,
    });
    expect(report.problems).toEqual([]);
    expect(report.widenings).toEqual(['exception list test.list: TEST/p.ts (recorded 2026-09-25): TEST: widens the index check']);
    // A changed entry loses the note and is a loosening: a changed allow entry.
    const changed = new Map(current);
    changed.set('test.list', { direction: 'allow', source: 'test', check: 'index', entries: new Map([['TEST/p.ts', { sha256: sha256(2), label: 'TEST/p.ts' }]]) });
    const again = planExceptionListBaseline({ current: { lists: changed, problems: [] }, existing: snapshot(lists1), onDisk: '', today: '2099-01-01', inHead: true });
    expect(again.ok).toBe(false);
  });

  it('holds property.ts as the one widening the phase 1 review recorded, and every list names a check of the roster', async () => {
    const baseline = parseExceptionListSnapshot(readFileSync(EXCEPTION_LISTS_BASELINE_PATH, 'utf8'), 'baseline');
    const widenings = Object.entries(baseline.lists).flatMap(([id, list]) =>
      Object.entries(list.entries)
        .filter(([, entry]) => entry.widening !== undefined)
        .map(([key]) => `${id} ${key}`),
    );
    expect(widenings).toEqual(['index.stub-aware-support-modules tests/guardrails/_support/property.ts']);
    const names = await checkRoster();
    for (const spec of EXCEPTION_LISTS) expect(names, spec.id).toContain(spec.check);
    expect(Object.keys(baseline.lists[CHECK_ROSTER_LIST]?.entries ?? {})).toEqual(names);
  });

  it('fails a list that names a check outside the roster', async () => {
    const current = await readCurrentLists(undefined, [
      ...EXCEPTION_LISTS.filter((spec) => spec.id === CHECK_ROSTER_LIST),
      { id: 'test.unknown-check', direction: 'allow', check: 'no-such-check', source: 'test', read: async () => [] },
    ]);
    expect(current.problems.join('\n')).toContain('exception list test.unknown-check: names the check "no-such-check", which is not in the roster of checks');
  });
});

describe('evaluateExceptionLists', () => {
  const noApprover = parseApprovalContext({ guardrails: readFileSync(join(repoRoot, 'docs/guardrails.md'), 'utf8') });
  const named = parseApprovalContext({
    guardrails: [
      '| Approver | Role | Since |',
      '|---|---|---|',
      '| Ana Test | Product owner | 2026-01-01 |',
      '',
      '| Version | Date | Change | Approved by |',
      '|---|---|---|---|',
      '| 2.0 | 2026-02-01 | Approved exception lists v1 (the render entry test-a). | Ana Test |',
    ].join('\n'),
    today: '2026-09-25',
  });

  it('fails an addition against the unapproved baseline, whatever the approver table says', () => {
    for (const approvals of [noApprover, named]) {
      const report = evaluateExceptionLists({
        current: { lists: current('allow', { a: 1, b: 1 }), problems: [] },
        baseline: snapshot(recorded('allow', { a: 1 })),
        approvedSnapshots: [],
        approvals,
        texts2_8: NO_2_8,
        buildLog: undefined,
      });
      expect(report.problems.join('\n')).toContain('exception list test.list: entry added: b: a loosening against unapproved baseline v0 (exception lists) with no approval reference');
    }
  });

  it('moves the base to an approved snapshot only when its reference resolves', () => {
    const approved = snapshot(recorded('allow', { a: 1, b: 1 }), { name: 'approved exception lists v1', status: 'approved', version: 1, approvalRef: 'guardrails-changelog:2.0' });
    const inputs = {
      current: { lists: current('allow', { a: 1, b: 1 }), problems: [] },
      baseline: snapshot(recorded('allow', { a: 1 })),
      approvedSnapshots: [approved],
      texts2_8: NO_2_8,
      buildLog: undefined,
    };
    const resolved = evaluateExceptionLists({ ...inputs, approvals: named });
    expect(resolved.problems).toEqual([]);
    expect(resolved.base).toBe('approved exception lists v1');
    const unresolved = evaluateExceptionLists({ ...inputs, approvals: noApprover });
    expect(unresolved.problems.join('\n')).toContain('approved exception lists v1: its approval reference "guardrails-changelog:2.0" does not resolve');
    expect(unresolved.problems.join('\n')).toContain('entry added: b');
  });

  it('fails a missing baseline and a list that cannot be read', () => {
    const missing = evaluateExceptionLists({
      current: { lists: new Map(), problems: ['exception list x: cannot be read'] },
      baseline: undefined,
      approvedSnapshots: [],
      approvals: noApprover,
      texts2_8: NO_2_8,
      buildLog: undefined,
    });
    expect(missing.problems).toEqual(expect.arrayContaining(['exception list x: cannot be read', expect.stringContaining('unapproved-baseline-v0.json is missing')]));
  });
});

describe('the lists and the snapshot file', () => {
  it('reads every list from the repository, and each is in the snapshot', async () => {
    const lists = await readCurrentLists();
    expect(lists.problems).toEqual([]);
    const baseline = parseExceptionListSnapshot(readFileSync(EXCEPTION_LISTS_BASELINE_PATH, 'utf8'), 'baseline');
    expect(Object.keys(baseline.lists).sort()).toEqual(EXCEPTION_LISTS.map((spec) => spec.id).sort());
    expect(lists.lists.get('render.entries')?.entries.has('max-file-size')).toBe(true);
    expect(lists.lists.get('mockup-figures')?.entries.size).toBeGreaterThan(100);
  });

  it('never stores a figure: figure lists are keyed by hash and labelled by source line', () => {
    const entries = figureEntries('# comment\ntext | TEST Hotel Name | spec.md:1  # note\nnumber | 12,345 | spec.md:2\nnumber | 12,345 | spec.md:3\n', 'test.txt');
    expect(entries.map((entry) => entry.key)).toEqual([expect.stringMatching(/^text:sha256:[0-9a-f]{16}$/), expect.stringMatching(/^number:sha256:[0-9a-f]{16}$/), expect.stringMatching(/^number:sha256:[0-9a-f]{16}#2$/)]);
    const text = JSON.stringify(entries.map((entry) => [entry.key, entry.label]));
    expect(text).not.toContain('TEST Hotel Name');
    expect(text).not.toContain('12,345');
    expect(entries[0]?.label).toBe('text entry, test.txt line 2 (spec.md:1)');
  });

  it('keeps the mockups\' figures and hotel name out of the snapshot file', () => {
    const snapshotText = readFileSync(EXCEPTION_LISTS_BASELINE_PATH, 'utf8');
    for (const line of readFileSync(join(repoRoot, 'tools/checks/mockup-figures.txt'), 'utf8').split('\n')) {
      const fields = line.split('|').map((field) => field.trim());
      if (line.trim().startsWith('#') || fields.length < 3) continue;
      const figure = fields[1] ?? '';
      // Short figures can occur inside a hex digest by chance; a figure with a letter, a separator or 4+ digits cannot.
      if (/^\d{1,3}$/.test(figure)) continue;
      expect(snapshotText.includes(figure), figure.length > 0 ? `a listed figure (${fields[0]}) is in the snapshot` : 'empty').toBe(false);
    }
  });

  it('hashes content in a stable order', () => {
    expect(sha256({ b: 1, a: new Set(['y', 'x']) })).toBe(sha256({ a: new Set(['x', 'y']), b: 1 }));
    expect(sha256({ a: /x/u })).not.toBe(sha256({ a: /x/g }));
  });
});

describe('reserved-term allowances that are texts of 2.8 itself (ADR 0011)', () => {
  const guardrails = readFileSync(join(repoRoot, 'docs/guardrails.md'), 'utf8');
  const texts = parse2_8(guardrails);
  const noApprover = parseApprovalContext({ guardrails });

  it('reads the badge, status-line and allowed-place texts of 2.8, with the kind of each place', () => {
    expect(texts.problems).toEqual([]);
    const has = (kind: string, text: string) => texts.texts.some((entry) => entry.kind === kind && entry.text === text);
    expect(has('badge', 'Verified by SOVITECH')).toBe(true);
    expect(has('badge', 'Confirmed by you')).toBe(true);
    expect(has('badge', 'Unknown')).toBe(true);
    expect(has('badge', 'Not provided yet')).toBe(true);
    expect(has('status_line', 'Formal quotation')).toBe(true);
    expect(has('status_line', 'Superseded: inputs changed on <date>')).toBe(true);
    expect(has('generated_sentence', 'AI inference, verified by SOVITECH on 12 Oct')).toBe(true);
    expect(has('generated_sentence', 'AI inference, confirmed by you')).toBe(true);
    expect(has('generated_sentence', 'designed to provide the functions of BAC class B, verified by SOVITECH')).toBe(true);
    expect(has('action_label', 'Confirm')).toBe(true);
    // Registry qualifier labels are outside the ruling: they always wait for the approver.
    expect(texts.texts.some((entry) => entry.text === 'final energy')).toBe(false);
    // Bullet examples that the tables list keep the tables' kinds only.
    expect(has('generated_sentence', 'Verified by SOVITECH')).toBe(false);
    expect(has('generated_sentence', 'Formal quotation')).toBe(false);
    // "Formal quotation" at stage 3: bound to the stored quotation record (rule 10).
    expect(texts.texts.find((entry) => entry.kind === 'status_line' && entry.text === 'Formal quotation')?.requiresRecord).toBe('quotation_record');
    expect(texts.texts.filter((entry) => entry.requiresRecord !== undefined).map((entry) => entry.text)).toEqual(['Formal quotation']);
  });

  it.each([
    [{ kind: 'badge', badgeId: 'engineer-verified', label: 'Verified by SOVITECH' }, 'Verified by SOVITECH'],
    [{ kind: 'badge', badgeId: 'user-confirmed', label: 'Confirmed by you' }, 'Confirmed by you'],
    [{ kind: 'status_line', statusLineId: 'stage-3', text: 'Formal quotation', requiresRecord: 'quotation_record' }, 'Formal quotation'],
    [{ kind: 'generated_sentence', templateId: 'ai-verified', template: 'AI inference, verified by SOVITECH on {date}', readsStoredState: ['engineer_verified'] }, 'AI inference, verified by SOVITECH on 12 Oct'],
    [{ kind: 'generated_sentence', templateId: 'ai-verified-literal', template: 'AI inference, verified by SOVITECH on 12 Oct', readsStoredState: ['engineer_verified'] }, 'AI inference, verified by SOVITECH on 12 Oct'],
    [{ kind: 'generated_sentence', templateId: 'ai-confirmed', template: 'AI inference, confirmed by you', readsStoredState: ['user_confirmed'] }, 'AI inference, confirmed by you'],
    [{ kind: 'status_line', statusLineId: 'superseded', text: 'Superseded: inputs changed on {date}' }, 'Superseded: inputs changed on <date>'],
  ])('accepts %o, word for word the 2.8 text "%s" of its kind', (content, text) => {
    expect(matches2_8(content, texts.texts)?.text).toBe(text);
  });

  it.each([
    ['a near miss: another case', { kind: 'badge', badgeId: 'x', label: 'Verified by Sovitech' }],
    ['a near miss: more words', { kind: 'badge', badgeId: 'x', label: 'Verified by SOVITECH engineers' }],
    ['a near miss: other words', { kind: 'badge', badgeId: 'x', label: 'Confirmed by SOVITECH' }],
    ['a 2.8 badge as another kind', { kind: 'status_line', statusLineId: 'x', text: 'Verified by SOVITECH' }],
    ['a 2.8 status line as a badge', { kind: 'badge', badgeId: 'x', label: 'Formal quotation' }],
    ['a 2.8 badge as a generated sentence', { kind: 'generated_sentence', templateId: 'x', template: 'Confirmed by you', readsStoredState: ['user_confirmed'] }],
    ['a slot where 2.8 has words', { kind: 'generated_sentence', templateId: 'x', template: 'AI inference, {verb} by SOVITECH on {date}', readsStoredState: ['x'] }],
    ['a slot for the BAC class letter', { kind: 'generated_sentence', templateId: 'x', template: 'designed to provide the functions of BAC class {class}, verified by SOVITECH', readsStoredState: ['x'] }],
    ['a slot in a badge', { kind: 'badge', badgeId: 'x', label: '{who} by SOVITECH' }],
    ['a registry qualifier label 2.8 names', { kind: 'qualifier_label', fieldKey: 'energy', qualifier: 'final', label: 'final energy' }],
    ['a firm price', { kind: 'status_line', statusLineId: 'x', text: 'Firm price' }],
    // Phase 1 review, adversarial finding 12: 2.8 allows "Formal quotation" at stage 3 only.
    ['the stage 3 label not bound to its stored quotation record', { kind: 'status_line', statusLineId: 'x', text: 'Formal quotation' }],
    ['the stage 3 label bound to another record', { kind: 'status_line', statusLineId: 'x', text: 'Formal quotation', requiresRecord: 'any_record' }],
  ])('refuses %s', (_name, content) => {
    expect(matches2_8(content, texts.texts)).toBeUndefined();
  });

  it('accepts only what 2.8 holds on both sides: a text added in the working tree alone is not 2.8 on main', () => {
    const added = guardrails.replace('| Engineer verified | **Verified by SOVITECH** |', '| Engineer verified | **Verified by SOVITECH** |\n| TEST situation | **Firm price agreed** | |');
    const working = parse2_8(added);
    expect(working.texts.some((entry) => entry.text === 'Firm price agreed')).toBe(true);
    const both = common2_8(texts, working);
    expect(matches2_8({ kind: 'badge', badgeId: 'x', label: 'Firm price agreed' }, both.texts)).toBeUndefined();
    expect(matches2_8({ kind: 'badge', badgeId: 'y', label: 'Verified by SOVITECH' }, both.texts)?.text).toBe('Verified by SOVITECH');
  });

  it('fails closed when 2.8 cannot be read', () => {
    expect(parse2_8('# no such section').problems[0]).toContain('no "### 2.8" section');
  });

  it('passes an added allowance that is a 2.8 text, and fails one that is not, against the unapproved baseline', () => {
    const list = (entries: Record<string, unknown>) =>
      new Map([['reserved-terms.allowances', { direction: 'allow' as const, source: 'test', entries: new Map(Object.entries(entries).map(([key, content]) => [key, { sha256: sha256(content), label: key, content }])) }]]);
    const baseline = snapshot({ 'reserved-terms.allowances': { direction: 'allow', source: 'test', entries: {} } });
    const inputs = (entries: Record<string, unknown>) => ({
      current: { lists: list(entries), problems: [] },
      baseline,
      approvedSnapshots: [],
      approvals: noApprover,
      texts2_8: texts,
      buildLog: undefined,
    });
    const verbatim = evaluateExceptionLists(inputs({ 'badge:engineer-verified': { kind: 'badge', badgeId: 'engineer-verified', label: 'Verified by SOVITECH' } }));
    expect(verbatim.problems).toEqual([]);
    expect(verbatim.accepted2_8.join('\n')).toContain('is the text "Verified by SOVITECH" of 2.8 badge table');
    const nearMiss = evaluateExceptionLists(inputs({ 'badge:x': { kind: 'badge', badgeId: 'x', label: 'Verified by SOVITECH engineers' } }));
    expect(nearMiss.problems.join('\n')).toContain('entry added: badge:x: a loosening');
    expect(nearMiss.problems.join('\n')).toContain('not word for word a text docs/guardrails.md 2.8 lists for its kind (ADR 0011)');
  });
});
