/**
 * Asset identity and asset events (docs/guardrails.md 2.5): one tag one asset,
 * untagged appearances never merged or counted, and merge, split and remove
 * events written only by an engineer, with a reason. Every value is TEST data.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  EVENT_ROLES,
  assetEventRefusal,
  deriveAssetRegister,
  documentStatuses,
  lifeSafetyTreatment,
  normaliseTag,
  planAssetIdentity,
  type AssetAppearance,
  type AssetIdentity,
  type DocumentEvent,
  type FieldState,
  type ProposedAssetEvent,
} from './index';

const PROJECT = 'test-project';

const identity = (tag: string): AssetIdentity => ({ assetId: `test-asset-${tag}`, projectId: PROJECT, normalisedTag: tag });

const appearance = (id: string, tagAsWritten?: string): AssetAppearance => ({
  id,
  projectId: PROJECT,
  ...(tagAsWritten === undefined ? {} : { tagAsWritten }),
  evidence: [{ documentId: 'test-doc', contentHash: 'sha256:test-doc', locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
});

/** No document is withdrawn or erased. */
const ACTIVE_DOCUMENTS = documentStatuses([], () => undefined);

/** One live appearance for each identity, so each is evidenced and countable. */
const appearancesFor = (identities: readonly AssetIdentity[]): AssetAppearance[] =>
  identities.map((held) => appearance(`test-app-${held.normalisedTag}`, held.normalisedTag));

const event = (overrides: Partial<ProposedAssetEvent>): ProposedAssetEvent => ({
  assetId: 'test-asset-A',
  type: 'removed',
  relatedAssetIds: [],
  by: 'test-engineer',
  role: 'sovitech_engineer',
  at: '2026-09-25T10:00:00.000Z',
  reason: 'TEST reason',
  ...overrides,
});

describe('tags', () => {
  test('the same tag as written in different case or spacing around a separator is one tag', () => {
    expect(normaliseTag(' cta-01 ')).toBe('CTA-01');
    expect(normaliseTag('CTA – 01')).toBe('CTA-01');
    expect(normaliseTag('VCV-3.12')).toBe('VCV-3.12');
  });

  test('different tags stay different: no separator is dropped, the system prefix stays as written', () => {
    expect(normaliseTag('CTA 01')).not.toBe(normaliseTag('CTA-01'));
    expect(normaliseTag('P1.1')).not.toBe(normaliseTag('P11'));
    expect(normaliseTag('1-AHU-1')).not.toBe(normaliseTag('AHU-1'));
  });

  test('an empty tag is no tag: the appearance is untagged', () => {
    for (const blank of [undefined, '', '   ']) expect(normaliseTag(blank)).toBeNull();
    expect(planAssetIdentity([], appearance('test-app', '  '))).toEqual({ kind: 'untagged' });
  });

  test('one tag, one asset: a held tag joins its asset, a new one needs a new identity', () => {
    expect(planAssetIdentity([identity('CTA-01')], appearance('test-app', 'cta-01'))).toEqual({
      kind: 'existing_asset',
      assetId: 'test-asset-CTA-01',
    });
    expect(planAssetIdentity([identity('CTA-01')], appearance('test-app', 'CTA-02'))).toEqual({
      kind: 'new_asset',
      normalisedTag: 'CTA-02',
    });
  });

  test('two identities for one tag in a project are refused loudly, never read as two assets', () => {
    const doubled = [identity('CTA-01'), { ...identity('CTA-01'), assetId: 'test-asset-other' }];
    expect(() => planAssetIdentity(doubled, appearance('test-app', 'CTA-01'))).toThrow(/holds 2 assets for the tag/);
    expect(() => deriveAssetRegister({ projectId: PROJECT, identities: doubled, appearances: [], events: [], documents: ACTIVE_DOCUMENTS })).toThrow(
      /holds two assets for the tag/,
    );
  });

  test("another project's identities and appearances are never read", () => {
    const foreign: AssetIdentity = { assetId: 'test-asset-foreign', projectId: 'test-other-project', normalisedTag: 'CTA-01' };
    expect(planAssetIdentity([foreign], appearance('test-app', 'CTA-01'))).toEqual({ kind: 'new_asset', normalisedTag: 'CTA-01' });
    const register = deriveAssetRegister({
      projectId: PROJECT,
      identities: [foreign],
      appearances: [{ ...appearance('test-app', 'CTA-01'), projectId: 'test-other-project' }],
      events: [],
      documents: ACTIVE_DOCUMENTS,
    });
    expect(register.assets).toEqual([]);
    expect(register.countable).toEqual([]);
  });
});

