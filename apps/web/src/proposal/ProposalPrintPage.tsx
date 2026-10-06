/**
 * The print route of a stored proposal (`/projects/:projectId/print/proposals/:snapshotId`; PRD R-118; US-REPORTS-01
 * to US-REPORTS-03; the contract's `proposals.print`; docs/adr/0050-exports-print-route-and-pdf.md): a light page on
 * white paper, outside the app's shell, that the API's PDF printer opens with the requester's session and prints.
 *
 * - **The light page**: while it is shown, the document element carries `data-print-page`, which switches the tokens
 *   to the brand's light values (packages/ui/src/tokens.css, the print scope); the attribute goes when the page goes.
 * - **The ready marker** the printer waits for (`data-print-ready` on the document element; apps/api/src/proposal/
 *   export.ts): `"true"` once the print view has loaded and rendered, `"failed"` when it could not be loaded (the
 *   printer then answers 503 `export_unavailable`, and the owner can try again: rule 7), and absent while it loads.
 *   The render test's own marker (`data-render-ready` on the body) follows the same load (./shell/render-ready.ts).
 * - **What it shows** (./print/PrintDocument.tsx): the cover, the proposal's sections with badges, ranges and sources
 *   inline, the appendix of every value's source, verification and method, "What we still need" once, and the demo
 *   line at the top of every printed page of the demo project. No action and no logo (ADR 0050 decision 7).
 * - **While it loads**: "Loading", never a figure. **When it fails**: what could not be prepared, and "Try again" for a
 *   person reading the page on screen (the printer reads the marker and refuses). Both carry the demo line on the demo
 *   project, as the project list serves it (rule 10; G10-12's reading). A session that has gone sends the
 *   page to sign-in (rule 13), which the printer reads as a refusal.
 * - An id that is not one shows "Page not found" (the route's title says so too).
 */
import { PrintFrame } from '@sovitech/ui';
import { UUID_PATTERN } from '@sovitech/view-model/browser';
import { useLayoutEffect } from 'react';
import { useParams } from 'react-router';
import { request } from '../api/client';
import { useLoad } from '../api/use-load';
import { copy } from '../copy';
import { LoadFailed, Loading } from '../pages/PageState';
import { NotFoundPage } from '../pages/NotFoundPage';
import { useRenderReady } from '../shell/render-ready';
import { PrintDocument } from './print/PrintDocument';

/** The attribute on the document element that switches the tokens to the print scope's light values. */
export const PRINT_PAGE_ATTRIBUTE = 'data-print-page';
/** The attribute on the document element the API's printer waits for (apps/api/src/proposal/export.ts PRINT_READY_ATTRIBUTE). */
export const PRINT_READY_ATTRIBUTE = 'data-print-ready';

/** Switches the document to the print scope while the page is shown. */
function usePrintPage(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute(PRINT_PAGE_ATTRIBUTE, '');
    return () => {
      root.removeAttribute(PRINT_PAGE_ATTRIBUTE);
      root.removeAttribute(PRINT_READY_ATTRIBUTE);
    };
  }, []);
}

/** Sets the printer's ready marker once what the page shows has rendered (`true`), when it failed (`failed`), or clears it. */
function usePrintReady(state: 'loading' | 'ready' | 'failed'): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (state === 'loading') root.removeAttribute(PRINT_READY_ATTRIBUTE);
    else root.setAttribute(PRINT_READY_ATTRIBUTE, state === 'ready' ? 'true' : 'failed');
  }, [state]);
}

function PrintView({ projectId, snapshotId }: { readonly projectId: string; readonly snapshotId: string }) {
  usePrintPage();
  const { state, reload } = useLoad((signal) => request('proposals.print', { params: { projectId, snapshotId }, signal }), [projectId, snapshotId]);
  // The project list says whether the project is the demo while the print view loads or after it failed, so those
  // states carry the demo line too (rule 10, "Labelled everywhere"; G10-12's reading: once a response of the page
  // session has said it is the demo). The print view's own header decides it once the view is in.
  const listed = useLoad((signal) => request('projects.list', { signal }), []);
  const demoLine = listed.state.data?.projects.find((project) => project.projectId === projectId)?.demoLine ?? null;
  const shown = state.status === 'ready' ? 'ready' : state.status === 'failed' && state.data === undefined ? 'failed' : state.status === 'failed' ? 'ready' : 'loading';
  useRenderReady(shown === 'ready' || (shown === 'failed' && listed.state.status !== 'loading'));
  usePrintReady(shown);
  if (state.data !== undefined) return <PrintDocument response={state.data} />;
  return (
    <main id="main" className="sov-print" data-proposal-print="">
      <PrintFrame demoLine={demoLine}>
        <div className="sov-print__state">
          {state.status === 'failed' ? <LoadFailed message={copy.print.loadFailed} onRetry={() => void reload()} /> : <Loading />}
        </div>
      </PrintFrame>
    </main>
  );
}

export function ProposalPrintPage() {
  const { projectId, snapshotId } = useParams();
  const valid = projectId !== undefined && snapshotId !== undefined && UUID_PATTERN.test(projectId) && UUID_PATTERN.test(snapshotId);
  if (!valid) return <NotFound />;
  return <PrintView key={`${projectId}:${snapshotId}`} projectId={projectId} snapshotId={snapshotId} />;
}

/** "Page not found" in the app's own shell (not the print scope), with the printer's refusal marker set. */
function NotFound() {
  usePrintReady('failed');
  return <NotFoundPage />;
}
