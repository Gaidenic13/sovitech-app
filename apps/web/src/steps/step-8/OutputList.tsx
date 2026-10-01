/**
 * Which outputs the proposal will carry as ranges and which read "Not available yet", naming what each
 * still needs (guardrails rule 7, "'Not available yet' never appears alone"; section 5, step 8;
 * US-INTAKE-16 AC2, AC3; F-PROPOSAL-07; steps.ts `OutputAvailability`). Shared by step 8 and phase 3's
 * proposal page.
 *
 * - **An investment figure is named by its stage** (rule 10; 2.8 "Status lines and stage labels":
 *   "Indicative range", "Preliminary investment estimate" … "They are also the only ones used";
 *   US-INTAKE-16 AC2; section 5, step 8): where the API serves the output's `label`, the output is
 *   named by that served stage label, bound, and never by a catalogue paraphrase of it. Every other
 *   output is named by fixed copy from the catalogue (`outputs.<output id>`).
 * - Its line is the served display object, bound to its value id, through the kit's NotAvailableYet:
 *   the missing SOVITECH dataset by name with no owner action (prompt 3 5.3; PRD D-14 interim), and a
 *   missing owner input with its served "Add <field>" action, which opens step 8's inline ask for that
 *   field (PRD R-012 "Until decided"). An output that will be a range shows its served value through
 *   the Value component.
 */
import { NotAvailableYet, StatusLine, Value } from '@sovitech/ui';
import type { OutputAvailability } from '@sovitech/view-model/browser';
import type { ReactNode } from 'react';
import { copy } from '../../copy';
import type { Displays } from '../../wizard/use-step-view';

const OUTPUT_COPY: Readonly<Record<string, string | undefined>> = copy.outputs;

/** The owner-facing name of an output that has no served label, from the catalogue. */
export function outputName(output: string): string {
  return OUTPUT_COPY[output] ?? copy.review.outputUnnamed;
}

/** The output's name: its served stage label, bound to its value id, or the catalogue's name. */
function OutputName({ entry, displays }: { readonly entry: OutputAvailability; readonly displays: Displays }): ReactNode {
  const label = entry.label === undefined ? undefined : displays.get(entry.label);
  return label === undefined ? <p>{outputName(entry.output)}</p> : <StatusLine display={label} />;
}

export interface OutputListProps {
  readonly outputs: readonly OutputAvailability[];
  readonly displays: Displays;
  /** Called with the field an output's "Add <field>" names; without it no Add action shows. */
  readonly onAdd?: (fieldKey: string) => void;
}

export function OutputList({ outputs, displays, onAdd }: OutputListProps) {
  return (
    <ul className="flex list-none flex-col">
      {outputs.map((entry) => {
        const display = displays.get(entry.line);
        return (
          <li key={entry.output} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-6 border-t border-(--sov-border) py-4">
            <div
              className="text-[15px] leading-6 text-(--sov-text-primary) [&_.sov-status-line]:text-[15px] [&_.sov-status-line]:leading-6 [&_.sov-status-line]:text-(--sov-text-primary)"
              data-output={entry.output}
            >
              <OutputName entry={entry} displays={displays} />
            </div>
            {display === undefined ? null : display.missing === 'not_available_yet' || display.badge?.id === 'not_available_yet' ? (
              <NotAvailableYet display={display} {...(onAdd === undefined ? {} : { onAdd: (action) => onAdd(action.field.fieldKey) })} />
            ) : (
              <Value display={display} label={null} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
