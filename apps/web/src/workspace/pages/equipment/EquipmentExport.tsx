/**
 * Equipment's Export (DB-17's table toolbar "Export"; PRD R-066; US-ASSETS-11 AC6; UD-26's Export menu; dashboards
 * 7.1-r25; docs/adr/0050-exports-print-route-and-pdf.md decision 4; phase 5, carried from phase 4).
 *
 * One press reads the register as the page's filters narrow it (system, floor, zone, badge, search; every row, not
 * one page) from `exports.equipment` and saves it: a CSV whose every cell keeps its badge and source beside it, every
 * unknown as Unknown, never 0 or blank (rule 1), and, on the demo project, the demo line first (rule 10; G10-14). The
 * file is built by the API from the register's display objects; the web adds nothing to it and writes nothing.
 *
 * - **Never disabled** (rule 7): a press while one is on its way is ignored, with `aria-busy` and a polite line
 *   ("Preparing the list"); one request per press (../../../wizard/use-in-flight.ts).
 * - **A failure says so** beside the alert icon ("The list could not be exported. Try again."), and the button takes
 *   presses again; a signed-out session shows sign-in (rule 13).
 * - One format, so one button, not the approved screen's "Export ⌄" menu (its content is undesigned, dashboards
 *   8.10; a menu of one item would hide the action one level down).
 */
import { Button, FieldError } from '@sovitech/ui';
import { Download } from 'lucide-react';
import { useId, useState } from 'react';
import type { EquipmentQuery } from '@sovitech/view-model/browser';
import { isSignedOut } from '../../../api/client';
import { copy } from '../../../copy';
import { equipmentExportPath, saveFile } from '../../../proposal/download';
import { useOnSignedOut } from '../../../session/SessionProvider';
import { useInFlight } from '../../../wizard/use-in-flight';

const EQ = copy.workspace.equipment;

/** The register's query as the export takes it: the filters and the search, never a page (the contract's `EquipmentExportQuerySchema`). */
export function exportQuery(query: EquipmentQuery): Record<string, string | undefined> {
  return { system: query.system, level: query.level, zone: query.zone, badge: query.badge, search: query.search };
}

export function EquipmentExport({ projectId, query }: { readonly projectId: string; readonly query: EquipmentQuery }) {
  const exporting = useInFlight();
  const onSignedOut = useOnSignedOut();
  const [failed, setFailed] = useState(false);
  const errorId = useId();

  const save = () => {
    void exporting.run(async () => {
      setFailed(false);
      try {
        await saveFile(equipmentExportPath(projectId, exportQuery(query)));
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
    <div className="flex flex-col items-end gap-1" data-equipment-export="">
      <Button variant="secondary" icon={Download} aria-busy={exporting.busy} aria-describedby={failed ? errorId : undefined} onClick={save}>
        {EQ.export}
      </Button>
      <p role="status" aria-live="polite" className="sov-text-small">
        {exporting.busy ? EQ.exporting : ''}
      </p>
      {failed ? (
        <div role="alert">
          <FieldError id={errorId} message={EQ.exportFailed} />
        </div>
      ) : null}
    </div>
  );
}
