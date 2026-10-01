import { useEffect, type JSX } from 'react';
import { Navigate, Outlet, ScrollRestoration, createBrowserRouter, useMatches, useParams, type Params, type RouteObject } from 'react-router';
import { STEP_NUMBERS, UUID_PATTERN, type StepNumber } from '@sovitech/view-model/browser';
import { copy } from './copy';
import { LoadFailed, Loading } from './pages/PageState';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectListPage } from './pages/ProjectListPage';
import { SignInPage } from './pages/SignInPage';
import { RequireSession, SessionProvider, useSession } from './session/SessionProvider';
import { Shell } from './shell/Shell';
import { useRenderReady } from './shell/render-ready';
import { NewProjectStep1 } from './steps/step-1/NewProjectStep1';
import { Step1 } from './steps/step-1/Step1';
import { Step2 } from './steps/step-2/Step2';
import { ExtractedPage } from './steps/step-3/ExtractedPage';
import { Step3 } from './steps/step-3/Step3';
import { Step4 } from './steps/step-4/Step4';
import { Step5 } from './steps/step-5/Step5';
import { Step6 } from './steps/step-6/Step6';
import { Step7 } from './steps/step-7/Step7';
import { ProposalPage } from './steps/step-8/ProposalPage';
import { Step8 } from './steps/step-8/Step8';
import { ProjectLayout } from './wizard/ProjectLayout';

/**
 * The app's routes (react-router 7, docs/adr/0035-phase-3-frontend-dependencies.md). `APP_PATHS` is
 * the route table the render test's screen list is derived from: a path here with no entry in
 * tests/e2e/render/screens.ts fails (phase 0 "Next": derive the render screen list from the route
 * table). Paths hold no engineering value; project and step are route parameters.
 *
 * - `/`: the session decides: the project list when signed in, else sign-in (UD-36; R-133: nothing
 *   of a project before sign-in);
 * - `/sign-in` (UD-36), `/projects` (UD-37), `/projects/new` (step 1 of a new project: nothing is
 *   stored until Next sends the four required fields, G7-6);
 * - `/projects/:projectId/steps/:step` (OB-1 to OB-8); a project opens at step 1 (PRD R-009 "Until
 *   decided"); the stepper opens nothing (R-008);
 * - `/projects/:projectId/extracted` (UD-45), `/projects/:projectId/proposal` (UD-07 and phase 3's
 *   proposal page).
 * Every route but sign-in needs a session (rule 13); a screen of a project sits in its layout
 * (../wizard/ProjectLayout.tsx: the header's name, the demo line, the quiet notice, the uploads).
 *
 * Each route names its page in the document title (WCAG 2.4.2), set centrally from the matched
 * route's `handle` (`DocumentTitle`): "<page> – SOVITECH" from the catalogue (`titles.*`, and each
 * step's own title), never a project's name or any figure, so the title holds no digit (the render
 * test reads it) and says nothing of a project before its screen is shown.
 */
export const APP_PATHS = [
  '/',
  '/sign-in',
  '/projects',
  '/projects/new',
  '/projects/:projectId/steps/:step',
  '/projects/:projectId/extracted',
  '/projects/:projectId/proposal',
] as const;

/** A page's name in the document title: "<page> – SOVITECH". */
export function pageTitle(page: string): string {
  return copy.titles.page.replace('{page}', page);
}

/** Each step's page name: its own title (step 1, which draws none, reads "Your project"). */
const STEP_PAGE_NAMES: Readonly<Record<StepNumber, string>> = {
  1: copy.titles.project,
  2: copy.step2.title,
  3: copy.step3.title,
  4: copy.step4.title,
  5: copy.step5.title,
  6: copy.step6.title,
  7: copy.step7.title,
  8: copy.step8.title,
};

/** What a route puts in the document title, from its parameters. */
export interface RouteHandle {
  readonly title: (params: Readonly<Params>) => string;
}

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && typeof (handle as { title?: unknown }).title === 'function';
}

