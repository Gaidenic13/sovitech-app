/**
 * The model view: one canvas showing a stored IFC model's converted view file, its camera moved from the keyboard,
 * from a toolbar and with the pointer (docs/build-log.md, the viewer step, items 2, 3 and 5; prompt 3 section 8,
 * "The viewer is a view of a document, never a source of values"; PRD R-078, R-054's canvas, R-080, R-162;
 * US-MODEL-04; the owner's answer of 2026-10-05, D-03 "1 b").
 *
 * This is the one component that draws the canvas: the stage's only child, made for each engine in the effect below
 * (a canvas whose WebGL context was released cannot be drawn on again). In part 1 it is mounted on no live page: the
 * render test fails every canvas that is not on its reviewed unreadable list, and adding one is the approver's
 * decision (P-V-CANVAS-UNREADABLE). Part 2, on the approver's yes, sets the reviewed marker on that canvas here, with
 * a literal `setAttribute` the render check's source scan accepts in this file only.
 *
 * What it shows: the model's shapes only, in token colours (./engine.ts). What it never shows: text, a number, a
 * name, a label, a pin, a highlight, a scale bar, a north mark, a logo or anything selected (R-080, R-082, R-083;
 * `view-provenance` and `ifc-values` closed). The stage holds the canvas and nothing else; the model is named beside
 * the view by the area's document line, which names the stage too (`aria-labelledby`), never by an `aria-label`
 * holding the file name.
 *
 * Keys (./camera.ts) act only while the stage has focus, and Tab leaves it; the toolbar is one tab stop with the
 * arrow keys inside it (roving tabindex); the key help is visible text. Nothing moves by itself: no auto-rotation,
 * and with prefers-reduced-motion every move is instant. A key, a click or a hover selects nothing and asks the
 * server for nothing (the engine installs no picking). When the engine cannot start, its file does not load or its
 * context is lost, the view says so to its area (`onUnavailable`), which changes in place; nothing else on the page
 * waits for it (rule 7; G7-23).
 */
import { ChevronsDown, ChevronsUp, RotateCcw, RotateCw, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, Progress, type IconComponent } from '@sovitech/ui/components';
import { auditStage, type SceneAudit, type StageAudit } from '../audit';
import { actionForKey, TOOLBAR_ACTIONS, type CameraAction, type ToolbarAction } from './camera';
import { ViewUnavailableError, type CreateEngine, type ViewEngine, type ViewUnavailableReason } from './engine-types';

/** The view's fixed copy, from the app's catalogue: no digit and no reserved term (the key help is checked for both). */
export interface ModelViewLabels {
  /** The toolbar's name ("View controls"). */
  readonly toolbar: string;
  /** Each button's name ("Turn left", "Show the whole model"). */
  readonly actions: Readonly<Record<ToolbarAction, string>>;
  /** The visible key help under the toolbar. */
  readonly keyHelp: string;
  /** What the view says while its file loads. */
  readonly loading: string;
}

/** What a ready view hands a caller who asks (tests): its scene and stage audits, counts only. */
export interface ModelViewReady {
  audit(): { readonly scene: SceneAudit; readonly stage: StageAudit };
}

export interface ModelViewProps {
  /** The view file's route on the app's own origin (`documents.modelView`). */
  readonly src: string;
  /** The id of the element that names the model: the area's document line. */
  readonly labelledBy: string;
  readonly labels: ModelViewLabels;
  readonly onUnavailable: (reason: ViewUnavailableReason) => void;
  readonly onReady?: (ready: ModelViewReady) => void;
  /** The engine: three.js in the lazily loaded chunk (./entry.tsx), a stub in the component tests. */
  readonly createEngine: CreateEngine;
}

const ICONS: Readonly<Record<ToolbarAction, IconComponent>> = {
  turn_left: RotateCcw,
  turn_right: RotateCw,
  tilt_up: ChevronsUp,
  tilt_down: ChevronsDown,
  zoom_in: ZoomIn,
  zoom_out: ZoomOut,
  home: Scan,
};

function reducedMotionQuery(): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : undefined;
}

