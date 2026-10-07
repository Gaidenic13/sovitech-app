/**
 * The harness page's script (tests/proposed/model-view/harness.ts). Two pages, chosen by `?page=`:
 * - `view`: the viewer alone, named by a heading of fixed copy, serving no value: the page the render test reads
 *   for P-V-CANVAS-UNREADABLE (it holds no value element, so the check is served no display object);
 * - `area`: the kit's model area holding the viewer beside the model's document line, a Continue button after it:
 *   the page of the keyboard, selection, request and fallback proofs.
 * `?model=missing` points the view at a route the server does not have (a view file that fails to load).
 *
 * The copy is the viewer step's draft copy (docs/build-log.md, the viewer step, items 4 and 5; for the owner's OK in
 * part 2): no digit and no reserved term. Every value is TEST data. `window.__sovitechModelView` records what the
 * view told its area and, once ready, hands its audits to the test; the page renders nothing from it.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ModelArea, type ModelAreaDocument } from '@sovitech/ui/components';
import { ModelViewer, type ModelViewLabels, type ModelViewReady } from '@sovitech/viewer';
import type { DisplayObject } from '@sovitech/view-model/browser';

interface HarnessState {
  ready: boolean;
  unavailable: string[];
  continued: number;
  audit?: () => ReturnType<ModelViewReady['audit']>;
}

declare global {
  interface Window {
    __sovitechModelView: HarnessState;
  }
}

const state: HarnessState = { ready: false, unavailable: [], continued: 0 };
window.__sovitechModelView = state;

const params = new URLSearchParams(window.location.search);
const src = params.get('model') === 'missing' ? '/model-view/missing' : '/model-view/arh';

/** The draft copy of the viewer step (for the owner's OK; listed in the step's report). */
const LABELS: ModelViewLabels = {
  toolbar: 'View controls',
  actions: {
    turn_left: 'Turn left',
    turn_right: 'Turn right',
    tilt_up: 'Tilt up',
    tilt_down: 'Tilt down',
    zoom_in: 'Zoom in',
    zoom_out: 'Zoom out',
    home: 'Show the whole model',
  },
  keyHelp: 'With the view selected, the arrow keys turn and tilt it, plus and minus zoom, W, A, S and D move it, and Home shows the whole model again.',
  loading: 'Loading the model view',
};

const DOCUMENT_ID = '0192f000-0000-7000-8000-0000000000a1';
const UNKNOWN = { text: 'Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'Unknown' } } as const;
const DOCUMENT: ModelAreaDocument = {
  name: { valueId: `document:${DOCUMENT_ID}.fileName`, kind: 'record', text: 'TEST demo-hotel-arh.ifc', shape: 'value' },
  stage: { valueId: `document:${DOCUMENT_ID}.stage`, kind: 'record', ...UNKNOWN },
  revision: { valueId: `document:${DOCUMENT_ID}.revision`, kind: 'record', ...UNKNOWN },
  status: {
    valueId: `document:${DOCUMENT_ID}.coverage`,
    kind: 'line',
    text: 'Not analysed: IFC model stored, not analysed',
    shape: 'value',
    lines: [{ id: 'not_analysed', kind: 'status_line', text: 'Not analysed: IFC model stored, not analysed' }],
  },
  labels: { stage: 'Stage', revision: 'Revision' },
};
const NO_GRAPHICS: DisplayObject = {
  valueId: `document:${DOCUMENT_ID}.modelView`,
  kind: 'line',
  text: 'Not available yet: hardware graphics support in this browser',
  shape: 'missing',
  missing: 'not_available_yet',
  badge: { id: 'not_available_yet', label: 'Not available yet' },
};

function onReady(ready: ModelViewReady): void {
  state.ready = true;
  state.audit = () => ready.audit();
}

function ViewOnly() {
  return (
    <main className="harness--view">
      <h1 id="model-name">Model view</h1>
      <ModelViewer src={src} labelledBy="model-name" labels={LABELS} onUnavailable={(reason) => state.unavailable.push(reason)} onReady={onReady} />
    </main>
  );
}

function Area() {
  const [continued, setContinued] = useState(0);
  return (
    <main className="harness">
      <ModelArea
        heading="Building model"
        state="viewable"
        document={DOCUMENT}
        view={{
          render: (slot) => (
            <ModelViewer
              src={src}
              labelledBy={slot.labelledBy}
              labels={LABELS}
              onUnavailable={(reason) => {
                state.unavailable.push(reason);
                slot.onUnavailable(reason);
              }}
              onReady={onReady}
            />
          ),
          noGraphics: { display: NO_GRAPHICS },
        }}
      />
      <div>
        <Button
          variant="primary"
          onClick={() => {
            state.continued += 1;
            setContinued(continued + 1);
          }}
        >
          Continue
        </Button>
      </div>
    </main>
  );
}

const root = document.getElementById('root');
if (root === null) throw new Error('harness: no root');
createRoot(root).render(<StrictMode>{params.get('page') === 'view' ? <ViewOnly /> : <Area />}</StrictMode>);