describe('asset events: only an engineer, with a reason (2.5)', () => {
  const identities = [identity('A'), identity('B')];

  test('an event from any role but sovitech_engineer is refused and changes nothing', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EVENT_ROLES.filter((role) => role !== 'sovitech_engineer'), 'sovitech_admin', 'sovitech_commercial_reviewer', ''),
        fc.constantFrom<ProposedAssetEvent['type']>('merged_into', 'split_from', 'removed'),
        (role, type) => {
          const proposed = event({ role, type, relatedAssetIds: type === 'removed' ? [] : ['test-asset-B'] });
          const register = deriveAssetRegister({ projectId: PROJECT, identities, appearances: appearancesFor(identities), events: [proposed], documents: ACTIVE_DOCUMENTS });
          expect(register.refusedEvents).toEqual([{ event: proposed, refusal: 'role_not_engineer' }]);
          expect(register.countable).toEqual(['test-asset-A', 'test-asset-B']);
        },
      ),
    );
  });

  test('an engineer event without a reason, or without who wrote it, is refused', () => {
    expect(assetEventRefusal(event({ reason: ' ' }), () => 'active')).toBe('reason_missing');
    expect(assetEventRefusal(event({ by: '' }), () => 'active')).toBe('by_missing');
  });

  test('counts include only assets neither removed nor merged into another', () => {
    const register = deriveAssetRegister({
      projectId: PROJECT,
      identities: [...identities, identity('C')],
      appearances: appearancesFor([...identities, identity('C')]),
      documents: ACTIVE_DOCUMENTS,
      events: [
        event({ assetId: 'test-asset-A', type: 'merged_into', relatedAssetIds: ['test-asset-B'] }),
        event({ assetId: 'test-asset-C', type: 'removed', at: '2026-09-25T11:00:00.000Z' }),
      ],
    });
    expect(register.countable).toEqual(['test-asset-B']);
    expect(register.assets.find((asset) => asset.assetId === 'test-asset-A')).toMatchObject({ status: 'merged', mergedInto: 'test-asset-B' });
    expect(register.refusedEvents).toEqual([]);
  });

  test('a split brings a merged asset back into the count; a removed asset is not revived', () => {
    const merged = event({ assetId: 'test-asset-A', type: 'merged_into', relatedAssetIds: ['test-asset-B'] });
    const split = event({ assetId: 'test-asset-A', type: 'split_from', relatedAssetIds: ['test-asset-B'], at: '2026-09-25T11:00:00.000Z' });
    expect(deriveAssetRegister({ projectId: PROJECT, identities, appearances: appearancesFor(identities), events: [merged, split], documents: ACTIVE_DOCUMENTS }).countable).toEqual([
      'test-asset-A',
      'test-asset-B',
    ]);
    const removed = event({ assetId: 'test-asset-A', type: 'removed' });
    const revive = { ...split };
    const register = deriveAssetRegister({ projectId: PROJECT, identities, appearances: appearancesFor(identities), events: [removed, revive], documents: ACTIVE_DOCUMENTS });
    expect(register.countable).toEqual(['test-asset-B']);
    expect(register.refusedEvents).toEqual([{ event: revive, refusal: 'asset_not_active' }]);
  });

  test('malformed merges are refused: into itself, into an unknown or merged asset, with more than one target', () => {
    const standing = (id: string) => (id === 'test-asset-A' || id === 'test-asset-B' ? 'active' : id === 'test-asset-M' ? 'merged' : undefined);
    expect(assetEventRefusal(event({ type: 'merged_into', relatedAssetIds: ['test-asset-A'] }), standing)).toBe('related_to_itself');
    expect(assetEventRefusal(event({ type: 'merged_into', relatedAssetIds: ['test-asset-Z'] }), standing)).toBe('related_asset_unknown');
    expect(assetEventRefusal(event({ type: 'merged_into', relatedAssetIds: ['test-asset-M'] }), standing)).toBe('target_not_active');
    expect(assetEventRefusal(event({ type: 'merged_into', relatedAssetIds: ['test-asset-B', 'test-asset-M'] }), standing)).toBe(
      'related_asset_count',
    );
    expect(assetEventRefusal(event({ assetId: 'test-asset-Z' }), standing)).toBe('unknown_asset');
  });

  test('the register does not depend on the order events are passed in', () => {
    const merged = event({ assetId: 'test-asset-A', type: 'merged_into', relatedAssetIds: ['test-asset-B'] });
    const split = event({ assetId: 'test-asset-A', type: 'split_from', relatedAssetIds: ['test-asset-B'], at: '2026-09-25T11:00:00.000Z' });
    const forward = deriveAssetRegister({ projectId: PROJECT, identities, appearances: appearancesFor(identities), events: [merged, split], documents: ACTIVE_DOCUMENTS });
    const backward = deriveAssetRegister({ projectId: PROJECT, identities, appearances: appearancesFor(identities), events: [split, merged], documents: ACTIVE_DOCUMENTS });
    expect(backward).toEqual(forward);
  });
});

