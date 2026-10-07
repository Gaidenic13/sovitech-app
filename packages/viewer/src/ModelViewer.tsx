/**
 * The model viewer as a page places it (docs/build-log.md, the viewer step, items 3 and 4): the graphics probe,
 * which sits in the main bundle, then the view, one lazily loaded chunk (`React.lazy` over a literal `import()`),
 * fetched only after the probe answers "hardware". Where the probe answers "none", the viewer says "graphics" to its
 * area at once, which reads its "Not available yet" line, and the chunk is never fetched: no slow view is drawn
 * first (the owner's answer of 2026-10-05).
 *
 * Mounted on no live page in part 1 (P-V-CANVAS-UNREADABLE waits for the approver); proven in the component tests
 * and in tests/proposed/model-view.test.ts.
 */
import { lazy, Suspense, useEffect, useEffectEvent, useState } from 'react';
import { Progress } from '@sovitech/ui/components';
import type { ViewUnavailableReason } from './model-view/engine-types';
import type { ModelViewLabels, ModelViewReady } from './model-view/ModelView';
import { graphicsOnThisPage } from './probe';

const LazyModelView = lazy(() => import('./model-view/entry'));

export interface ModelViewerProps {
  /** The view file's route on the app's own origin (`documents.modelView`). */
  readonly src: string;
  /** The id of the element that names the model: the area's document line (`ModelAreaViewSlot.labelledBy`). */
  readonly labelledBy: string;
  readonly labels: ModelViewLabels;
  /** Tells the area the view cannot be drawn (`ModelAreaViewSlot.onUnavailable`). */
  readonly onUnavailable: (reason: ViewUnavailableReason) => void;
  readonly onReady?: (ready: ModelViewReady) => void;
}

function Loading({ label }: { readonly label: string }) {
  return (
    <div className="sov-model-view" data-view-state="loading">
      <div className="sov-model-view__frame">
        <div className="sov-model-view__loading">
          <Progress label={label} />
        </div>
      </div>
    </div>
  );
}

export function ModelViewer({ src, labelledBy, labels, onUnavailable, onReady }: ModelViewerProps) {
  const [graphics] = useState(graphicsOnThisPage);
  const noGraphics = useEffectEvent(() => onUnavailable('graphics'));
  useEffect(() => {
    if (graphics.kind === 'none') noGraphics();
  }, [graphics]);
  if (graphics.kind === 'none') return null;
  return (
    <Suspense fallback={<Loading label={labels.loading} />}>
      <LazyModelView src={src} labelledBy={labelledBy} labels={labels} onUnavailable={onUnavailable} {...(onReady === undefined ? {} : { onReady })} />
    </Suspense>
  );
}
