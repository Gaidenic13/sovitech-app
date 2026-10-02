/**
 * Equipment's inspector (DB-17's "EQUIPMENT DETAILS"; UD-26; PRD R-066, R-067, R-068; US-ASSETS-06, US-ASSETS-09,
 * US-ASSETS-11; dashboards 7.1.1-C3, D14, P6).
 *
 * - **Heading** "Equipment details", the tag as written under it (bound, From document).
 * - **Overview:** the asset's values (./asset-parts.tsx: type Unknown under the taxonomy gate, system, location,
 *   floor, zone), each with its badge and source line, and the owner's "Looks right" and "Something's wrong" where
 *   the API serves them. No model, maker, product name or photo unless a document gives it (7.1.1-P6; proposal 7.2.9),
 *   no Status, Last Update, commissioning date or "Online" (D14), no "View on Floor Plan" or "View in 3D" (R-070,
 *   R-084: no plan or model is built).
 * - **Points:** "Not available yet: SOVITECH point templates" (R-067 "Until decided"; 7.1.1-C3), never a count.
 * - **Documents:** the documents holding the asset's evidence, with their status lines, stage and revision.
 * - No Alarms tab (US-ASSETS-11 AC3). Tab labels carry no count (a count would be an unbound number).
 * - **"Open the full record"** opens the asset's record (UD-08).
 * - It reads `workspace.asset` for the asset (its own request; the register stays usable meanwhile), and says so when
 *   it could not, with Try again.
 */
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Icon, Inspector, Tabs, ValueName } from '@sovitech/ui';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { request } from '../../../api/client';
import { useLoad } from '../../../api/use-load';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { useFieldWrites } from '../../../review/field-writes';
import { useRenderReady } from '../../../shell/render-ready';
import { indexDisplays } from '../../../wizard/use-step-view';
import { pagePath } from '../../navigation';
import { AssetDocuments, AssetFields } from './asset-parts';
import { RegisterValue } from './register-values';

const EQ = copy.workspace.equipment;

/** The asset record's path (UD-08). */
export function assetPath(projectId: string, assetId: string): string {
  return `${pagePath(projectId, 'equipment')}/${assetId}`;
}

export interface EquipmentInspectorProps {
  readonly projectId: string;
  readonly assetId: string;
  /** The row's tag as the register served it, shown under the heading while the record loads. */
  readonly tag: DisplayObject | undefined;
  readonly onClose: () => void;
  /** After an answer is saved: the register reads its view again. */
  readonly onChanged: () => void;
  readonly id: string;
  readonly boxRef?: (element: HTMLDivElement | null) => void;
}

export function EquipmentInspector({ projectId, assetId, tag, onClose, onChanged, id, boxRef }: EquipmentInspectorProps) {
  const loaded = useLoad((signal) => request('workspace.asset', { params: { projectId, assetId }, signal }), [projectId, assetId]);
  const { state, reload } = loaded;
  useRenderReady(state.status !== 'loading');
  const data = state.data;
  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const writes = useFieldWrites(projectId, async () => {
    await reload({ quiet: true });
    onChanged();
  });
  const heading = tag ?? (data === undefined ? undefined : displays.get(data.view.tag));

  return (
    <div ref={boxRef} data-equipment-inspector={assetId}>
      <Inspector
        id={id}
        heading={EQ.inspector.heading}
        subheading={heading === undefined ? undefined : <ValueName display={heading} />}
        closeLabel={copy.workspace.frame.inspectorClose}
        onClose={onClose}
        footer={
          <Link to={assetPath(projectId, assetId)} className="sov-button flex-1" data-variant="secondary" data-size="default" data-icon="true" data-copy-kind="action-label">
            <span>{EQ.inspector.openRecord}</span>
            <Icon icon={ArrowRight} size="small" />
          </Link>
        }
      >
        {state.status === 'loading' && data === undefined ? <Loading label={copy.app.loading} align="start" /> : null}
        {state.status === 'failed' && data === undefined ? <LoadFailed message={copy.workspace.asset.loadFailed} onRetry={() => void reload()} /> : null}
        {data === undefined ? null : (
          <Tabs
            key={assetId}
            label={EQ.inspector.tabsLabel}
            tabs={[
              { id: 'overview', label: EQ.inspector.tabs.overview, panel: <AssetFields fields={[data.view.tag, ...data.view.fields]} displays={displays} writes={writes} /> },
              { id: 'points', label: EQ.inspector.tabs.points, panel: <RegisterValue display={displays.get(data.view.points)} /> },
              { id: 'documents', label: EQ.inspector.tabs.documents, panel: <AssetDocuments documents={data.view.documents} displays={displays} /> },
            ]}
          />
        )}
      </Inspector>
    </div>
  );
}
