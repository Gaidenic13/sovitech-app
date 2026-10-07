import { Cuboid } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { Button } from './Button';
import { Icon, type IconComponent } from './Icon';
import { NotAvailableYet } from './NotAvailableYet';
import { SelectionList } from './SelectionList';
import { StatusLine } from './StatusLine';
import { Value } from './Value';
import { ValueName } from './ValueName';

/** What a model area says instead of a model: a served line with no number, or a served display object (bound). */
export type ModelAreaStatus = { readonly line: Line; readonly display?: never } | { readonly display: DisplayObject; readonly line?: never };

/**
 * The area's states (UD-46; US-MODEL-04, US-MODEL-05; docs/build-log.md, the viewer step, items 2 and 4):
 * - `no_model`: no IFC model is stored: "Not available yet" naming the missing model, with the action to add one;
 * - `model_stored`: a model is stored and shown by its 2.8 line ("Not analysed: IFC model stored, not analysed";
 *   G12-1, G12-5), never drawn: the area of a page with no view, and of a view whose file could not be loaded;
 * - `preparing`: the model's conversion for viewing is still running: "Not available yet: <file>, still being
 *   prepared" (US-MODEL-05 AC4), and no partial model;
 * - `failed`: the conversion failed or produced no shape: "Not available yet: <file>, could not be converted", with
 *   the action to upload another export;
 * - `no_graphics`: the browser offers no hardware graphics (the viewer's probe, or a lost context): "Not available
 *   yet" naming what is missing, with no action (no action in the app supplies graphics hardware);
 * - `viewable`: the model's view, in the slot `view` fills, beside the model's document line.
 */
export type ModelAreaState = 'no_model' | 'model_stored' | 'preparing' | 'failed' | 'no_graphics' | 'viewable';

/** Why a view could not be drawn: no hardware graphics (the probe, a lost context), or its file did not load. */
export type ModelViewUnavailable = 'graphics' | 'load';

/**
 * The model's document line: the same display objects Documents serves for it (G2-7): the file name as uploaded
 * (served without bidirectional or format controls, G2-14), its stage and revision as recorded (Unknown while never
 * recorded, 2.3, 2.8), and its 2.8 status line. The labels are catalogue copy.
 */
export interface ModelAreaDocument {
  readonly name: DisplayObject;
  readonly stage: DisplayObject;
  readonly revision: DisplayObject;
  readonly status: DisplayObject;
  readonly labels: { readonly stage: string; readonly revision: string };
}

/**
 * Several current models (prompt 3 5.2 "Several models": one shown at a time, its source named): listed by their
 * bound file names in the order given (Documents' order), the first shown by default. Choosing changes the view
 * only: it writes nothing (the caller keeps the choice in the page's state). A model's category reads Unknown while
 * nothing is read from it (G1-26), so the list never groups by discipline.
 */
export interface ModelAreaChooser {
  /** The list's name (catalogue copy). */
  readonly label: string;
  readonly models: readonly { readonly id: string; readonly name: DisplayObject }[];
  readonly selected: string;
  readonly onChoose: (id: string) => void;
}

/** What the area gives the view it holds: the id of the element naming the model, and a way to say it cannot draw. */
export interface ModelAreaViewSlot {
  /** The id of the document line's file name, for the view's `aria-labelledby` (never an `aria-label` holding the name). */
  readonly labelledBy: string;
  readonly onUnavailable: (reason: ModelViewUnavailable) => void;
}

export interface ModelAreaView {
  /** Draws the view (the app passes `@sovitech/viewer`'s ModelViewer); the kit draws no model of its own. */
  readonly render: (slot: ModelAreaViewSlot) => ReactNode;
  /** What the area reads when the view finds no hardware graphics: "Not available yet" naming what is missing, as served. */
  readonly noGraphics: ModelAreaStatus;
}

export interface ModelAreaProps {
  /** The area's heading (catalogue copy: "Building model"). */
  readonly heading: string;
  readonly state: ModelAreaState;
  /** What the area says: required in every state but `viewable` (rule 7: never an empty area). */
  readonly status?: ModelAreaStatus;
  /** The owner's action ("Upload a model"), opening a built page (PRD R-012 "Until decided"). */
  readonly action?: { readonly label: string; readonly onPress: () => void; readonly icon?: IconComponent };
  /** `page`: a page's main area (step 3's centre); `panel`: a smaller slot beside a list. */
  readonly size?: 'page' | 'panel';
  /** The model the area names: required with `viewable`, and shown in the other states of a stored model when given. */
  readonly document?: ModelAreaDocument;
  /** Two or more current models. */
  readonly chooser?: ModelAreaChooser;
  /** The view, with `viewable` only. */
  readonly view?: ModelAreaView;
}

/** "Not available yet" alone, with nothing named after it (rule 7: "'Not available yet' never appears alone"). */
const BARE_NOT_AVAILABLE = /^\s*not available yet[.:]?\s*$/iu;

function refuseBare(status: ModelAreaStatus | undefined, state: ModelAreaState): void {
  if (status === undefined) {
    if (state !== 'viewable') throw new Error(`ModelArea: the "${state}" area says nothing; every state but a view names what it shows (rule 7: never an empty area).`);
    return;
  }
  const text = status.line !== undefined ? status.line.text : status.display.text;
  const id = status.line !== undefined ? status.line.id : status.display.valueId;
  const names = status.display !== undefined && (status.display.lines ?? []).some((line) => !BARE_NOT_AVAILABLE.test(line.text));
  if (BARE_NOT_AVAILABLE.test(text) && !names) throw new Error(`ModelArea: "${id}" says "Not available yet" and names nothing (rule 7).`);
}

