/**
 * The wizard's page-session state for one project (docs/adr/0039-wizard-navigation-saving-and-late-findings.md):
 * the project header the shell shows, the steps the owner has left in this page session, the
 * late-findings ledger and its poll, and the moves between steps.
 *
 * - **The header** (US-INTAKE-01 AC1; R-044, R-139): the project's stored name, bound, from the
 *   newest screen envelope a step published (`publishEnvelope`) and, until one arrives or when a
 *   step fails to load, from the project's row in `GET /api/projects`.
 * - **The demo line** (rule 10; GS-1; US-REVIEW-03 AC1, AC7; US-INTAKE-01 AC8): 2.8's demo line on
 *   every screen of the demo project and on no other. Every answer that says whether this project is
 *   the demo (the list row, an envelope, the list's Open passing its row in the router state) is kept
 *   in the session by project id (../session/SessionProvider.tsx `rememberProject`), and `demoLine`
 *   reads the newest of them: the header's when a response is on screen, else what the page session
 *   was told before. So once any response has told it, the line shows while the screen loads and
 *   when both the step view and the list fail. What remains: a cold load of a project's screen in a
 *   new page session whose every request fails cannot know the flag, and shows no demo line.
 * - **A stale Continue** (rule 4, "Nothing is overwritten"; ADR 0039): when the API refuses Continue
 *   because what the step showed has changed (409 `shown_value_changed`, or another STALE_REFUSALS
 *   code), the step on screen reads its view again (`registerReload`) and the refusal is thrown to
 *   the step, which shows `continueRefusalMessage`'s sentence; nothing is stored and nothing else is
 *   blocked (rule 7).
 * - **Moves** (PRD R-008, R-009 "Until decided"): Back and Continue move one step; Continue after an
 *   Edit from step 8 moves to the next step in order; clicking the stepper opens nothing; no resume
 *   state is stored. Leaving a step records it as left, with the `asOf` of the view the owner left.
 * - **Late findings** (rule 7, "Late findings never interrupt"; G7-4; R-004): while a step is on
 *   screen, the ledger is sent to `GET /api/projects/:projectId/late-findings` every
 *   LATE_FINDINGS_POLL_MS. The answer's dots mark left steps in the stepper, and its notice is one
 *   quiet, dismissible notice in the shell's notices region. Nothing opens a dialog, moves the owner
 *   or changes an answer; the findings join step 8's lists through the field states.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  LATE_FINDINGS_POLL_MS,
  LineSchema,
  STEP_NUMBERS,
  type ContinueRequest,
  type DisplayObject,
  type Line,
  type ProjectHeader,
  type StepNumber,
} from '@sovitech/view-model/browser';
import { ApiError, isAbort, isSignedOut, request } from '../api/client';
import { copy } from '../copy';
import { useOnSignedOut, useSession, type KnownProject } from '../session/SessionProvider';

/** What every screen response of a project carries (common.ts `screenEnvelope`). */
export interface ScreenEnvelope {
  readonly asOf: string;
  readonly project: ProjectHeader;
  readonly displayObjects: readonly DisplayObject[];
}

/** The shell's header of the project: the header and the name's display object. */
export interface HeaderState {
  readonly header: ProjectHeader;
  readonly name: DisplayObject | undefined;
}

export type HeaderLoad = { readonly status: 'loading' } | { readonly status: 'ready'; readonly value: HeaderState } | { readonly status: 'not_found' } | { readonly status: 'failed' };

/** The quiet notice on screen: its line's display object (`project:<id>.lateFindings.notice`). */
export interface NoticeState {
  readonly display: DisplayObject;
}

