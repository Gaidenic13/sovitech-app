/**
 * The layout of every screen of one project (the wizard steps, UD-45, the proposal page): the
 * wizard's page-session state, the project's uploads, and the shell with the project's name, its
 * demo line and the one quiet notice.
 *
 * - The demo line (rule 10; GS-1; US-REVIEW-03 AC1, AC7; US-INTAKE-01 AC8) shows on every screen
 *   of the demo project and on no other project's, always the line the API served
 *   (`ProjectHeader.demoLine`, `ProjectRow.demoLine`), never this app's copy. While a screen loads
 *   or after its request failed it shows once any response of this page session has said the
 *   project is the demo (the list, an envelope, the list's Open: ./WizardProvider.tsx `demoLine`).
 *   Not covered: a cold load of a demo screen in a new page session whose every request is pending
 *   or fails has nothing that says so, and shows no line until one answers (G10-12 proves the rest).
 * - The notice (rule 7; G7-4): one polite, dismissible notice; never a dialog, never a move.
 * - A project the user cannot reach reads as not found (rule 13: another project's screens are
 *   refused by the API; the page names nothing of it).
 */
import { Link, Outlet, useParams } from 'react-router';
import { DemoLine, Notice } from '@sovitech/ui';
import { UUID_PATTERN } from '@sovitech/view-model/browser';
import { copy } from '../copy';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppShell } from '../shell/AppShell';
import { useRenderReady } from '../shell/render-ready';
import { UploadsProvider } from './UploadsProvider';
import { WizardProvider, useWizard } from './WizardProvider';

function ProjectFrame() {
  const { header, demoLine, notice, dismissNotice } = useWizard();
  const value = header.status === 'ready' ? header.value : undefined;
  return (
    <AppShell
      {...(value?.name === undefined ? {} : { projectName: value.name })}
      demoLine={demoLine === null ? undefined : <DemoLine line={demoLine} />}
      notices={notice === null ? undefined : <Notice display={notice.display} onDismiss={dismissNotice} dismissLabel={copy.notice.dismiss} />}
    >
      {header.status === 'not_found' ? <ProjectNotFound /> : <Outlet />}
    </AppShell>
  );
}

function ProjectNotFound() {
  useRenderReady(true);
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-[22px] font-light">{copy.app.projectNotFound}</h1>
      <Link
        to="/projects"
        className="text-[15px] text-(--sov-accent) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
      >
        {copy.app.toProjects}
      </Link>
    </div>
  );
}

export function ProjectLayout() {
  const { projectId } = useParams();
  if (projectId === undefined || !UUID_PATTERN.test(projectId)) return <NotFoundPage />;
  return (
    <WizardProvider key={projectId} projectId={projectId}>
      <UploadsProvider projectId={projectId}>
        <ProjectFrame />
      </UploadsProvider>
    </WizardProvider>
  );
}
