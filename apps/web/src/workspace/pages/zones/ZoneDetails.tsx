/**
 * ZONE DETAILS and the zone editor (DB-20; PRD R-061; US-ZONES-03, US-ZONES-04; UD-09; dashboards 7.1.1-C6, C8, L1):
 * the right inspector of the Zones page, opened from a row (its open button, a click on the row, or the row menu).
 *
 * - **Overview** (US-ZONES-03 AC1, AC2): the zone's floor, area (with its basis, the served measure label: rule 8),
 *   type and description (a text value with its source, US-ZONES-03 AC1; Unknown while the field is not registered;
 *   shown as data, never read as an instruction, rule 14; V-9) through the value component, each with its badge and
 *   source line; its systems as their recorded scope decisions, the same display objects System Scope shows (G2-7),
 *   read-only here (System Scope is the scope's only editor after Generate), a life-safety system's carrying its
 *   monitoring-only text (rule 11; 7.1.1-L1; R-051 "on every surface that shows it"), decided by the `lifeSafety` flag
 *   the API served with the decision, as System Scope's rows and Topology's groups are, never by a list kept here
 *   (V-6). A zone whose equipment names no system shows the served systems line (Unknown), never an empty list.
 * - **Equipment** (US-ZONES-03 AC3, AC5): the zone's equipment and its points, the served lines ("Not available yet"
 *   naming the asset taxonomy and the point templates while their gates are closed, ADR 0045 decision 2), in one tab:
 *   DB-20's separate "Control Points" tab does not fit the 360px inspector's tab row, and the points are the zone's
 *   equipment's (listed for the design review); "View Equipment in Zone" opens Equipment filtered by the zone
 *   (US-ZONES-03 AC9). No count on a tab (R-017's reading).
 * - **Documents** (US-ZONES-03 AC6): the documents holding the zone's evidence, each by its served file name (a link
 *   to its row on Documents) with its status line.
 * - **Edit Zone** (UD-09; US-ZONES-04): the editor opens inline in the inspector, never a dialog (rule 7). Each field
 *   (code, name, floor, type, area and description, in the served order) shows its value with the actions the API
 *   served on it: Edit opens phase 3's inline editor (../../../wizard/
 *   InlineEditor.tsx), whose Save sends one `fields.edit` naming the candidates the screen showed (rule 4: the
 *   owner's value is added and the shown one gets the owner's rejection, G4-5; on a value SOVITECH verified the field
 *   goes into conflict for the engineer, G4-19), once per press. Nothing is required; Cancel and closing write
 *   nothing (US-ZONES-04 AC5). A field the registry does not declare reads Unknown with no action.
 * - **Not built** (R-061 "Until decided", 7.1-r27; proposals 7.2.9, 7.2.2, 7.2.11): no Alarms, Environment or
 *   Schedules tab, Status field, live reading, photo or swatch.
 *
 * Undesigned states (the editor, the empty Documents tab), per the frontend-design skill within the brand: the
 * editor is an inline panel at the head of the inspector, its fields stacked with the kit's value layout.
 */