function StatusOf({ status }: { readonly status: ModelAreaStatus }) {
  if (status.line !== undefined) return <StatusLine line={status.line} />;
  const display = status.display;
  return display.missing === 'not_available_yet' || display.badge?.id === 'not_available_yet' ? <NotAvailableYet display={display} /> : <StatusLine display={display} />;
}

/** The model's document line (G2-7, G2-14): its name in its own element, which names the view too. */
function DocumentLine({ document, nameId }: { readonly document: ModelAreaDocument; readonly nameId: string }) {
  return (
    <div className="sov-model-area__document">
      <p id={nameId} className="sov-model-area__name">
        <ValueName display={document.name} />
      </p>
      <dl className="sov-model-area__facts">
        <div className="sov-model-area__fact">
          <dt>{document.labels.stage}</dt>
          <dd>
            <Value display={document.stage} layout="bare" />
          </dd>
        </div>
        <div className="sov-model-area__fact">
          <dt>{document.labels.revision}</dt>
          <dd>
            <Value display={document.revision} layout="bare" />
          </dd>
        </div>
      </dl>
      <StatusLine display={document.status} />
    </div>
  );
}

function Chooser({ chooser }: { readonly chooser: ModelAreaChooser }) {
  if (chooser.models.length < 2) return null;
  return (
    <div className="sov-model-area__chooser">
      <SelectionList
        label={chooser.label}
        options={chooser.models.map((model) => ({ id: model.id, content: <ValueName display={model.name} /> }))}
        selected={chooser.selected}
        onSelect={chooser.onChoose}
      />
    </div>
  );
}

/**
 * A model area (UD-46; PRD R-078, R-054's canvas, R-080, R-162; US-MODEL-04, US-MODEL-05; the owner's answers of
 * 2026-10-02 and 2026-10-05, D-03 "1 b"; prompt 3 5.2 "No IFC uploaded" and "Several models"; the `view-provenance`
 * gate's closed behaviour: "The view names its model with its stage and revision as recorded", "no illustrative
 * model").
 *
 * Without a view it draws no model, plan, outline, grid, silhouette or picture of a building: a hairline-bordered
 * area with a 32px decorative icon (the largest the render test reads as an icon), the heading, what is missing or
 * the stored model's line, and the action. No canvas, image or drawing larger than an icon (the render test refuses
 * one), no pin, scale bar, north arrow, storey name or count (prompt 3 section 8; `ifc-values`). The state never
 * rests on the icon: the words say it.
 *
 * With a view (`viewable`), the kit still draws nothing of the model: the slot holds the viewer the app passes, the
 * model's document line names it (stage, revision, status), and when the view says it cannot draw, the area changes
 * in place: no hardware graphics shows the served "Not available yet" line, a file that did not load shows the
 * stored model's 2.8 line in its document line (the `model_stored` state). Neither opens a dialog, moves the focus or
 * holds any other control of the page (rule 7; G7-22, G7-23; US-MODEL-05 AC5, AC6). Nothing here is ever disabled.
 */
export function ModelArea({ heading, state, status, action, size = 'page', document, chooser, view }: ModelAreaProps) {
  const headingId = useId();
  // One id per area: the document line's name takes the heading's, suffixed, so the areas of a page keep their ids.
  const nameId = `${headingId}-name`;
  // Why the view of the model now named could not draw; a model chosen later starts again.
  const [unavailable, setUnavailable] = useState<{ readonly model: string; readonly reason: ModelViewUnavailable } | null>(null);
  if (state === 'viewable' && (view === undefined || document === undefined)) {
    throw new Error('ModelArea: a "viewable" area needs its view and the document line that names its model (R-162; view-provenance).');
  }
  refuseBare(status, state);
  if (view !== undefined) refuseBare(view.noGraphics, 'no_graphics');

  const model = document?.name.valueId ?? '';
  const reason = unavailable !== null && unavailable.model === model ? unavailable.reason : null;
  const shown: ModelAreaState = state !== 'viewable' || reason === null ? state : reason === 'graphics' ? 'no_graphics' : 'model_stored';
  const shownStatus = shown === 'no_graphics' && state === 'viewable' ? view?.noGraphics : status;
  const chooserElement = chooser === undefined ? null : <Chooser chooser={chooser} />;
  const documentLine = document === undefined ? null : <DocumentLine document={document} nameId={nameId} />;

  if (shown === 'viewable' && view !== undefined) {
    return (
      <section className="sov-model-area" data-model-state={shown} data-size={size} data-layout="view" aria-labelledby={headingId}>
        <h2 id={headingId} className="sov-heading-group">
          {heading}
        </h2>
        {chooserElement}
        {documentLine}
        <div className="sov-model-area__view">{view.render({ labelledBy: nameId, onUnavailable: (why) => setUnavailable({ model, reason: why }) })}</div>
      </section>
    );
  }

  return (
    <section className="sov-model-area" data-model-state={shown} data-size={size} aria-labelledby={headingId}>
      <span className="sov-model-area__icon">
        <Icon icon={Cuboid} size="large" />
      </span>
      <h2 id={headingId} className="sov-heading-group">
        {heading}
      </h2>
      {chooserElement}
      {documentLine}
      {shownStatus === undefined ? null : (
        <div className="sov-model-area__status">
          <StatusOf status={shownStatus} />
        </div>
      )}
      {action === undefined ? null : (
        <Button variant="accent" {...(action.icon === undefined ? {} : { icon: action.icon })} onClick={action.onPress}>
          {action.label}
        </Button>
      )}
    </section>
  );
}