/** A title for a project's page, or "Page not found" when the id is not a project id (the page shows not found). */
function projectPage(name: (params: Readonly<Params>) => string | undefined): RouteHandle {
  return {
    title: (params) => {
      const page = params.projectId !== undefined && UUID_PATTERN.test(params.projectId) ? name(params) : undefined;
      return pageTitle(page ?? copy.titles.notFound);
    },
  };
}

/** The document title of the matched route: the deepest route that names one, else "SOVITECH". */
export function titleOfMatches(matches: ReadonlyArray<{ readonly handle: unknown; readonly params: Readonly<Params> }>): string {
  let title: string = copy.titles.app;
  for (const match of matches) if (isRouteHandle(match.handle)) title = match.handle.title(match.params);
  return title;
}

function DocumentTitle() {
  const title = titleOfMatches(useMatches());
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}

/** Every wizard step's screen. Each is `() => JSX.Element` and reads its view with `useStepView` (./wizard/use-step-view.ts). */
const STEP_COMPONENTS: Readonly<Record<StepNumber, () => JSX.Element>> = {
  1: Step1,
  2: Step2,
  3: Step3,
  4: Step4,
  5: Step5,
  6: Step6,
  7: Step7,
  8: Step8,
};

/** The step number of a route parameter, or undefined when it names no step. */
export function stepOfParam(param: string | undefined): StepNumber | undefined {
  return STEP_NUMBERS.find((candidate) => `${candidate}` === param);
}

/** The wizard route: the step component for `:step`, or not found. */
function WizardStep() {
  const { step } = useParams();
  const found = stepOfParam(step);
  if (found === undefined) return <NotFoundPage />;
  const Component = STEP_COMPONENTS[found];
  return <Component key={found} />;
}

/** `/`: where the session sends the visitor. */
function Entry() {
  const { session } = useSession();
  if (session.status === 'signed_in') return <Navigate to="/projects" replace />;
  if (session.status === 'signed_out') return <Navigate to="/sign-in" replace />;
  return <SessionWaiting failed={session.status === 'failed'} />;
}

/** While the session is read (or could not be), nothing of a project renders. */
function SessionWaiting({ failed }: { readonly failed: boolean }) {
  const { refresh } = useSession();
  useRenderReady(failed);
  return <Shell>{failed ? <LoadFailed message={copy.app.sessionFailed} onRetry={() => void refresh()} /> : <Loading />}</Shell>;
}

/** The root: the session for every route; each new screen starts at its top. */
function Root() {
  return (
    <SessionProvider>
      <DocumentTitle />
      <Outlet />
      <ScrollRestoration />
    </SessionProvider>
  );
}

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { path: '/', element: <Entry /> },
      { path: '/sign-in', element: <SignInPage />, handle: { title: () => pageTitle(copy.titles.signIn) } satisfies RouteHandle },
      {
        element: <RequireSession loading={<SessionWaiting failed={false} />} failed={<SessionWaiting failed />} />,
        children: [
          { path: '/projects', element: <ProjectListPage />, handle: { title: () => pageTitle(copy.titles.projects) } satisfies RouteHandle },
          { path: '/projects/new', element: <NewProjectStep1 />, handle: { title: () => pageTitle(copy.titles.newProject) } satisfies RouteHandle },
          {
            path: '/projects/:projectId',
            element: <ProjectLayout />,
            children: [
              { index: true, element: <Navigate to="steps/1" replace /> },
              {
                path: 'steps/:step',
                element: <WizardStep />,
                handle: projectPage((params) => {
                  const step = stepOfParam(params.step);
                  return step === undefined ? undefined : STEP_PAGE_NAMES[step];
                }),
              },
              { path: 'extracted', element: <ExtractedPage />, handle: projectPage(() => copy.step3.extracted.title) },
              { path: 'proposal', element: <ProposalPage />, handle: projectPage(() => copy.proposal.title) },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage />, handle: { title: () => pageTitle(copy.titles.notFound) } satisfies RouteHandle },
    ],
  },
];

export const router = createBrowserRouter(routes);