describe('untagged appearances (2.5)', () => {
  test('are listed as possible duplicates, never merged or counted', () => {
    fc.assert(
      fc.property(fc.nat({ max: 20 }), fc.nat({ max: 20 }), (tagged, untagged) => {
        const identities = Array.from({ length: tagged }, (_, index) => identity(`T-${String(index)}`));
        const appearances = [
          ...Array.from({ length: tagged }, (_, index) => appearance(`test-tagged-${String(index)}`, `T-${String(index)}`)),
          ...Array.from({ length: untagged }, (_, index) => appearance(`test-untagged-${String(index)}`)),
        ];
        const register = deriveAssetRegister({ projectId: PROJECT, identities, appearances, events: [], documents: ACTIVE_DOCUMENTS });
        expect(register.countable).toHaveLength(tagged);
        expect(register.possibleDuplicates).toHaveLength(untagged);
      }),
    );
  });

  test('a tagged appearance whose identity is not stored yet is listed, never counted', () => {
    const register = deriveAssetRegister({ projectId: PROJECT, identities: [], appearances: [appearance('test-app', 'CTA-09')], events: [], documents: ACTIVE_DOCUMENTS });
    expect(register.withoutIdentity).toEqual(['test-app']);
    expect(register.countable).toEqual([]);
  });
});