export interface WizardContextValue {
  readonly projectId: string;
  readonly header: HeaderLoad;
  /**
   * The demo line to show on this screen of the project: the served line of the newest answer that
   * said this project is the demo (the header's, else what the page session was told), or null.
   */
  readonly demoLine: Line | null;
  /** A step screen registers how to read its view again (after a stale Continue); it returns the unregister function. */
  readonly registerReload: (reload: () => void) => () => void;
  /** The step on screen, or null on a project page that is not a step (UD-45, the proposal page). */
  readonly currentStep: StepNumber | null;
  /** Steps left in this page session (shown completed in the stepper). */
  readonly leftSteps: ReadonlySet<StepNumber>;
  /** Left steps with a late finding (the stepper's dots). */
  readonly dots: ReadonlySet<StepNumber>;
  readonly notice: NoticeState | null;
  readonly dismissNotice: () => void;
  /** A step screen tells the wizard it is on screen (and when it leaves). */
  readonly enterStep: (step: StepNumber | null) => void;
  /** A screen publishes the envelope it received, so the header shows its newest state. */
  readonly publishEnvelope: (envelope: ScreenEnvelope) => void;
  /** Records a step as left with the `asOf` of the view the owner left (undefined when the step had no view). */
  readonly leave: (step: StepNumber, asOf: string | undefined) => void;
  /** Opens a step of this project, recording `from` as left. */
  readonly goToStep: (step: StepNumber, from?: { readonly step: StepNumber; readonly asOf: string | undefined }) => void;
  /** Back from a step (steps 2 to 8): the previous step opens and nothing is stored (R-009; US-INTAKE-01 AC4). */
  readonly back: (step: StepNumber, asOf: string | undefined) => void;
  /**
   * Continue (Next on step 1 of an existing project): sends the step's answers, records the step
   * as left and opens the step the API answers (always the next in order; R-008). Refusals are
   * thrown to the step, which shows them inline; nothing else is blocked (rule 7).
   */
  readonly continueFrom: (step: StepNumber, asOf: string | undefined, body: ContinueRequest) => Promise<void>;
  /** The proposal page (Generate before phase 5; ADR 0039 decision 4), recording step 8 as left. */
  readonly openProposal: (from?: { readonly step: StepNumber; readonly asOf: string | undefined }) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

/**
 * Refusals that mean the page showed something that is no longer so (the value changed, the
 * confirmation or conflict is gone, the question was answered meanwhile): the screen reads its view
 * again and says so (copy.edit.changed), as review/field-writes.ts does for the owner's other writes.
 */
export const STALE_REFUSALS: ReadonlySet<string> = new Set(['shown_value_changed', 'confirmation_not_shown', 'conflict_not_open', 'question_answered']);

/** Whether an error is a refusal because what the page showed is out of date. */
export function isStaleRefusal(error: unknown): boolean {
  return error instanceof ApiError && STALE_REFUSALS.has(error.code);
}

/** The sentence a step shows under its footer when Continue was refused (a 401 is handled apart: sign-in shows). */
export function continueRefusalMessage(error: unknown): string {
  return isStaleRefusal(error) ? copy.edit.changed : copy.nav.continueFailed;
}

/** An empty Continue: the step showed no question and no confirmation. */
export const EMPTY_CONTINUE: ContinueRequest = { answers: [], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } };

function isStep(value: number): value is StepNumber {
  return (STEP_NUMBERS as readonly number[]).includes(value);
}

/** The steps a navigation's state says were left (`{ leftSteps: [1] }` after a project is created). */
function leftStepsOf(state: unknown): StepNumber[] {
  if (typeof state !== 'object' || state === null || !('leftSteps' in state)) return [];
  const steps = (state as { leftSteps: unknown }).leftSteps;
  if (!Array.isArray(steps)) return [];
  return steps.filter((step): step is StepNumber => typeof step === 'number' && isStep(step));
}

/**
 * What the router state says about this project's demo flag: the project list's Open passes the row
 * it opened (`{ project: { projectId, isDemo, demoLine } }`). Anything else, or another project's row,
 * says nothing.
 */
function knownFromState(state: unknown, projectId: string): KnownProject | undefined {
  if (typeof state !== 'object' || state === null || !('project' in state)) return undefined;
  const project = (state as { project: unknown }).project;
  if (typeof project !== 'object' || project === null) return undefined;
  const { projectId: stated, isDemo, demoLine } = project as { projectId?: unknown; isDemo?: unknown; demoLine?: unknown };
  if (stated !== projectId || typeof isDemo !== 'boolean') return undefined;
  const line = LineSchema.nullable().safeParse(demoLine);
  if (!line.success) return undefined;
  if (isDemo) return line.data !== null && line.data.kind === 'demo_line' ? { isDemo: true, demoLine: line.data } : undefined;
  return { isDemo: false, demoLine: null };
}

