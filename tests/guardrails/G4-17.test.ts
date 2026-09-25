/**
 * G4-17 (docs/guardrails.md section 7; 2.5 "Untagged appearances are never merged or counted automatically").
 * Situation: nine untagged fan symbols on a plan and nine tagged fans in the schedule.
 * Expected: nine assets from the schedule. The plan symbols are listed as possible duplicates. The count is 9.
 *
 * Appearances are placed the way ingestion places them (planAssetIdentity): a
 * tagged one joins or creates the asset of its tag, an untagged one creates
 * nothing. The count is calculated by the engine from the register's countable
 * assets (2.5); this case checks what it counts.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { deriveAssetRegister, planAssetIdentity, type AssetAppearance, type AssetIdentity } from '@sovitech/domain';
import { testDocument, testDocumentStatuses } from './_support/builders';

const PROJECT = 'test-project-g4-17';

const plan = testDocument('test-doc-g4-17-plan', PROJECT, 'technical_design', { kind: 'mep' });
const schedule = testDocument('test-doc-g4-17-schedule', PROJECT, 'technical_design', { kind: 'mep' });

function scheduleRows(count: number): AssetAppearance[] {
  return Array.from({ length: count }, (_, index) => {
    const tag = `V-${String(index + 1).padStart(2, '0')}`;
    return {
      id: `test-appearance-g4-17-row-${String(index)}`,
      projectId: PROJECT,
      tagAsWritten: tag,
      evidence: [{ documentId: schedule.id, contentHash: schedule.contentHash, locator: { page: 1 }, excerpt: tag, check: 'text_match' }],
    };
  });
}

function planSymbols(count: number): AssetAppearance[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `test-appearance-g4-17-symbol-${String(index)}`,
    projectId: PROJECT,
    evidence: [
      {
        documentId: plan.id,
        contentHash: plan.contentHash,
        locator: { page: 1, bbox: [index, index, index + 1, index + 1] as const },
        excerpt: 'TEST fan symbol',
        check: 'region_rendered',
      },
    ],
  }));
}

function expectScheduleAssetsSymbolsListed(tagged: number, untagged: number, symbolsFirst: boolean): void {
  const rows = scheduleRows(tagged);
  const symbols = planSymbols(untagged);
  const arriving = symbolsFirst ? [...symbols, ...rows] : [...rows, ...symbols];
  const identities: AssetIdentity[] = [];
  for (const appearance of arriving) {
    const decision = planAssetIdentity(identities, appearance);
    if (decision.kind === 'new_asset') {
      identities.push({ assetId: `test-asset-g4-17-${decision.normalisedTag}`, projectId: PROJECT, normalisedTag: decision.normalisedTag });
    }
  }
  const register = deriveAssetRegister({ projectId: PROJECT, identities, appearances: arriving, events: [], documents: testDocumentStatuses() });

  // The assets come from the schedule, one per tagged row.
  expect(register.assets).toHaveLength(tagged);
  expect(register.assets.flatMap((asset) => asset.appearanceIds).sort()).toEqual(rows.map((row) => row.id).sort());
  // The plan symbols are listed as possible duplicates, never merged.
  expect(register.possibleDuplicates).toEqual(symbols.map((symbol) => symbol.id).sort());
  // The count includes only the schedule's assets.
  expect(register.countable).toHaveLength(tagged);
}

test('F-VALUE-08 · G4-17: nine untagged fan symbols and nine tagged fans: nine assets from the schedule, symbols as possible duplicates, count 9', () => {
  expectScheduleAssetsSymbolsListed(9, 9, true);

  // Property: any number of tagged rows and untagged symbols, in either arrival order.
  fc.assert(
    fc.property(fc.nat({ max: 30 }), fc.nat({ max: 30 }), fc.boolean(), (tagged, untagged, symbolsFirst) => {
      expectScheduleAssetsSymbolsListed(tagged, untagged, symbolsFirst);
    }),
  );
});