import { FileText } from 'lucide-react';
import { useId, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router';
import { Button, InlinePanel, Inspector, Tabs, Value, ValueName, type ValueActionLabels } from '@sovitech/ui';
import type { Action, DisplayObject, ZonesResponse } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import { useFieldWrites } from '../../../review/field-writes';
import { InlineEditor } from '../../../wizard/InlineEditor';
import type { Displays } from '../../../wizard/use-step-view';
import { pagePath } from '../../navigation';
import { SYSTEM_ICONS, systemDescription, systemTitle } from '../system-scope/systems';
import { ActionLink, LINK_CLASS } from '../topology/ViewFilter';

const ZONES = copy.workspace.zones;
const DETAILS = ZONES.details;

type ZoneRow = ZonesResponse['view']['rows'][number];
type ZoneDetail = ZonesResponse['view']['details'][number];
type EditAction = Extract<Action, { kind: 'edit' }>;

const ACTION_LABELS: ValueActionLabels = {
  edit: copy.actions.edit,
  yes: copy.actions.yes,
  looksRight: copy.actions.looksRight,
  somethingWrong: copy.actions.somethingWrong,
};

/** The fixed label of each zone field (the register's column names; the description, not a column, its own: V-9). */
const FIELD_LABELS = {
  code: ZONES.columns.code,
  name: ZONES.columns.name,
  level: ZONES.columns.level,
  kind: ZONES.columns.kind,
  area: ZONES.columns.area,
  description: DETAILS.description,
} as const;

type ZoneField = keyof typeof FIELD_LABELS;

/** The zone field a value id names (`zone:<id>.<code|name|level|kind|area|description>`), for its fixed label. */
function cellOf(valueId: string): ZoneField | undefined {
  const cell = /\.([a-z]+)$/u.exec(valueId)?.[1];
  return cell !== undefined && Object.hasOwn(FIELD_LABELS, cell) ? (cell as ZoneField) : undefined;
}

/** What a value is labelled with: its served measure label (with the area's basis: rule 8), else the field's fixed label, so an Unknown is never unlabelled. */
function labelFor(display: DisplayObject): string | undefined {
  if (display.measure !== undefined) return undefined;
  const cell = cellOf(display.valueId);
  return cell === undefined ? undefined : FIELD_LABELS[cell];
}

/** Equipment filtered by the zone (R-066: reached from "View Equipment in Zone"), keeping the floor selection. */
export function equipmentInZonePath(projectId: string, zoneId: string, level: string | undefined): string {
  const params = new URLSearchParams();
  if (level !== undefined) params.set('level', level);
  params.set('zone', zoneId);
  return `${pagePath(projectId, 'equipment')}?${params.toString()}`;
}

/** One of the zone's values with its label (the served measure label, else the column's name). */
function FieldRow({ valueId, displays, label }: { readonly valueId: string; readonly displays: Displays; readonly label?: string }) {
  const display = displays.get(valueId);
  if (display === undefined) return null;
  const shown = label ?? labelFor(display);
  return <Value display={display} layout="row" {...(shown === undefined ? {} : { label: shown })} />;
}

function Overview({ row, detail, displays }: { readonly row: ZoneRow; readonly detail: ZoneDetail | undefined; readonly displays: Displays }) {
  const headingId = useId();
  const decisions = detail?.systemDecisions ?? [];
  const systemsLine = displays.get(row.systems);
  // The description is one of the zone's fields (the contract's sixth), not a column of its row.
  const description = detail?.fields.find((valueId) => cellOf(valueId) === 'description');
  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex flex-col gap-3">
        <FieldRow valueId={row.level} displays={displays} />
        <FieldRow valueId={row.area} displays={displays} />
        <FieldRow valueId={row.kind} displays={displays} />
        {description === undefined ? null : <FieldRow valueId={description} displays={displays} />}
      </div>
      <div className="flex flex-col gap-2">
        <h3 id={headingId} className="text-[13px] font-semibold text-(--sov-text-primary)">
          {DETAILS.systems}
        </h3>
        {decisions.length === 0 ? (
          systemsLine === undefined ? null : (
            <Value display={systemsLine} layout="bare" />
          )
        ) : (
          <ul aria-labelledby={headingId} className="flex flex-col gap-2">
            {decisions.map((entry) => {
              const decision = displays.get(entry.decision);
              const Glyph = SYSTEM_ICONS[entry.systemId];
              const monitoringOnly = entry.lifeSafety ? systemDescription(entry.systemId) : undefined;
              return (
                <li key={entry.decision} data-life-safety={entry.lifeSafety ? 'true' : 'false'} className="flex flex-col gap-1.5 rounded-(--sov-radius-surface) border border-(--sov-border) px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    {Glyph === undefined ? null : <Glyph size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />}
                    <span data-system-name="" className="text-[14px] font-medium text-(--sov-text-primary)">
                      {systemTitle(entry.systemId)}
                    </span>
                  </span>
                  {decision === undefined ? null : <Value display={decision} label={null} layout="compact" />}
                  {monitoringOnly === undefined ? null : <p className="text-[13px] leading-5 text-(--sov-text-primary)">{monitoringOnly}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Documents({ projectId, detail, displays }: { readonly projectId: string; readonly detail: ZoneDetail | undefined; readonly displays: Displays }) {
  const documents = detail?.documents ?? [];
  if (documents.length === 0) return <p className="pt-4 text-[14px] text-(--sov-text-tertiary)">{DETAILS.noDocuments}</p>;
  return (
    <ul aria-label={DETAILS.documentsLabel} className="flex flex-col pt-2">
      {documents.map((document) => {
        const name = displays.get(document.fileName);
        const status = displays.get(document.status);
        const to = `${pagePath(projectId, 'documents')}?${new URLSearchParams({ document: document.documentId }).toString()}`;
        return (
          <li key={document.documentId} className="flex flex-col gap-1 border-b border-(--sov-border) py-3 last:border-b-0">
            <Link to={to} className={`${LINK_CLASS} items-start no-underline hover:underline`}>
              <FileText size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{name === undefined ? null : <ValueName display={name} />}</span>
            </Link>
            {status === undefined ? null : <Value display={status} layout="bare" />}
          </li>
        );
      })}
    </ul>
  );
}

interface ZoneEditorProps {
  readonly projectId: string;
  readonly detail: ZoneDetail;
  readonly displays: Displays;
  readonly onClose: () => void;
  readonly onChanged: () => Promise<void>;
}

/** UD-09: the zone's fields with the owner's actions on them; one write per press. */
function ZoneEditor({ projectId, detail, displays, onClose, onChanged }: ZoneEditorProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const writes = useFieldWrites(projectId, onChanged);
  const onAction = (valueId: string) => (action: Action) => {
    if (action.kind === 'edit') setEditing(valueId);
    else if (action.kind === 'confirm') void writes.confirm(action.candidateId);
    else if (action.kind === 'acknowledge') void writes.acknowledge(action.candidateIds);
    else if (action.kind === 'concern') void writes.concern(action.candidateId);
  };
  return (
    <InlinePanel heading={ZONES.editor.heading} headingLevel={3} closeLabel={ZONES.editor.close} onClose={onClose}>
      <p className="mt-2 text-[13px] leading-5 text-(--sov-text-tertiary)">{ZONES.editor.explain}</p>
      <ul className="mt-4 flex flex-col gap-4">
        {detail.fields.map((valueId) => {
          const display = displays.get(valueId);
          if (display === undefined) return null;
          const cell = cellOf(valueId);
          const edit = (display.actions ?? []).find((action): action is EditAction => action.kind === 'edit');
          const label = labelFor(display);
          return (
            <li key={valueId} data-zone-field={cell ?? valueId} className="flex flex-col gap-3">
              <Value display={display} layout="stack" onAction={onAction(valueId)} actionLabels={ACTION_LABELS} busy={writes.busy} {...(label === undefined ? {} : { label })} />
              {editing === valueId && edit !== undefined ? (
                <InlineEditor
                  projectId={projectId}
                  action={edit}
                  display={display}
                  label={display.measure?.label ?? (cell === undefined ? '' : FIELD_LABELS[cell])}
                  onSaved={() => {
                    setEditing(null);
                    void onChanged();
                  }}
                  onCancel={() => setEditing(null)}
                  onStale={() => void onChanged()}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {writes.error === null ? null : (
        <p role="alert" className="mt-3 text-[13px] text-(--sov-text-primary)">
          {writes.error}
        </p>
      )}
    </InlinePanel>
  );
}

export interface ZoneDetailsProps {
  readonly projectId: string;
  readonly row: ZoneRow;
  readonly detail: ZoneDetail | undefined;
  readonly displays: Displays;
  readonly level: string | undefined;
  /** The editor is open (UD-09). */
  readonly editing: boolean;
  readonly onEditing: (open: boolean) => void;
  readonly onClose: () => void;
  /** Reads the register again after a write. */
  readonly onChanged: () => Promise<void>;
  readonly inspectorId: string;
  /** The inspector's element, so the page can move the focus into it. */
  readonly boxRef: RefObject<HTMLDivElement | null>;
}

export function ZoneDetails({ projectId, row, detail, displays, level, editing, onEditing, onClose, onChanged, inspectorId, boxRef }: ZoneDetailsProps) {
  const editButton = useRef<HTMLDivElement | null>(null);
  const code = displays.get(row.code);
  const name = displays.get(row.name);
  const equipment = detail === undefined ? undefined : displays.get(detail.equipment);
  const points = detail === undefined ? undefined : displays.get(detail.points);
  const toEquipment = equipmentInZonePath(projectId, row.zoneId, level);

  // Each zone's details start on Overview (the page keys this component with the zone).
  const [tab, setTab] = useState('overview');

  const closeEditor = () => {
    onEditing(false);
    editButton.current?.querySelector('button')?.focus();
  };

  return (
    <div ref={boxRef} data-zone-details={row.zoneId}>
      <Inspector
        id={inspectorId}
        heading={DETAILS.heading}
        subheading={
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {code === undefined ? null : <ValueName display={code} showBadge={false} />}
            {name === undefined ? null : <ValueName display={name} showBadge={false} />}
          </span>
        }
        closeLabel={DETAILS.close}
        onClose={onClose}
        footer={<ActionLink to={toEquipment}>{DETAILS.viewEquipment}</ActionLink>}
      >
        <div className="flex flex-col gap-4">
          {detail === undefined ? null : (
            <div ref={editButton}>
              <Button variant="primary" aria-expanded={editing} onClick={() => onEditing(!editing)}>
                {DETAILS.edit}
              </Button>
            </div>
          )}
          {editing && detail !== undefined ? <ZoneEditor projectId={projectId} detail={detail} displays={displays} onClose={closeEditor} onChanged={onChanged} /> : null}
          <Tabs
            label={DETAILS.tabsLabel}
            selected={tab}
            onChange={setTab}
            tabs={[
              {
                id: 'overview',
                label: DETAILS.tabs.overview,
                panel: <Overview row={row} detail={detail} displays={displays} />,
              },
              {
                id: 'equipment',
                label: DETAILS.tabs.equipment,
                panel: (
                  <div className="flex flex-col items-start gap-4 pt-4">
                    {equipment === undefined ? null : <Value display={equipment} label={DETAILS.equipment} layout="stack" />}
                    {points === undefined ? null : <Value display={points} label={DETAILS.points} layout="stack" />}
                    <ActionLink to={toEquipment}>{DETAILS.viewEquipment}</ActionLink>
                  </div>
                ),
              },
              {
                id: 'documents',
                label: DETAILS.tabs.documents,
                panel: <Documents projectId={projectId} detail={detail} displays={displays} />,
              },
            ]}
          />
        </div>
      </Inspector>
    </div>
  );
}