describe('appearances from removed documents (2.3 "Deleting a document"; rule 13; phase 1 review)', () => {
  const erased: DocumentEvent = { documentId: 'test-doc', type: 'erased', by: 'test-owner', role: 'owner', at: '2026-09-25T12:00:00.000Z' };
  const withdrawn: DocumentEvent = { ...erased, type: 'withdrawn' };
  const fromOther = (id: string, tagAsWritten?: string): AssetAppearance => ({
    ...appearance(id, tagAsWritten),
    evidence: [{ documentId: 'test-doc-other', contentHash: 'sha256:test-doc-other', locator: { page: 2 }, excerpt: 'TEST', check: 'text_match' }],
  });

  test('an asset whose only appearance cites an erased or withdrawn document is not counted, and is listed as "Source document removed"', () => {
    for (const removal of [erased, withdrawn]) {
      const register = deriveAssetRegister({
        projectId: PROJECT,
        identities: [identity('CTA-01')],
        appearances: [appearance('test-app-1', 'CTA-01')],
        events: [],
        documents: documentStatuses([removal], () => undefined),
      });
      expect(register.countable).toEqual([]);
      expect(register.withoutLiveEvidence).toEqual(['test-asset-CTA-01']);
      expect(register.assets[0]).toMatchObject({
        appearanceIds: ['test-app-1'],
        liveAppearanceIds: [],
        evidence: 'source_document_removed',
        statusLines: ['source_document_removed'],
        review: { list: 'for_you', reason: 'source_document_removed' },
      });
    }
  });

  test('a withdrawal by the job with no person\'s withdrawal behind it, or an erasure outside the erasure function, removes nothing: the asset stays counted (rounds 4 and 5)', () => {
    for (const removal of [
      { ...withdrawn, by: 'test-job', role: 'system' as const, reason: 'document_deleted' },
      { ...withdrawn, by: 'test-job', role: 'system' as const, reason: 'document_deleted', id: 'test-job-event', requestEventId: 'test-event-missing' },
      { ...erased, by: 'test-job', role: 'system' as const, reason: 'TEST' },
      { ...erased, by: 'test-engineer', role: 'sovitech_engineer' as const, reason: 'document_erased' },
    ]) {
      const register = deriveAssetRegister({
        projectId: PROJECT,
        identities: [identity('CTA-01')],
        appearances: [appearance('test-app-1', 'CTA-01')],
        events: [],
        documents: documentStatuses([removal], () => undefined),
      });
      expect(register.countable, `${removal.type}/${removal.role}`).toEqual(['test-asset-CTA-01']);
      expect(register.withoutLiveEvidence, `${removal.type}/${removal.role}`).toEqual([]);
    }
    // An engineer's own withdrawal (2.3 names engineers), the job carrying it out, and the erasure function's own
    // erasure as the system each remove it.
    const byEngineer = { ...withdrawn, by: 'test-engineer', role: 'sovitech_engineer' as const, id: 'test-event-engineer' };
    for (const events of [
      [byEngineer],
      [byEngineer, { ...withdrawn, by: 'test-job', role: 'system' as const, reason: 'document_deleted', id: 'test-job-event', requestEventId: byEngineer.id }],
      [{ ...erased, by: 'test-erasure', role: 'system' as const, reason: 'document_erased' }],
    ]) {
      const removed = deriveAssetRegister({
        projectId: PROJECT,
        identities: [identity('CTA-01')],
        appearances: [appearance('test-app-1', 'CTA-01')],
        events: [],
        documents: documentStatuses(events, () => undefined),
      });
      expect(removed.countable, events.map((event) => `${event.type}/${event.role}`).join(' ')).toEqual([]);
    }
  });

  test('an asset with evidence from another active document keeps it and stays counted', () => {
    const register = deriveAssetRegister({
      projectId: PROJECT,
      identities: [identity('CTA-01')],
      appearances: [appearance('test-app-1', 'CTA-01'), fromOther('test-app-2', 'CTA-01')],
      events: [],
      documents: documentStatuses([erased], () => undefined),
    });
    expect(register.countable).toEqual(['test-asset-CTA-01']);
    expect(register.assets[0]).toMatchObject({ appearanceIds: ['test-app-1', 'test-app-2'], liveAppearanceIds: ['test-app-2'], evidence: 'live', statusLines: [] });
  });

  test('untagged and unidentified appearances from a removed document are no longer listed', () => {
    const register = deriveAssetRegister({
      projectId: PROJECT,
      identities: [],
      appearances: [appearance('test-untagged'), appearance('test-new-tag', 'CTA-09'), fromOther('test-untagged-other')],
      events: [],
      documents: documentStatuses([erased], () => undefined),
    });
    expect(register.possibleDuplicates).toEqual(['test-untagged-other']);
    expect(register.withoutIdentity).toEqual([]);
  });

  test('one appearance with evidence in two documents stays live while either document is active (round 3, adversarial X7)', () => {
    const inBoth: AssetAppearance = {
      ...appearance('test-app-both', 'CTA-01'),
      evidence: [...appearance('test-app-both').evidence, ...fromOther('test-app-both').evidence],
    };
    const afterOne = deriveAssetRegister({
      projectId: PROJECT,
      identities: [identity('CTA-01')],
      appearances: [inBoth],
      events: [],
      documents: documentStatuses([erased], () => undefined),
    });
    expect(afterOne.countable).toEqual(['test-asset-CTA-01']);
    expect(afterOne.withoutLiveEvidence).toEqual([]);
    expect(afterOne.assets[0]).toMatchObject({ liveAppearanceIds: ['test-app-both'], evidence: 'live', statusLines: [], review: null });

    const otherGone: DocumentEvent = { ...withdrawn, documentId: 'test-doc-other' };
    const afterBoth = deriveAssetRegister({
      projectId: PROJECT,
      identities: [identity('CTA-01')],
      appearances: [inBoth],
      events: [],
      documents: documentStatuses([erased, otherGone], () => undefined),
    });
    expect(afterBoth.countable).toEqual([]);
    expect(afterBoth.assets[0]).toMatchObject({ liveAppearanceIds: [], evidence: 'source_document_removed', statusLines: ['source_document_removed'] });

    // The order of the entries never matters: the second entry alone keeps the appearance live.
    const reversed: AssetAppearance = { ...inBoth, evidence: [...inBoth.evidence].reverse() };
    expect(
      deriveAssetRegister({ projectId: PROJECT, identities: [identity('CTA-01')], appearances: [reversed], events: [], documents: documentStatuses([erased], () => undefined) })
        .countable,
    ).toEqual(['test-asset-CTA-01']);
  });

  test('an untagged appearance with a live entry is still a possible duplicate, and one with no entry is not evidence', () => {
    const inBoth: AssetAppearance = { ...appearance('test-untagged-both'), evidence: [...appearance('x').evidence, ...fromOther('x').evidence] };
    const empty: AssetAppearance = { ...appearance('test-app-empty', 'CTA-01'), evidence: [] };
    const register = deriveAssetRegister({
      projectId: PROJECT,
      identities: [identity('CTA-01')],
      appearances: [inBoth, empty],
      events: [],
      documents: documentStatuses([erased], () => undefined),
    });
    expect(register.possibleDuplicates).toEqual(['test-untagged-both']);
    expect(register.countable).toEqual([]);
    // No entry is no evidence, and no document was removed from under it: no "Source document removed" line.
    expect(register.assets[0]).toMatchObject({ appearanceIds: ['test-app-empty'], liveAppearanceIds: [], evidence: 'no_appearance', statusLines: [], review: null });
  });

  test('an identity with no appearance at all is never counted', () => {
    const register = deriveAssetRegister({ projectId: PROJECT, identities: [identity('CTA-01')], appearances: [], events: [], documents: ACTIVE_DOCUMENTS });
    expect(register.countable).toEqual([]);
    expect(register.assets[0]).toMatchObject({ evidence: 'no_appearance', statusLines: [], review: null });
  });
});

