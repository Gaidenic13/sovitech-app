import { Cuboid } from 'lucide-react';
import { useId } from 'react';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { Button } from './Button';
import { Icon, type IconComponent } from './Icon';
import { NotAvailableYet } from './NotAvailableYet';
import { StatusLine } from './StatusLine';

/** What a model area says instead of a model: a served line with no number, or a served display object (bound). */
export type ModelAreaStatus = { readonly line: Line; readonly display?: never } | { readonly display: DisplayObject; readonly line?: never };

export interface ModelAreaProps {
  /** The area's heading (catalogue copy: "Building model"). */
  readonly heading: string;
  /**
   * - `no_model`: no IFC model is stored: "Not available yet" naming the missing model (prompt 3 5.2
   *   "No IFC uploaded"), with the action to add one;
   * - `model_stored`: a model is stored and, while `ifc-values` is closed and no viewer is built, shown by
   *   its 2.8 line ("Not analysed: IFC model stored, not analysed"; G12-1, G12-5), never drawn.
   */
  readonly state: 'no_model' | 'model_stored';
  readonly status: ModelAreaStatus;
  /** The owner's action ("Upload a document"), opening a built page (PRD R-012 "Until decided"). */
  readonly action?: { readonly label: string; readonly onPress: () => void; readonly icon?: IconComponent };
  /** `page`: a page's main area (step 3's centre); `panel`: a smaller slot beside a list. */
  readonly size?: 'page' | 'panel';
}

/** "Not available yet" alone, with nothing named after it (rule 7: "'Not available yet' never appears alone"). */
const BARE_NOT_AVAILABLE = /^\s*not available yet[.:]?\s*$/iu;

/**
 * The empty and "Not available yet" states of a model area (phase 4; the owner's answer of 2026-10-02,
 * "Trial now, decide later": no viewer is wired into the live app, and "every page that draws a model area
 * renders without it, showing 'Not available yet' naming what is missing, never an illustrative, generic
 * or mockup model"; PRD R-078 and R-080; US-MODEL-05 AC2; prompt 3 5.2 "No IFC uploaded"; the
 * `view-provenance` gate's closed behaviour: "no illustrative model").
 *
 * It draws no model, plan, outline, grid, silhouette or picture of a building: a hairline-bordered area
 * with a 32px decorative icon (the largest the render test reads as an icon), the heading, what is missing
 * or the stored model's line, and the action. No canvas, image or drawing larger than an icon (the render
 * test refuses one), no pin, scale bar, north arrow, storey name or count (section 8; `ifc-values`). The
 * state never rests on the icon: the words say it.
 */
export function ModelArea({ heading, state, status, action, size = 'page' }: ModelAreaProps) {
  const headingId = useId();
  if (status.line !== undefined && BARE_NOT_AVAILABLE.test(status.line.text)) {
    throw new Error(`ModelArea: "${status.line.id}" says "Not available yet" and names nothing (rule 7).`);
  }
  return (
    <section className="sov-model-area" data-model-state={state} data-size={size} aria-labelledby={headingId}>
      <span className="sov-model-area__icon">
        <Icon icon={Cuboid} size="large" />
      </span>
      <h2 id={headingId} className="sov-heading-group">
        {heading}
      </h2>
      <div className="sov-model-area__status">
        {status.line !== undefined ? (
          <StatusLine line={status.line} />
        ) : status.display.missing === 'not_available_yet' || status.display.badge?.id === 'not_available_yet' ? (
          <NotAvailableYet display={status.display} />
        ) : (
          <StatusLine display={status.display} />
        )}
      </div>
      {action === undefined ? null : (
        <Button variant="accent" {...(action.icon === undefined ? {} : { icon: action.icon })} onClick={action.onPress}>
          {action.label}
        </Button>
      )}
    </section>
  );
}
