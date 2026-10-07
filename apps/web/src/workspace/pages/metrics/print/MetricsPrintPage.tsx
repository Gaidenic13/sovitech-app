/**
 * The print route of a Metrics page with "Export Report" (`/projects/:projectId/print/metrics/:page/:snapshotId`; PRD
 * R-121; US-REPORTS-13; docs/adr/0052 decision 7; docs/adr/0050, amended in phase 6): a light page on white paper,
 * outside the app's shell, that the API's PDF printer opens with the requester's session and prints. It works as the
 * proposal's print route does (../../../../proposal/ProposalPrintPage.tsx):
 *
 * - **The light page** (`data-print-page` on the document element while it is shown) and **the ready marker** the
 *   printer waits for (`data-print-ready`: `"true"` once the print view has loaded and rendered, `"failed"` when it
 *   could not be loaded, which the printer answers with 503 `export_unavailable`: rule 7), and the render test's marker.
 * - **What it reads**: the page's print view of the version the address names (`metrics.payback.print`,
 *   `metrics.lifecycle.print` with `?snapshot=`), never the latest, so the file prints the snapshot the page showed
 *   (G9-8); the server strips every action (ADR 0050 decision 1).
 * - **What it shows** (./MetricsPrintDocument.tsx): the page's content as rendered, each value with its badge on its
 *   line, every missing value in its 2.8 wording (G1-32), and the demo line at the top of every printed page of the
 *   demo project (rule 10; G10-16).
 * - **While it loads**: "Loading", never a figure. **When it fails**: what could not be prepared, and "Try again" for a
 *   person reading it on screen. Both carry the demo line on the demo project, as the project list serves it (rule 10;
 *   G10-12's reading).
 * - A page with no "Export Report" (only Payback and Lifecycle have one), or an id that is not one, shows "Page not
 *   found" with the refusal marker, and nothing is read.
 */
import { PrintFrame } from '@sovitech/ui';
import { MetricsExportPageSchema, UUID_PATTERN, type MetricsExportPage } from '@sovitech/view-model/browser';
import { useParams } from 'react-router';
import { request } from '../../../../api/client';
import { useLoad } from '../../../../api/use-load';
import { copy } from '../../../../copy';
import { LoadFailed, Loading } from '../../../../pages/PageState';
import { NotFoundPage } from '../../../../pages/NotFoundPage';
import { usePrintPage, usePrintReady } from '../../../../proposal/ProposalPrintPage';
import { useRenderReady } from '../../../../shell/render-ready';
import { MetricsPrintDocument, type MetricsPrintResponse } from './MetricsPrintDocument';

/** The page's print view of the named version, typed by the page. */
async function printViewOf(page: MetricsExportPage, projectId: string, snapshotId: string, signal: AbortSignal): Promise<MetricsPrintResponse> {
  if (page === 'payback') return { page, response: await request('metrics.payback.print', { params: { projectId }, query: { snapshot: snapshotId }, signal }) };
  return { page, response: await request('metrics.lifecycle.print', { params: { projectId }, query: { snapshot: snapshotId }, signal }) };
}

function PrintView({ page, projectId, snapshotId }: { readonly page: MetricsExportPage; readonly projectId: string; readonly snapshotId: string }) {
  usePrintPage();
  const { state, reload } = useLoad((signal) => printViewOf(page, projectId, snapshotId, signal), [page, projectId, snapshotId]);
  // While the view loads or after it failed, the project list says whether the project is the demo (rule 10).
  const listed = useLoad((signal) => request('projects.list', { signal }), []);
  const demoLine = listed.state.data?.projects.find((project) => project.projectId === projectId)?.demoLine ?? null;
  const shown = state.status === 'ready' ? 'ready' : state.status === 'failed' && state.data === undefined ? 'failed' : state.status === 'failed' ? 'ready' : 'loading';
  useRenderReady(shown === 'ready' || (shown === 'failed' && listed.state.status !== 'loading'));
  usePrintReady(shown);
  if (state.data !== undefined) return <MetricsPrintDocument print={state.data} />;
  return (
    <main id="main" className="sov-print" data-metrics-print={page}>
      <PrintFrame demoLine={demoLine}>
        <div className="sov-print__state">
          {state.status === 'failed' ? <LoadFailed message={copy.print.loadFailed} onRetry={() => void reload()} /> : <Loading />}
        </div>
      </PrintFrame>
    </main>
  );
}

export function MetricsPrintPage() {
  const { projectId, page, snapshotId } = useParams();
  const known = MetricsExportPageSchema.safeParse(page);
  const valid = known.success && projectId !== undefined && snapshotId !== undefined && UUID_PATTERN.test(projectId) && UUID_PATTERN.test(snapshotId);
  if (!valid) return <NotFound />;
  return <PrintView key={`${known.data}:${projectId}:${snapshotId}`} page={known.data} projectId={projectId} snapshotId={snapshotId} />;
}

/** "Page not found" in the app's own shell (not the print scope), with the printer's refusal marker set. */
function NotFound() {
  usePrintReady('failed');
  return <NotFoundPage />;
}