describe('life-safety treatment (rule 11; prompt 3 5.2)', () => {
  const typeState = (verification: 'unverified' | 'engineer_verified', known = true): FieldState => ({
    subjectId: 'test-asset',
    fieldKey: 'test.asset.type',
    state: known ? 'known' : 'unknown',
    activeCandidateId: known ? 'test-type' : null,
    candidates: known ? [{ candidateId: 'test-type', verification, status: 'eligible', refusal: null }] : [],
    facts: [],
    conflicts: [],
    conflict: null,
    readingsToConfirm: [],
    provisional: verification !== 'engineer_verified',
    stale: false,
    statusLines: [],
    review: null,
    notApplicable: null,
    refusedEvents: [],
  });
  const typeCandidate = {
    id: 'test-type',
    subjectId: 'test-asset',
    fieldKey: 'test.asset.type',
    choice: 'TEST-fan',
    source: 'ai_inference' as const,
    evidence: [],
    createdBy: 'test',
    createdAt: '2026-09-25T10:00:00.000Z',
  };

  test('an unknown or unverified type is possibly life-safety, whatever a taxonomy would say', () => {
    for (const flagged of [true, false, undefined]) {
      expect(lifeSafetyTreatment(typeState('unverified', false), [], () => flagged)).toBe('possibly_life_safety');
      expect(lifeSafetyTreatment(typeState('unverified'), [typeCandidate], () => flagged)).toBe('possibly_life_safety');
    }
  });

  test('only an engineer_verified type ends the treatment, and only where the taxonomy knows the type', () => {
    expect(lifeSafetyTreatment(typeState('engineer_verified'), [typeCandidate], () => false)).toBe('not_life_safety');
    expect(lifeSafetyTreatment(typeState('engineer_verified'), [typeCandidate], () => true)).toBe('life_safety');
    expect(lifeSafetyTreatment(typeState('engineer_verified'), [typeCandidate], () => undefined)).toBe('possibly_life_safety');
  });
});
