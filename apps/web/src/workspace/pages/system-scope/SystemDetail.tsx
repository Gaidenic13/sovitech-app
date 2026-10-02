/**
 * System Scope's detail panel (DB-16's panel under the canvas, beside the list in this build: R-054 builds no canvas;
 * PRD R-052, R-053, R-056, R-058; US-SCOPE-07, US-SCOPE-08, US-SCOPE-10 AC1; dashboards 7.1.1-C1, C4, L1).
 *
 * - **Overview:** the system's fixed description (Fire Safety's is the monitoring-only text on every surface: §5-4b;
 *   rule 11), its recorded decision with its badge (the same display as step 4, step 8 and the row: G2-7), and the
 *   register queries for it: the floors its equipment's own values name, its equipment by type ("Not available yet:
 *   SOVITECH asset taxonomy" while the gate is closed), the zones its equipment names, and its points ("Not available
 *   yet: SOVITECH point templates": R-053). Each through the kit, bound. No Coverage (7.1.1-C4), no "<n> devices in
 *   topology" (7.1.1-C1), no Controllers or Network tab (R-058; proposal 7.2.10).
 * - **Equipment** and **Zones** (US-SCOPE-07 AC9): the register's equipment and zones whose own stored system is this
 *   one (`workspace.equipment` and `workspace.zones` filtered by `system`, and by the shared floor), with the same
 *   values, badges and source lines as on Equipment and Zones (G2-7), each with a link to its record (UD-08), and a
 *   link to the full page filtered by the system. Filters write nothing (R-066).
 * - No "Edit Scope" (it repeats the row's switch; listed for the owner), no live status or reading (R-139).
 *
 * Undesigned states (an empty tab, a tab that failed to load), per the frontend-design skill within the brand: one
 * quiet sentence in the tertiary text colour, and the link to the full page under it.
 */
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Icon, Inspector, Tabs, Value } from '@sovitech/ui';
import type { DisplayObject, SystemScopeRow } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import type { Displays } from '../../../wizard/use-step-view';
import { pagePath } from '../../navigation';
import { useWorkspaceView } from '../../use-workspace';
import { DetailRow } from '../equipment/asset-parts';
import { RegisterValue } from '../equipment/register-values';
import { SYSTEM_ICONS, systemWords, withSearch } from './systems';

const SCOPE = copy.workspace.systemScope;

/** The quiet sentence of an empty or failed tab, then the link to the full page. */
function TabFoot({ to, label }: { readonly to: string; readonly label: string }) {
  return (
    <Link to={to} className="sov-button self-start" data-variant="link" data-icon="true" data-copy-kind="action-label">
      <span>{label}</span>
      <Icon icon={ArrowRight} size="small" />
    </Link>
  );
}