/** Where a key moves the focus in the toolbar of `count` buttons, from `index` (the WAI-ARIA toolbar pattern); null for any other key. */
function toolbarTarget(key: string, index: number, count: number): number | null {
  // Past either end the focus wraps round to the other (the toolbar pattern's optional wrapping).
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index + count - 1) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

function Toolbar({ labels, controls, onAction }: { readonly labels: ModelViewLabels; readonly controls: string; readonly onAction: (action: CameraAction) => void }) {
  const [active, setActive] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = toolbarTarget(event.key, index, TOOLBAR_ACTIONS.length);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };
  return (
    <div role="toolbar" aria-label={labels.toolbar} aria-controls={controls} className="sov-model-view__toolbar">
      {TOOLBAR_ACTIONS.map((action, index) => (
        <button
          key={action}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          type="button"
          className="sov-icon-button"
          aria-label={labels.actions[action]}
          title={labels.actions[action]}
          tabIndex={index === active ? 0 : -1}
          onFocus={() => setActive(index)}
          onKeyDown={(event) => onKeyDown(event, index)}
          onClick={() => onAction(action)}
        >
          <Icon icon={ICONS[action]} />
        </button>
      ))}
    </div>
  );
}

export function ModelView({ src, labelledBy, labels, onUnavailable, onReady, createEngine }: ModelViewProps) {
  const stageId = useId();
  const helpId = useId();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ViewEngine | undefined>(undefined);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const unavailable = useEffectEvent((reason: ViewUnavailableReason) => onUnavailable(reason));
  const ready = useEffectEvent((engine: ViewEngine) => {
    onReady?.({
      audit: () => {
        const stage = stageRef.current;
        if (stage === null) throw new Error('model view: the stage is gone');
        return { scene: engine.audit(), stage: auditStage(stage) };
      },
    });
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null) return;
    // Each engine draws on a canvas of its own: disposing an engine releases its WebGL context, and a canvas whose
    // context was released cannot be drawn on again (a model chosen later, or React's development double run).
    const canvas = stage.ownerDocument.createElement('canvas');
    canvas.className = 'sov-model-view__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);
    const controller = new AbortController();
    let live = true;
    let started: ViewEngine | undefined;
    setPhase('loading');
    const motion = reducedMotionQuery();
    createEngine(canvas, {
      src,
      signal: controller.signal,
      reducedMotion: motion?.matches ?? false,
      onContextLost: () => {
        if (live) unavailable('graphics');
      },
    }).then(
      (engine) => {
        if (!live) {
          engine.dispose();
          return;
        }
        started = engine;
        engineRef.current = engine;
        engine.setReducedMotion(motion?.matches ?? false);
        setPhase('ready');
        ready(engine);
      },
      (error: unknown) => {
        if (!live) return;
        unavailable(error instanceof ViewUnavailableError ? error.reason : 'load');
      },
    );
    return () => {
      live = false;
      controller.abort();
      engineRef.current = undefined;
      started?.dispose();
      canvas.remove();
    };
  }, [src, createEngine]);

  useEffect(() => {
    const motion = reducedMotionQuery();
    if (motion === undefined || typeof motion.addEventListener !== 'function') return;
    const onChange = (event: { readonly matches: boolean }) => engineRef.current?.setReducedMotion(event.matches);
    motion.addEventListener('change', onChange);
    return () => motion.removeEventListener('change', onChange);
  }, []);

  const move = (action: CameraAction) => engineRef.current?.move(action);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = actionForKey(event);
    if (action === null) return;
    event.preventDefault();
    move(action);
  };

  return (
    <div className="sov-model-view" data-view-state={phase}>
      <div className="sov-model-view__frame">
        <div
          ref={stageRef}
          id={stageId}
          className="sov-model-view__stage"
          role="application"
          tabIndex={0}
          aria-labelledby={labelledBy}
          aria-describedby={helpId}
          onKeyDown={onKeyDown}
        />
        {phase === 'loading' ? (
          <div className="sov-model-view__loading">
            <Progress label={labels.loading} />
          </div>
        ) : null}
      </div>
      <Toolbar labels={labels} controls={stageId} onAction={move} />
      <p id={helpId} className="sov-model-view__help">
        {labels.keyHelp}
      </p>
    </div>
  );
}
