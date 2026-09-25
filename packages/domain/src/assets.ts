/**
 * Assets and identity (docs/guardrails.md 2.5; rules 3, 4, 11; F-VALUE-08,
 * F-VALUE-13). Pure functions over stored identities, appearances and asset
 * events; nothing here stores, merges or counts on its own.
 *
 * - One tag, one asset: appearances with the same normalised tag are one asset
 *   with several pieces of evidence.
 * - A type disagreement is a conflict on the asset's type field (derive), never a
 *   second asset.
 * - Untagged appearances are never merged or counted: they are listed as possible
 *   duplicates for the engineer.
 * - Merging, splitting and removing are asset events that only an engineer
 *   account writes, with a reason; an event from any other role is refused, and
 *   the register counts only assets that are neither removed nor merged.
 * - An appearance whose documents are all withdrawn or erased is no longer
 *   evidence (2.3 "Deleting a document"; rule 13 "Erasure"); one that still cites
 *   an active document keeps that evidence. An asset left with no live appearance
 *   is not counted, and is listed as "Source document removed".
 *
 * Counts themselves are calculated by the engine from {@link AssetRegister.countable}
 * (2.5 "Every equipment count is calculated from the asset register").
 */
import type { DocumentStatuses } from './documents';
import type { FieldState, FieldStatusLine, ReviewItem } from './field-state';
import type { AssetEvent, AssetEventType, Candidate, Evidence, Role } from './model';
import { olderFirst } from './time';

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** Dash-like characters read as the hyphen-minus in a tag. */
const DASHES = /[‐-―−﹘﹣－]/g;

/**
 * The normalised form of a tag as written, or null when nothing is left (an
 * untagged appearance). Deliberately narrow, so two different tags are never
 * read as one: Unicode NFC, trimmed, upper case, dash-like characters read as
 * '-', no space around '-', '.', '/' or ':', other runs of space read as one.
 * The system prefix stays as written ('AHU-1' and '1-AHU-1' are different tags),
 * and no separator is dropped ('CTA 01' and 'CTA-01' stay different; an
 * engineer merges them if they are one asset).
 */
