/**
 * An asset's parts as the Equipment inspector (UD-26) and the asset record (UD-08) show them (PRD R-065 to R-068;
 * US-ASSETS-04, US-ASSETS-06, US-ASSETS-07, US-ASSETS-11):
 *
 * - `AssetFields`: the tag as written and each of the asset's values (type, system, location, floor, zone) through the
 *   Value component with its badge, source line and excerpt on demand (rule 2; the same display as the register's
 *   cell, G2-7), labelled with the register's column names. The only owner answers drawn are
 *   the ones the API served on a value read from a document: "Looks right" (`owner_acknowledged` only: it never
 *   raises the badge or clears Provisional, G3-3) and "Something's wrong" (a note to the engineer queue, G3-10). No
 *   Edit, no "Confirm all", no verification, and nothing that commands, resets, inhibits, delays or overrides: every
 *   asset is treated as possibly life-safety (prompt 3 5.2; rule 11). One write at a time (`useFieldWrites`:
 *   `aria-busy`, never disabled); a refusal shows under the list and blocks nothing (rule 7).
 * - `AssetDocuments`: the documents that hold the asset's evidence now, each with its file name as served (G2-14), its
 *   analysis status line or coverage (set small under the file name, DR-10), its stage and its revision as recorded
 *   (US-ASSETS-11 AC1, AC2; rule 12).
 * - `fieldLabelOf`: a value's label, from the register's column names by its value id, else what the value measures.
 */
import type { ReactNode } from 'react';
import { Value, ValueName } from '@sovitech/ui';
import type { Action, AssetResponse, DisplayObject } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import type { FieldWrites } from '../../../review/field-writes';
import type { Displays } from '../../../wizard/use-step-view';
import { RegisterValue } from './register-values';

const EQ = copy.workspace.equipment;

/** The fixed labels of the owner's answers on a value (the catalogue's `actions.*`). */
export const ASSET_ACTION_LABELS = {
  edit: copy.actions.edit,
  yes: copy.actions.yes,
  looksRight: copy.actions.looksRight,
  somethingWrong: copy.actions.somethingWrong,
} as const;

const COLUMN_LABELS: Readonly<Record<string, string | undefined>> = EQ.columns;

/** A value's label: the register's column name for its path (`asset:<id>.type` → "Type"), else what it measures. */
export function fieldLabelOf(valueId: string, display: DisplayObject | undefined): string {
  const path = valueId.slice(valueId.indexOf('.') + 1).split('.')[0] ?? '';
  return COLUMN_LABELS[path] ?? display?.measure?.label ?? path;
}

/**
 * A labelled line of an inspector or a record: the label on the left, the value on the right. In a narrow column a
 * value's badge moves under its text inside the same element where the two do not fit on one line (2.8 "Prominence":
 * "on the same line or tile as its figure"; the kit's reading for register cells and the sidebar), words never split.
 * (The selectors name the value element's first child and its `<bdi>`: an arbitrary Tailwind variant reads an
 * underscore as a space, so `.sov-value__line` cannot be written in one.)
 */
export function DetailRow({ label, children }: { readonly label: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 py-2 text-[14px]">
      <dt className="text-(--sov-text-tertiary)">{label}</dt>
      <dd className="min-w-0 break-words text-(--sov-text-primary) [&_.sov-value>:first-child]:flex-wrap [&_.sov-value>:first-child]:gap-x-2 [&_.sov-value>:first-child]:gap-y-1 [&_.sov-value_bdi]:text-[15px] [&_.sov-value_bdi]:leading-6 [&_.sov-value_bdi]:break-words">
        {children}
      </dd>
    </div>
  );
}

export interface AssetFieldsProps {
  readonly fields: readonly string[];
  readonly displays: Displays;
  readonly writes: FieldWrites;
}

export function AssetFields({ fields, displays, writes }: AssetFieldsProps) {
  const onAction = (action: Action) => {
    if (action.kind === 'acknowledge') void writes.acknowledge(action.candidateIds);
    if (action.kind === 'concern') void writes.concern(action.candidateId);
  };
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col">
        {fields.map((valueId) => {
          const display = displays.get(valueId);
          if (display === undefined) return null;
          // Only the owner's answers the API served on the value are drawn; an Edit is never offered on equipment.
          const answers = (display.actions ?? []).filter((action) => action.kind === 'acknowledge' || action.kind === 'concern');
          const shown = answers.length === (display.actions ?? []).length ? display : { ...display, actions: answers };
          return (
            <DetailRow key={valueId} label={fieldLabelOf(valueId, display)}>
              <Value display={shown} layout="bare" onAction={onAction} actionLabels={ASSET_ACTION_LABELS} busy={writes.busy} evidenceLabel={copy.review.showExcerpt} />
            </DetailRow>
          );
        })}
      </dl>
      {writes.error === null ? null : (
        <p role="alert" className="text-[14px] text-(--sov-text-primary)">
          {writes.error}
        </p>
      )}
    </div>
  );
}

export function AssetDocuments({ documents, displays }: { readonly documents: AssetResponse['view']['documents']; readonly displays: Displays }) {
  if (documents.length === 0) return <p className="text-[14px] text-(--sov-text-tertiary)">{EQ.inspector.noDocuments}</p>;
  return (
    <ul aria-label={EQ.inspector.documentsList} className="flex flex-col">
      {documents.map((document) => {
        const name = displays.get(document.fileName);
        return (
          <li key={document.documentId} className="flex flex-col gap-1 border-b border-(--sov-border) py-3 last:border-b-0">
            <span className="text-[14px] font-medium break-words text-(--sov-text-primary)">{name === undefined ? null : <ValueName display={name} />}</span>
            {/* The coverage or status line sits under the 14px file name, so it is set small, as the Documents register sets it (DR-10). */}
            <RegisterValue display={displays.get(document.status)} lineSize="small" />
            <dl className="flex flex-col">
              <DetailRow label={EQ.inspector.stage}>
                <RegisterValue display={displays.get(document.stage)} />
              </DetailRow>
              <DetailRow label={EQ.inspector.version}>
                <RegisterValue display={displays.get(document.revision)} />
              </DetailRow>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
