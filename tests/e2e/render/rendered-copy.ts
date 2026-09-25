/**
 * The reserved-term scan of rendered pages (guardrails 2.8 "Reserved terms"; prompt 3
 * section 7, "It checks UI strings, templates, seeds, AI output, exports and rendered
 * pages"; docs/adr/0006-render-test.md, decision 8).
 *
 * The in-page harness hands back every unit of shown copy: the text of each block of the page
 * (inline content joined, so a term split across inline elements is still one phrase), each
 * marked element's whole text, each shown attribute (aria-label, title, placeholder, alt, the
 * value of button inputs and the rest of the scanned attributes) and each `::before` and
 * `::after` content. Each unit is matched with the one reserved-term matcher
 * (`@sovitech/registry/reserved-terms`).
 *
 * The places 2.8 allows are honoured only through the markers the app sets:
 * - `data-copy-kind="badge" | "status-line" | "action-label" | "registry-qualifier" |
 *   "generated-sentence"`: the unit passes only when a registered allowance of that same kind
 *   covers the whole unit (packages/registry, REGISTERED_ALLOWANCE_ENTRIES; none at phase 0);
 * - `data-copy-kind="evidence-excerpt"` with `data-document-id` and `data-content-hash`: the
 *   unit passes only when the display objects the screen was served declare that excerpt, with
 *   that document id and content hash; it is then verbatim document text.
 * Unmarked copy, a marker naming no place of 2.8, and a marker whose condition fails are
 * matched as plain copy.
 */
import {
  NO_ALLOWANCES,
  createAllowanceSet,
  registeredAllowances,
  scanCopy,
  type AllowanceSet,
  type ReservedTermAllowanceKind,
  type ReservedTermMatch,
} from '@sovitech/registry/reserved-terms';
import { COPY_KINDS, type CopyKind, type CopyUnit, type ServedDisplay } from './contract';
import { normaliseShown } from './display-objects';

/** The allowance kind each marker stands for; `evidence-excerpt` has none (it is verbatim document text). */
const ALLOWANCE_KIND: Readonly<Record<Exclude<CopyKind, 'evidence-excerpt'>, ReservedTermAllowanceKind>> = {
  badge: 'badge',
  'status-line': 'status_line',
  'action-label': 'action_label',
  'registry-qualifier': 'qualifier_label',
  'generated-sentence': 'generated_sentence',
};

/** One unit holding a reserved term where 2.8 does not allow it. */
export interface CopyFinding {
  unit: CopyUnit;
  terms: string[];
  detail: string;
}

function isCopyKind(value: string): value is CopyKind {
  return (COPY_KINDS as readonly string[]).includes(value);
}

/** Registered allowances of one kind only, so a marker cannot borrow another kind's entry. */
export function allowancesOfKind(all: AllowanceSet, kind: ReservedTermAllowanceKind): AllowanceSet {
  return createAllowanceSet(all.entries.filter((entry) => entry.kind === kind));
}

function servedExcerpt(displayObjects: Readonly<Record<string, ServedDisplay>>, unit: CopyUnit): boolean {
  const text = normaliseShown(unit.text);
  return Object.values(displayObjects).some((display) =>
    (display.evidence ?? []).some(
      (evidence) =>
        evidence.documentId === unit.documentId &&
        evidence.contentHash === unit.contentHash &&
        normaliseShown(evidence.excerpt) === text,
    ),
  );
}

function describeTerms(matches: readonly ReservedTermMatch[]): string[] {
  return [...new Set(matches.map((match) => match.text))];
}

/**
 * The units that hold a reserved term where 2.8 does not allow it. `allowances` defaults to
 * the registered ones; a test may pass its own to prove the marker path.
 */
export function reservedTermFindings(
  units: readonly CopyUnit[],
  displayObjects: Readonly<Record<string, ServedDisplay>>,
  allowances: AllowanceSet = registeredAllowances(),
): CopyFinding[] {
  const byKind = new Map<ReservedTermAllowanceKind, AllowanceSet>();
  const kindSet = (kind: ReservedTermAllowanceKind): AllowanceSet => {
    let set = byKind.get(kind);
    if (set === undefined) {
      set = allowancesOfKind(allowances, kind);
      byKind.set(kind, set);
    }
    return set;
  };
  const findings: CopyFinding[] = [];
  for (const unit of units) {
    const marker = unit.copyKind;
    let matches: ReservedTermMatch[];
    let why: string;
    if (marker === null) {
      matches = scanCopy(unit.text, { allowances: NO_ALLOWANCES });
      why = 'unmarked copy; 2.8 allows a reserved term only in a badge, a status line, an action label, a generated sentence, a registry qualifier label or verbatim document text, each marked with data-copy-kind';
    } else if (!isCopyKind(marker)) {
      matches = scanCopy(unit.text, { allowances: NO_ALLOWANCES });
      why = `data-copy-kind="${marker}" names no place 2.8 allows (${COPY_KINDS.join(', ')})`;
    } else if (marker === 'evidence-excerpt') {
      if (unit.documentId !== null && unit.documentId.trim() !== '' && unit.contentHash !== null && unit.contentHash.trim() !== '' && servedExcerpt(displayObjects, unit)) {
        matches = scanCopy(unit.text, {
          allowances: NO_ALLOWANCES,
          context: { kind: 'verbatim_document_text', documentId: unit.documentId, contentHash: unit.contentHash },
        });
        why = '';
      } else {
        matches = scanCopy(unit.text, { allowances: NO_ALLOWANCES });
        why =
          unit.documentId === null || unit.contentHash === null
            ? 'marked as an evidence excerpt without data-document-id and data-content-hash'
            : `marked as an evidence excerpt of ${unit.documentId} (${unit.contentHash}), but no display object the screen was served declares this excerpt`;
      }
    } else {
      const kind = ALLOWANCE_KIND[marker];
      matches = scanCopy(unit.text, { allowances: kindSet(kind) });
      why = `marked data-copy-kind="${marker}", but no registered ${kind} allowance covers this whole text`;
    }
    if (matches.length > 0) findings.push({ unit, terms: describeTerms(matches), detail: why });
  }
  return findings;
}