/** The previous step, or null on step 1. */
export function previousStep(step: StepNumber): StepNumber | null {
  const previous = step - 1;
  return isStep(previous) ? previous : null;
}

export function stepPath(projectId: string, step: StepNumber): string {
  return `/projects/${projectId}/steps/${step}`;
}

export function WizardProvider({ projectId, children }: { readonly projectId: string; readonly children: ReactNode }) {
  const navigate = useNavigate();
  const onSignedOut = useOnSignedOut();
  const { knownProjects, rememberProject } = useSession();
  const [listHeader, setListHeader] = useState<HeaderLoad>({ status: 'loading' });
  const [published, setPublished] = useState<HeaderState | null>(null);
  const [currentStep, setCurrentStep] = useState<StepNumber | null>(null);
  const location = useLocation();
  /** How the step on screen reads its view again (a stale Continue), or null. */
  const stepReload = useRef<(() => void) | null>(null);

  // The project list's Open says whether this project is the demo before any request of it answers.
  const stated = knownFromState(location.state, projectId);
  useEffect(() => {
    if (stated !== undefined) rememberProject(projectId, stated);
    // Read once, when the project's screens open: later answers are newer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  // A new project's step 1 was left on the page that created it (`NewProjectStep1` passes it on).
  const [leftSteps, setLeftSteps] = useState<ReadonlySet<StepNumber>>(() => new Set(leftStepsOf(location.state)));
  const [dots, setDots] = useState<ReadonlySet<StepNumber>>(new Set());
  const [notice, setNotice] = useState<NoticeState | null>(null);
  /** The ledger: step → the `asOf` of the view the owner left it on (page session only; R-009). */
  const ledger = useRef(new Map<StepNumber, string>());
  const since = useRef<string | undefined>(undefined);

  // The project's row: the header before a step publishes one, and whether the project is reachable.
  useEffect(() => {
    // The provider is keyed by the project (ProjectLayout), so its states start fresh for each one.
    const controller = new AbortController();
    request('projects.list', { signal: controller.signal }).then(
      (list) => {
        const row = list.projects.find((project) => project.projectId === projectId);
        if (row === undefined) {
          setListHeader({ status: 'not_found' });
          return;
        }
        const header: ProjectHeader = { projectId: row.projectId, name: row.name, isDemo: row.isDemo, demoLine: row.demoLine };
        rememberProject(row.projectId, { isDemo: row.isDemo, demoLine: row.demoLine });
        setListHeader({ status: 'ready', value: { header, name: list.displayObjects.find((display) => display.valueId === row.name) } });
      },
      (error: unknown) => {
        if (isAbort(error)) return;
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        setListHeader({ status: 'failed' });
      },
    );
    return () => controller.abort();
  }, [projectId, onSignedOut, rememberProject]);

  const publishEnvelope = useCallback(
    (envelope: ScreenEnvelope) => {
      if (envelope.project.projectId !== projectId) return;
      rememberProject(projectId, { isDemo: envelope.project.isDemo, demoLine: envelope.project.demoLine });
      setPublished({ header: envelope.project, name: envelope.displayObjects.find((display) => display.valueId === envelope.project.name) });
    },
    [projectId, rememberProject],
  );

  const header = useMemo<HeaderLoad>(() => (published === null ? listHeader : { status: 'ready', value: published }), [listHeader, published]);

  // The newest answer says whether the demo line shows: the header on screen, else what the page
  // session was told (the router state's row counts from the first render). A project the list does
  // not hold shows its not-found page, with no line.
  const known = knownProjects.get(projectId) ?? stated;
  const demoLine: Line | null = header.status === 'ready' ? header.value.header.demoLine : header.status === 'not_found' ? null : (known?.demoLine ?? null);

  const registerReload = useCallback((reload: () => void) => {
    stepReload.current = reload;
    return () => {
      if (stepReload.current === reload) stepReload.current = null;
    };
  }, []);

  const leave = useCallback((step: StepNumber, asOf: string | undefined) => {
    if (asOf !== undefined) ledger.current.set(step, asOf);
    setLeftSteps((previous) => (previous.has(step) ? previous : new Set([...previous, step])));
  }, []);

  const goToStep = useCallback(
    (step: StepNumber, from?: { readonly step: StepNumber; readonly asOf: string | undefined }) => {
      if (from !== undefined) leave(from.step, from.asOf);
      void navigate(stepPath(projectId, step));
    },
    [leave, navigate, projectId],
  );

  const back = useCallback(
    (step: StepNumber, asOf: string | undefined) => {
      const previous = previousStep(step);
      if (previous === null) return;
      goToStep(previous, { step, asOf });
    },
    [goToStep],
  );

  const openProposal = useCallback(
    (from?: { readonly step: StepNumber; readonly asOf: string | undefined }) => {
      if (from !== undefined) leave(from.step, from.asOf);
      void navigate(`/projects/${projectId}/proposal`);
    },
    [leave, navigate, projectId],
  );

  const continueFrom = useCallback(
    async (step: StepNumber, asOf: string | undefined, body: ContinueRequest) => {
      let answer;
      try {
        answer = await request('steps.continue', { params: { projectId, step }, body });
      } catch (error) {
        // What the step showed changed under the owner: the step reads its view again, and says so.
        if (isStaleRefusal(error)) stepReload.current?.();
        throw error;
      }
      if (answer.nextStep === 'proposal') openProposal({ step, asOf });
      else goToStep(answer.nextStep, { step, asOf });
    },
    [goToStep, openProposal, projectId],
  );

  const enterStep = useCallback((step: StepNumber | null) => {
    setCurrentStep(step);
    // The step on screen is not "left" while it is on screen; it shows its number again.
    if (step !== null) {
      setLeftSteps((previous) => {
        if (!previous.has(step)) return previous;
        const next = new Set(previous);
        next.delete(step);
        return next;
      });
    }
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  // The late-findings poll, while a step is on screen (G7-4).
  useEffect(() => {
    if (currentStep === null) return;
    const step = currentStep;
    let controller: AbortController | undefined;
    let stopped = false;
    const poll = async () => {
      controller = new AbortController();
      const left = [...ledger.current.entries()].filter(([leftStep]) => leftStep !== step).map(([leftStep, at]) => `${leftStep}@${at}`);
      try {
        const answer = await request('lateFindings', {
          params: { projectId },
          query: { current: String(step), since: since.current, ...(left.length === 0 ? {} : { left }) },
          signal: controller.signal,
        });
        if (stopped) return;
        since.current = answer.asOf;
        setDots(new Set(answer.dots.filter((dot) => dot !== step)));
        if (answer.notice !== null) {
          const display = answer.displayObjects.find((candidate) => candidate.valueId === answer.notice);
          if (display !== undefined) setNotice({ display });
        }
      } catch (error) {
        if (isAbort(error) || stopped) return;
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        // A failed poll changes nothing on screen; the next one asks again (rule 7: nothing waits on it).
        if (!(error instanceof ApiError)) return;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), LATE_FINDINGS_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      controller?.abort();
    };
  }, [currentStep, projectId, onSignedOut]);

  const value = useMemo<WizardContextValue>(
    () => ({
      projectId,
      header,
      demoLine,
      registerReload,
      currentStep,
      leftSteps,
      dots,
      notice,
      dismissNotice,
      enterStep,
      publishEnvelope,
      leave,
      goToStep,
      back,
      continueFrom,
      openProposal,
    }),
    [projectId, header, demoLine, registerReload, currentStep, leftSteps, dots, notice, dismissNotice, enterStep, publishEnvelope, leave, goToStep, back, continueFrom, openProposal],
  );
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

/** The wizard of the project on screen. */
export function useWizard(): WizardContextValue {
  const value = useContext(WizardContext);
  if (value === null) throw new Error('useWizard is used outside WizardProvider');
  return value;
}

/** The wizard, or null on a screen outside a project (the new project's step 1). */
export function useOptionalWizard(): WizardContextValue | null {
  return useContext(WizardContext);
}
