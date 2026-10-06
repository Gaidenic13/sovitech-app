/**
 * "Download PDF" on the stored proposal (PRD R-118, R-119; US-REPORTS-02 AC1, AC6; docs/adr/0050 decisions 2 and 3):
 * one press records a generated output of this snapshot (`proposals.export`, the owner's write, CSRF), then reads its
 * file (`exports.file`, the PDF the API prints from the print route of this snapshot, never from newer values) and
 * saves it; Reports then lists it (R-119).
 *
 * - **Never disabled** (rule 7; US-REPORTS-02 AC6: "the download is never disabled" for missing data): a press while
 *   one is on its way is ignored and the button says so with `aria-busy` (one request per press,
 *   ../wizard/use-in-flight.ts), and a polite line says the PDF is being prepared.
 * - **A failure says so** (the printer's `503 export_unavailable`, a refusal, the API unreachable): "The PDF could not
 *   be prepared. Your proposal is unchanged. Try again." beside the alert icon; the button takes presses again.
 * - A signed-out session shows sign-in (rule 13).
 * - **The title keeps its place** (DR-16): the "Preparing" and failure lines sit in a box under the button, taken out of
 *   the page header's flow, so the header is as tall as the button whatever they say (the page aligns its controls to
 *   the title's top).
 */
import { Button, FieldError } from '@sovitech/ui';
import { Download } from 'lucide-react';
import { useId, useState } from 'react';
import { isSignedOut, request } from '../api/client';
import { copy } from '../copy';
import { useOnSignedOut } from '../session/SessionProvider';
import { useInFlight } from '../wizard/use-in-flight';
import { exportFilePath, saveFile } from './download';

export function DownloadProposal({ projectId, snapshotId }: { readonly projectId: string; readonly snapshotId: string }) {
  const downloading = useInFlight();
  const onSignedOut = useOnSignedOut();
  const [failed, setFailed] = useState(false);
  const errorId = useId();

  const download = () => {
    void downloading.run(async () => {
      setFailed(false);
      try {
        const { outputId } = await request('proposals.export', { params: { projectId, snapshotId }, body: {} });
        await saveFile(exportFilePath(projectId, outputId));
      } catch (error) {
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        setFailed(true);
      }
    });
  };

  return (
    <div className="relative flex flex-col items-end" data-download-proposal="">
      <Button variant="primary" icon={Download} aria-busy={downloading.busy} aria-describedby={failed ? errorId : undefined} onClick={download}>
        {copy.proposal.download}
      </Button>
      <div className="absolute top-full right-0 z-10 mt-2 flex w-max max-w-[440px] flex-col items-end gap-1" data-download-messages="">
        <p role="status" aria-live="polite" className="sov-text-small">
          {downloading.busy ? copy.proposal.downloading : ''}
        </p>
        {failed ? (
          <div role="alert">
            <FieldError id={errorId} message={copy.proposal.downloadFailed} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