function SystemEquipment({ projectId, systemId, level }: { readonly projectId: string; readonly systemId: string; readonly level: string | undefined }) {
  const { state, data, displays, reload } = useWorkspaceView('workspace.equipment', { query: { system: systemId, level } });
  const to = withSearch(pagePath(projectId, 'equipment', level), { system: systemId });
  if (state.status === 'loading') return <Loading label={copy.app.loading} align="start" />;
  if (data === undefined) return <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={() => void reload()} />;
  const rows = data.view.rows;
  const total = displays.get(data.view.total);
  return (
    <div className="flex flex-col gap-3">
      <RegisterValue display={total} />
      {rows.length === 0 ? (
        <p className="text-[14px] text-(--sov-text-tertiary)">{data.view.state === 'listed' ? SCOPE.detail.noEquipment : copy.workspace.equipment.empty[data.view.state]}</p>
      ) : (
        <ul aria-label={SCOPE.detail.equipmentList} className="flex flex-col">
          {rows.map((row) => {
            const tag = displays.get(row.tag);
            const type = displays.get(row.type);
            return (
              <li key={row.assetId} className="flex items-start justify-between gap-3 border-b border-(--sov-border) py-2 text-[14px] last:border-b-0">
                <span className="flex min-w-0 flex-col gap-1 [&_.sov-value>:first-child]:flex-wrap [&_.sov-value>:first-child]:gap-x-2 [&_.sov-value>:first-child]:gap-y-1 [&_.sov-value_bdi]:break-words">
                  {tag === undefined ? null : <Value display={tag} layout="bare" />}
                  {type === undefined ? null : <Value display={type} label={null} layout="compact" />}
                </span>
                <Link to={`${pagePath(projectId, 'equipment')}/${row.assetId}`} className="sov-icon-button shrink-0" aria-label={copy.workspace.equipment.inspector.openRecord}>
                  <Icon icon={ChevronRight} size="small" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <TabFoot to={to} label={SCOPE.detail.viewEquipment} />
    </div>
  );
}

function SystemZones({ projectId, systemId, level }: { readonly projectId: string; readonly systemId: string; readonly level: string | undefined }) {
  const { state, data, displays, reload } = useWorkspaceView('workspace.zones', { query: { system: systemId, level } });
  const to = withSearch(pagePath(projectId, 'zones', level), { system: systemId });
  if (state.status === 'loading') return <Loading label={copy.app.loading} align="start" />;
  if (data === undefined) return <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={() => void reload()} />;
  const rows = data.view.rows;
  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <p className="text-[14px] text-(--sov-text-tertiary)">{data.view.state === 'listed' ? SCOPE.detail.noZones : copy.workspace.zones.empty[data.view.state]}</p>
      ) : (
        <ul aria-label={SCOPE.detail.zonesList} className="flex flex-col">
          {rows.map((row) => {
            const name = displays.get(row.name);
            const zoneLevel = displays.get(row.level);
            return (
              <li key={row.zoneId} className="flex flex-wrap items-start justify-between gap-3 border-b border-(--sov-border) py-2 text-[14px] last:border-b-0">
                <span className="min-w-0 [&_.sov-value>:first-child]:flex-wrap [&_.sov-value>:first-child]:gap-x-2 [&_.sov-value>:first-child]:gap-y-1 [&_.sov-value_bdi]:break-words">
                  {name === undefined ? null : <Value display={name} layout="bare" />}
                </span>
                {zoneLevel === undefined ? null : <Value display={zoneLevel} label={null} layout="compact" />}
              </li>
            );
          })}
        </ul>
      )}
      <TabFoot to={to} label={SCOPE.detail.viewZones} />
    </div>
  );
}

export interface SystemDetailProps {
  readonly projectId: string;
  readonly row: SystemScopeRow;
  readonly displays: Displays;
  /** The shared floor selection (a level key), or undefined for all floors. */
  readonly level: string | undefined;
  readonly onClose: () => void;
  /** The panel's id, for the rows' `aria-controls`. */
  readonly id: string;
  /** The panel's container, so the page can move the focus to its close button. */
  readonly boxRef?: (element: HTMLDivElement | null) => void;
}

export function SystemDetail({ projectId, row, displays, level, onClose, id, boxRef }: SystemDetailProps) {
  const words = systemWords(row.systemId);
  const icon = SYSTEM_ICONS[row.systemId];
  const value = (valueId: string): DisplayObject | undefined => displays.get(valueId);
  const decision = value(row.decision);
  const overview = (
    <dl className="flex flex-col">
      {words.description === undefined ? null : (
        <DetailRow label={SCOPE.detail.description}>
          <span className="text-(--sov-text-primary)">{words.description}</span>
        </DetailRow>
      )}
      <DetailRow label={SCOPE.detail.inScope}>{decision === undefined ? null : <Value display={decision} label={null} layout="compact" />}</DetailRow>
      <DetailRow label={SCOPE.detail.levels}>
        <RegisterValue display={value(row.levels)} />
      </DetailRow>
      <DetailRow label={SCOPE.detail.equipment}>
        <RegisterValue display={value(row.equipment)} />
      </DetailRow>
      <DetailRow label={SCOPE.detail.zones}>
        <RegisterValue display={value(row.zones)} />
      </DetailRow>
      <DetailRow label={SCOPE.detail.points}>
        <RegisterValue display={value(row.points)} />
      </DetailRow>
    </dl>
  );
  return (
    <div ref={boxRef} data-system-detail={row.systemId}>
      <Inspector
        id={id}
        heading={
          <span className="flex items-center gap-2">
            {icon === undefined ? null : <Icon icon={icon} />}
            <span>{words.title}</span>
          </span>
        }
        closeLabel={copy.workspace.frame.inspectorClose}
        onClose={onClose}
      >
        <Tabs
          key={row.systemId}
          label={SCOPE.detail.tabsLabel}
          tabs={[
            { id: 'overview', label: SCOPE.detail.tabs.overview, panel: overview },
            { id: 'equipment', label: SCOPE.detail.tabs.equipment, panel: <SystemEquipment projectId={projectId} systemId={row.systemId} level={level} /> },
            { id: 'zones', label: SCOPE.detail.tabs.zones, panel: <SystemZones projectId={projectId} systemId={row.systemId} level={level} /> },
          ]}
        />
      </Inspector>
    </div>
  );
}
