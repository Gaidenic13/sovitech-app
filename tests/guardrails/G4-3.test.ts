/**
 * G4-3 (docs/guardrails.md section 7; 2.5 "Identity"; rule 4 "Same-tag appearances are one asset").
 * Situation: CTA-01 to 06 on M-201, M-501 and M-001.
 * Expected: six assets with three pieces of evidence each. The count is 6.
 *
 * Each appearance is placed the way ingestion places it (planAssetIdentity: an
 * existing asset for a tag already held, a new identity for a new tag), in any
 * arrival order, and the register is derived from the stored identities and
 * appearances. The count is calculated by the engine from the register's
 * countable assets (2.5); this case checks what it counts.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import {
  deriveAssetRegister,
  planAssetIdentity,
  type AssetAppearance,
  type AssetIdentity,
  type DocumentRecord,
} from '@sovitech/domain';
import { testDocument, testDocumentStatuses } from './_support/builders';

const PROJECT = 'test-project-g4-3';

const sheets: readonly DocumentRecord[] = [
  testDocument('test-doc-g4-3-m-201', PROJECT, 'technical_design', { kind: 'mep' }),
  testDocument('test-doc-g4-3-m-501', PROJECT, 'technical_design', { kind: 'mep' }),
  testDocument('test-doc-g4-3-m-001', PROJECT, 'technical_design', { kind: 'mep' }),
];

const tagOf = (index: number): string => `CTA-${String(index + 1).padStart(2, '0')}`;

function appearances(tags: number, documents: readonly DocumentRecord[]): AssetAppearance[] {
  return documents.flatMap((document) =>
    Array.from({ length: tags }, (_, index): AssetAppearance => ({
      id: `test-appearance-g4-3-${document.id}-${String(index)}`,
      projectId: PROJECT,
      tagAsWritten: tagOf(index),
      evidence: [
        {
          documentId: document.id,
          contentHash: document.contentHash,
          locator: { page: 1 },
          excerpt: tagOf(index),
          check: 'text_match',
        },
      ],
    })),
  );
}

/** Ingestion: each appearance, in arrival order, joins the asset its tag names, or a new identity is stored. */
function ingest(arriving: readonly AssetAppearance[]): AssetIdentity[] {
  const identities: AssetIdentity[] = [];
  for (const appearance of arriving) {
    const decision = planAssetIdentity(identities, appearance);
    if (decision.kind === 'new_asset') {
      identities.push({ assetId: `test-asset-g4-3-${decision.normalisedTag}`, projectId: PROJECT, normalisedTag: decision.normalisedTag });
    }
  }
  return identities;
}

function expectOneAssetPerTag(tags: number, documents: readonly DocumentRecord[], arriving: readonly AssetAppearance[]): void {
  const register = deriveAssetRegister({ projectId: PROJECT, identities: ingest(arriving), appearances: arriving, events: [], documents: testDocumentStatuses() });

  // One asset per tag, each with one piece of evidence per document.
  expect(register.assets).toHaveLength(tags);
  for (const asset of register.assets) expect(asset.appearanceIds).toHaveLength(documents.length);
  // The count includes each of them once.
  expect(register.countable).toHaveLength(tags);
  expect(register.possibleDuplicates).toEqual([]);
  expect(register.withoutIdentity).toEqual([]);
}

test('F-VALUE-08 · G4-3: CTA-01 to 06 on M-201, M-501 and M-001: six assets, three pieces of evidence each, count 6', () => {
  const all = appearances(6, sheets);
  expectOneAssetPerTag(6, sheets, all);

  // Property: any number of tags on any number of the sheets, in any arrival order.
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: sheets.length }),
      fc.infiniteStream(fc.nat()),
      (tags, sheetCount, shuffle) => {
        const documents = sheets.slice(0, sheetCount);
        const arriving = appearances(tags, documents)
          .map((appearance) => ({ appearance, key: shuffle.next().value }))
          .sort((a, b) => a.key - b.key)
          .map((entry) => entry.appearance);
        expectOneAssetPerTag(tags, documents, arriving);
      },
    ),
  );
});
