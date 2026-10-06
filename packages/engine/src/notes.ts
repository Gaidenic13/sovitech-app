/**
 * What an engine candidate's `method.assumptions` record (guardrails 2.4 `Candidate.method`: "assumptions"; rule 9:
 * every calculated or estimated value shows "what it is based on ... its method and version; its assumptions"; rule 1
 * "Ranges need a basis", "Material exclusions"; docs/adr/0047 "Built").
 *
 * The domain's `CandidateMethod` holds the formula, its version, the exact input candidate ids, the policy and a list
 * of assumptions; the dataset versions a run read, the inputs a range ran over and the items a total left out have no
 * field of their own. The engine writes each as one coded entry of `assumptions`, so a stored candidate carries its
 * whole basis and the view-model can name it in the owner's words (the field's label, the dataset's name) without
 * reading anything the engine did not record:
 * - `dataset:<id>@<version>`: a dataset version the body read;
 * - `range_over_options:<subject id>:<field key>`: an unknown enum or decision ranged over its options (G7-1, G1-7, G10-6);
 * - `range_over_values:<subject id>:<field key>`: a field in conflict or read two ways, ranged over its values (rule 4);
 * - `excludes:<subject id>:<field key>`: an input a total left out that is not `minorForTotals` (the total reads
 *   "Incomplete: excludes <item names>", G1-2);
 * - `excludes_minor:<subject id>:<field key>`: an input a total left out and counted that is `minorForTotals`;
 * - `excludes_item:<name>`: an item the body itself left out (always material);
 * - `note:<text>`: an assumption the method states in its own words.
 * Nothing here is shown as written: the view-model reads `methodNotesOf`.
 */
import type { CandidateMethod } from '@sovitech/domain';

export type MethodNote =
  | { readonly kind: 'dataset'; readonly id: string; readonly version: string }
  | { readonly kind: 'range_over_options'; readonly subjectId: string; readonly fieldKey: string }
  | { readonly kind: 'range_over_values'; readonly subjectId: string; readonly fieldKey: string }
  | { readonly kind: 'excludes'; readonly subjectId: string; readonly fieldKey: string; readonly minor: boolean }
  | { readonly kind: 'excludes_item'; readonly name: string }
  | { readonly kind: 'note'; readonly text: string };

/** `<subject id>:<field key>`; the subject may be empty (an input the run found on no subject), never the key. */
const SUBJECT_FIELD = /^([^:]*):([^:]+)$/u;
const DATASET = /^([^@]+)@(.+)$/u;

/** The coded entry of a note. */
export function encodeNote(note: MethodNote): string {
  switch (note.kind) {
    case 'dataset':
      return `dataset:${note.id}@${note.version}`;
    case 'range_over_options':
      return `range_over_options:${note.subjectId}:${note.fieldKey}`;
    case 'range_over_values':
      return `range_over_values:${note.subjectId}:${note.fieldKey}`;
    case 'excludes':
      return `${note.minor ? 'excludes_minor' : 'excludes'}:${note.subjectId}:${note.fieldKey}`;
    case 'excludes_item':
      return `excludes_item:${note.name}`;
    case 'note':
      return `note:${note.text}`;
  }
}

/** One coded entry read back, or a `note` holding the entry as written when it follows no code (never dropped). */
export function decodeNote(entry: string): MethodNote {
  const colon = entry.indexOf(':');
  const kind = colon < 0 ? '' : entry.slice(0, colon);
  const rest = colon < 0 ? entry : entry.slice(colon + 1);
  const pair = SUBJECT_FIELD.exec(rest);
  switch (kind) {
    case 'dataset': {
      const dataset = DATASET.exec(rest);
      if (dataset?.[1] !== undefined && dataset[2] !== undefined) return { kind: 'dataset', id: dataset[1], version: dataset[2] };
      break;
    }
    case 'range_over_options':
    case 'range_over_values':
      if (pair?.[1] !== undefined && pair[2] !== undefined) return { kind, subjectId: pair[1], fieldKey: pair[2] };
      break;
    case 'excludes':
    case 'excludes_minor':
      if (pair?.[1] !== undefined && pair[2] !== undefined) return { kind: 'excludes', subjectId: pair[1], fieldKey: pair[2], minor: kind === 'excludes_minor' };
      break;
    case 'excludes_item':
      if (rest !== '') return { kind: 'excludes_item', name: rest };
      break;
    case 'note':
      return { kind: 'note', text: rest };
    default:
      break;
  }
  return { kind: 'note', text: entry };
}

/** The notes of a method, in their recorded order. */
export function methodNotesOf(method: Pick<CandidateMethod, 'assumptions'>): readonly MethodNote[] {
  return method.assumptions.map(decodeNote);
}

/**
 * Whether a method's result is a total with material exclusions (rule 1: it reads "Incomplete: excludes <item names>",
 * and "no headline, payback or ROI is computed from it"): an `excludes` note that is not minor, or an `excludes_item`.
 */
export function isIncompleteTotal(method: Pick<CandidateMethod, 'assumptions'> | undefined): boolean {
  if (method === undefined) return false;
  return methodNotesOf(method).some((note) => (note.kind === 'excludes' && !note.minor) || note.kind === 'excludes_item');
}