export function normaliseTag(tagAsWritten: string | undefined): string | null {
  if (tagAsWritten === undefined) return null;
  const normal = tagAsWritten
    .normalize('NFC')
    .replace(DASHES, '-')
    .trim()
    .replace(/\s*([-./:])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .toUpperCase();
  return normal === '' ? null : normal;
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** A stored asset identity: one per normalised tag in a project. */
export interface AssetIdentity {
  readonly assetId: string;
  readonly projectId: string;
  readonly normalisedTag: string;
}

/** One appearance of equipment in a document: a schedule row, a plan symbol, a tag on a schematic. */
export interface AssetAppearance {
  readonly id: string;
  readonly projectId: string;
  /** The tag exactly as written, when the appearance carries one. */
  readonly tagAsWritten?: string;
  /**
   * Every evidence entry of the appearance, in any document of the project (the
   * store keeps one locator per entry). The appearance is live while any entry
   * cites a document that is not removed (2.3 "Deleting a document": "A candidate
   * or asset with evidence from other active documents keeps that evidence"); an
   * appearance with no entry is not live.
   */
  readonly evidence: readonly Evidence[];
}

/** Whether an appearance still has evidence: any entry cites a document that is not removed (2.3). */
export function appearanceIsLive(appearance: Pick<AssetAppearance, 'evidence'>, documents: Pick<DocumentStatuses, 'removed'>): boolean {
  return appearance.evidence.some((entry) => !documents.removed(entry.documentId));
}

/** Where an appearance belongs. */
export type IdentityDecision =
  | { readonly kind: 'existing_asset'; readonly assetId: string }
  | { readonly kind: 'new_asset'; readonly normalisedTag: string }
  | { readonly kind: 'untagged' };

/**
 * One tag, one asset (2.5): an appearance whose normalised tag an identity of the
 * project already holds belongs to that asset; a new tag needs a new identity;
 * an untagged appearance belongs to no asset. Throws when the project holds two
 * identities for one tag, which the store must never allow.
 */
export function planAssetIdentity(
  identities: readonly AssetIdentity[],
  appearance: Pick<AssetAppearance, 'projectId' | 'tagAsWritten'>,
): IdentityDecision {
  const tag = normaliseTag(appearance.tagAsWritten);
  if (tag === null) return { kind: 'untagged' };
  const holders = identities.filter((identity) => identity.projectId === appearance.projectId && identity.normalisedTag === tag);
  if (holders.length > 1) throw new Error(`project ${appearance.projectId} holds ${String(holders.length)} assets for the tag ${tag}`);
  const [holder] = holders;
  return holder === undefined ? { kind: 'new_asset', normalisedTag: tag } : { kind: 'existing_asset', assetId: holder.assetId };
}

// ---------------------------------------------------------------------------
// Asset events
// ---------------------------------------------------------------------------

/** An asset event as proposed by a caller, before the role check: 2.5 allows only `sovitech_engineer`. */
export type ProposedAssetEvent = Omit<AssetEvent, 'role'> & { readonly role: Role | string };

/** Why an asset event is refused. */
export const ASSET_EVENT_REFUSALS = [
  /** 2.5: "Only engineer accounts write them". */
  'role_not_engineer',
  'by_missing',
  'reason_missing',
  'unknown_asset',
  'related_asset_count',
  'related_asset_unknown',
  'related_to_itself',
  'asset_not_active',
  'target_not_active',
] as const;
export type AssetEventRefusal = (typeof ASSET_EVENT_REFUSALS)[number];

/** An asset's derived status. */
export type AssetStatus = 'active' | 'merged' | 'removed';

/**
 * Whether an asset still has evidence (2.3 "Deleting a document": "A candidate or
 * asset with evidence from other active documents keeps that evidence"):
 * `live` when an appearance cites a document that is not removed;
 * `source_document_removed` when it had evidence and every entry of every
 * appearance cites a removed document;
 * `no_appearance` when no appearance with an evidence entry is stored for it at all.
 */
export type AssetEvidenceState = 'live' | 'source_document_removed' | 'no_appearance';

/** One asset of the register. */
export interface RegisteredAsset {
  readonly assetId: string;
  readonly normalisedTag: string;
  readonly status: AssetStatus;
  /** The asset it was merged into; null unless `status` is `merged`. */
  readonly mergedInto: string | null;
  /** Every appearance that is or was its evidence, by id, including those from removed documents. */
  readonly appearanceIds: readonly string[];
  /** The appearances whose document is not removed: the asset's evidence now. */
  readonly liveAppearanceIds: readonly string[];
  readonly evidence: AssetEvidenceState;
  /** The 2.8 status lines of the asset: "Source document removed" when all its evidence was withdrawn with its documents. */
  readonly statusLines: readonly FieldStatusLine[];
  /** 2.3: an asset left with no evidence is listed under "For you" as "Source document removed"; null otherwise. */
  readonly review: ReviewItem | null;
}

/** The asset register of one project, derived. Never stored. */
export interface AssetRegister {
  readonly projectId: string;
  /** Every identity, by asset id. */
  readonly assets: readonly RegisteredAsset[];
  /**
   * The assets a count includes: neither removed nor merged into another (2.5),
   * with at least one appearance whose document is not removed (2.3). The engine
   * counts these.
   */
  readonly countable: readonly string[];
  /** Active assets with no live appearance: never counted, listed with why ({@link RegisteredAsset.evidence}). */
  readonly withoutLiveEvidence: readonly string[];
  /** Untagged appearances from documents that are not removed, never merged or counted: possible duplicates for the engineer (2.5). */
  readonly possibleDuplicates: readonly string[];
  /** Tagged appearances from documents that are not removed whose tag no stored identity holds yet: listed for the engineer, never counted. */
  readonly withoutIdentity: readonly string[];
  /** Asset events that did not apply, with why. */
  readonly refusedEvents: readonly { readonly event: ProposedAssetEvent; readonly refusal: AssetEventRefusal }[];
}

const filled = (text: string): boolean => text.trim() !== '';

/** Newest last; text order where a time does not parse; type and ids last, so the order is total. */
function eventOrder(a: ProposedAssetEvent, b: ProposedAssetEvent): number {
  return (
    olderFirst(a.at, b.at) ||
    a.type.localeCompare(b.type) ||
    a.assetId.localeCompare(b.assetId) ||
    a.relatedAssetIds.join(',').localeCompare(b.relatedAssetIds.join(','))
  );
}

interface Standing {
  status: AssetStatus;
  mergedInto: string | null;
}

/**
 * Why an asset event may not apply to the register as it stands, or null when it
 * may. The write path calls this before it appends an event; the register
 * applies the same test to every stored event, so an event that got past a write
 * path changes nothing.
 */
export function assetEventRefusal(
  event: ProposedAssetEvent,
  standing: (assetId: string) => AssetStatus | undefined,
): AssetEventRefusal | null {
  if (event.role !== 'sovitech_engineer') return 'role_not_engineer';
  if (!filled(event.by)) return 'by_missing';
  if (!filled(event.reason)) return 'reason_missing';
  const own = standing(event.assetId);
  if (own === undefined) return 'unknown_asset';
  const type: AssetEventType = event.type;
  if (type === 'removed') {
    if (event.relatedAssetIds.length > 0) return 'related_asset_count';
    return own === 'removed' ? 'asset_not_active' : null;
  }
  if (event.relatedAssetIds.length !== 1) return 'related_asset_count';
  const [relatedId] = event.relatedAssetIds;
  if (relatedId === undefined) return 'related_asset_count';
  if (relatedId === event.assetId) return 'related_to_itself';
  const related = standing(relatedId);
  if (related === undefined) return 'related_asset_unknown';
  if (type === 'merged_into') {
    if (own !== 'active') return 'asset_not_active';
    return related === 'active' ? null : 'target_not_active';
  }
  // split_from: the asset stands apart from the related one again; a removed asset is not revived.
  return own === 'removed' ? 'asset_not_active' : null;
}

/**
 * Derives a project's asset register from its stored identities, appearances and
 * asset events (2.5), and the project's document statuses (2.3). Events apply
 * oldest first; each is tested by {@link assetEventRefusal} against the register
 * as it stood. An appearance none of whose evidence entries cites a document that
 * is not removed (withdrawn or erased) is no longer evidence: it is kept in
 * `appearanceIds` for the record, and an asset left without a live appearance is
 * not counted. Throws when the project holds two identities for one tag.
 */
export function deriveAssetRegister(input: {
  readonly projectId: string;
  readonly identities: readonly AssetIdentity[];
  readonly appearances: readonly AssetAppearance[];
  readonly events: readonly ProposedAssetEvent[];
  /** The project's document statuses: build them with `documentStatuses` from every document event of the project. */
  readonly documents: Pick<DocumentStatuses, 'removed'>;
}): AssetRegister {
  const identities = input.identities.filter((identity) => identity.projectId === input.projectId);
  const byTag = new Map<string, AssetIdentity>();
  for (const identity of identities) {
    if (byTag.has(identity.normalisedTag)) {
      throw new Error(`project ${input.projectId} holds two assets for the tag ${identity.normalisedTag}`);
    }
    byTag.set(identity.normalisedTag, identity);
  }

  const appearancesOf = new Map<string, string[]>();
  const liveAppearancesOf = new Map<string, string[]>();
  /** Assets with an appearance that had evidence, all of it in removed documents (2.3 "Source document removed"). */
  const evidencedOnce = new Set<string>();
  const possibleDuplicates: string[] = [];
  const withoutIdentity: string[] = [];
  for (const appearance of input.appearances) {
    if (appearance.projectId !== input.projectId) continue;
    const live = appearanceIsLive(appearance, input.documents);
    const tag = normaliseTag(appearance.tagAsWritten);
    if (tag === null) {
      if (live) possibleDuplicates.push(appearance.id);
      continue;
    }
    const identity = byTag.get(tag);
    if (identity === undefined) {
      if (live) withoutIdentity.push(appearance.id);
      continue;
    }
    const list = appearancesOf.get(identity.assetId);
    if (list === undefined) appearancesOf.set(identity.assetId, [appearance.id]);
    else list.push(appearance.id);
    if (appearance.evidence.length > 0) evidencedOnce.add(identity.assetId);
    if (!live) continue;
    const liveList = liveAppearancesOf.get(identity.assetId);
    if (liveList === undefined) liveAppearancesOf.set(identity.assetId, [appearance.id]);
    else liveList.push(appearance.id);
  }

  const standing = new Map<string, Standing>(
    identities.map((identity) => [identity.assetId, { status: 'active', mergedInto: null }]),
  );
  const refusedEvents: { event: ProposedAssetEvent; refusal: AssetEventRefusal }[] = [];
  for (const event of [...input.events].sort(eventOrder)) {
    const refusal = assetEventRefusal(event, (assetId) => standing.get(assetId)?.status);
    if (refusal !== null) {
      refusedEvents.push({ event, refusal });
      continue;
    }
    const target = event.relatedAssetIds[0];
    if (event.type === 'removed') standing.set(event.assetId, { status: 'removed', mergedInto: null });
    else if (event.type === 'merged_into' && target !== undefined) standing.set(event.assetId, { status: 'merged', mergedInto: target });
    else standing.set(event.assetId, { status: 'active', mergedInto: null });
  }

  const assets = [...identities]
    .sort((a, b) => a.assetId.localeCompare(b.assetId))
    .map((identity): RegisteredAsset => {
      const current = standing.get(identity.assetId) ?? { status: 'active', mergedInto: null };
      const appearanceIds = [...(appearancesOf.get(identity.assetId) ?? [])].sort();
      const liveAppearanceIds = [...(liveAppearancesOf.get(identity.assetId) ?? [])].sort();
      const evidence: AssetEvidenceState =
        liveAppearanceIds.length > 0 ? 'live' : evidencedOnce.has(identity.assetId) ? 'source_document_removed' : 'no_appearance';
      const removedSource = evidence === 'source_document_removed' && current.status === 'active';
      return {
        assetId: identity.assetId,
        normalisedTag: identity.normalisedTag,
        status: current.status,
        mergedInto: current.mergedInto,
        appearanceIds,
        liveAppearanceIds,
        evidence,
        statusLines: removedSource ? ['source_document_removed'] : [],
        review: removedSource ? { list: 'for_you', reason: 'source_document_removed' } : null,
      };
    });

  return {
    projectId: input.projectId,
    assets,
    countable: assets.filter((asset) => asset.status === 'active' && asset.evidence === 'live').map((asset) => asset.assetId),
    withoutLiveEvidence: assets.filter((asset) => asset.status === 'active' && asset.evidence !== 'live').map((asset) => asset.assetId),
    possibleDuplicates: possibleDuplicates.sort(),
    withoutIdentity: withoutIdentity.sort(),
    refusedEvents,
  };
}

// ---------------------------------------------------------------------------
// Life safety (rule 11)
// ---------------------------------------------------------------------------

/** How an asset is treated under rule 11. */
export type LifeSafetyTreatment = 'life_safety' | 'possibly_life_safety' | 'not_life_safety';

/**
 * Rule 11 and prompt 3 5.2 (`lifeSafety` while an asset's type is Unknown or
 * unverified): an asset is treated as possibly life-safety for every purpose
 * an engineer_verified event on its type ends that treatment. Only then does the approved asset
 * taxonomy decide; a type the taxonomy does not know, or no approved taxonomy
 * (the `dataset-asset-taxonomy` gate), keeps the possibly-life-safety
 * treatment. `Asset.lifeSafety` is true unless the treatment is `not_life_safety`.
 */
export function lifeSafetyTreatment(
  typeState: FieldState,
  typeCandidates: readonly Candidate[],
  isLifeSafetyType: (typeKey: string) => boolean | undefined,
): LifeSafetyTreatment {
  if (typeState.state !== 'known' || typeState.activeCandidateId === null) return 'possibly_life_safety';
  const derived = typeState.candidates.find((candidate) => candidate.candidateId === typeState.activeCandidateId);
  if (derived?.verification !== 'engineer_verified') return 'possibly_life_safety';
  const active = typeCandidates.find((candidate) => candidate.id === typeState.activeCandidateId);
  if (active?.choice === undefined) return 'possibly_life_safety';
  const flagged = isLifeSafetyType(active.choice);
  if (flagged === undefined) return 'possibly_life_safety';
  return flagged ? 'life_safety' : 'not_life_safety';
}
