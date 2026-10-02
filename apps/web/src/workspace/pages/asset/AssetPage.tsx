/**
 * The asset record (UD-08; PRD R-067, R-068; US-ASSETS-07, US-ASSETS-08, US-ASSETS-09, US-ASSETS-11 AC1), opened from
 * an Equipment row's "›" or the inspector's "Open the full record".
 *
 * - **Title:** the tag as written (bound, From document), the page's one heading of level 1; the document title is
 *   "Equipment record – SOVITECH" (no tag, no digit: WCAG 2.4.2 with the render test).
 * - **Details:** every value of the asset through the Value component with its badge and source line, its excerpt on
 *   demand, and the owner's "Looks right" and "Something's wrong" where the API serves them (`owner_acknowledged`
 *   only; a note to the engineer queue). No Edit and no control of any kind on the asset: every asset is treated as
 *   possibly life-safety (prompt 3 5.2; rule 11). A value no source holds reads Unknown, never blank, a dash or zero
 *   (US-ASSETS-07 AC9). Ratings, configuration and interface show here once their fields are registered (ADR 0045).
 * - **Points:** "Not available yet: SOVITECH point templates" (R-067), never a count.
 * - **Where it was found:** each place the asset is written, with the document's name as served (G2-14), its stage
 *   and its revision as recorded, the tag as written there with its source line (page, sheet or cell), and the
 *   excerpt word for word on demand; "[erased]" after erasure (rule 13; G13-3).
 * - **Documents:** the documents that show it now, with their status lines (rule 12).
 * - **History:** each recorded field's values, oldest first, each through the Value component as the API resolved it
 *   (its own badge and source line, so an inference reads Possible or Likely, and a withdrawn value carries 2.8's
 *   "Source document removed"; the level by the level register's label, the zone by its name: V-3, A-8), with the
 *   role that wrote each and when (never a person's name: proposals 7.2.6, 7.2.26). Candidate events are not listed
 *   yet (their words would be new history wording; listed for the design review).
 * - No live status, reading, alarm, last update, "Open in BMS", photo or model (R-068; 7.1-r27; proposal 7.2.9).
 * - **States:** loading, failed (Try again), and not in this project's register (rule 13: another project's asset
 *   reads as none). "← Back to Equipment" opens the register.
 *
 * Undesigned (UD-08), drawn per the frontend-design skill within the brand: the approved title slot, then two columns
 * of hairline-ruled sections in the group-heading role, the details and the places on the left where the eye starts,
 * the documents and the history on the right; no cards, no fills.
 */
import { ArrowLeft } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { CalendarDate, Icon, Value, ValueName } from '@sovitech/ui';
import { UUID_PATTERN, type AssetResponse } from '@sovitech/view-model/browser';
import { ApiError } from '../../../api/client';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { useFieldWrites } from '../../../review/field-writes';
import { useWizard } from '../../../wizard/WizardProvider';
import type { Displays } from '../../../wizard/use-step-view';
import { pagePath } from '../../navigation';
import { useWorkspaceView } from '../../use-workspace';
import { AssetDocuments, AssetFields, DetailRow, fieldLabelOf } from '../equipment/asset-parts';
import { RegisterValue } from '../equipment/register-values';

const ASSET = copy.workspace.asset;
const ROLES: Readonly<Record<string, string | undefined>> = ASSET.roles;

function Section({ heading, children }: { readonly heading: string; readonly children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-(--sov-border) pt-5">
      <h2 id={id} className="sov-heading-group">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function Evidence({ evidence, displays }: { readonly evidence: AssetResponse['view']['evidence']; readonly displays: Displays }) {
  if (evidence.length === 0) return <p className="text-[14px] text-(--sov-text-tertiary)">{ASSET.noEvidence}</p>;
  return (
    <ul aria-label={ASSET.evidenceList} className="flex flex-col">
      {evidence.map((entry) => {
        const name = displays.get(entry.fileName);
        const written = displays.get(entry.display);
        return (
          <li key={entry.display} className="flex flex-col gap-1 border-b border-(--sov-border) py-3 last:border-b-0">
            <dl className="flex flex-col">
              <DetailRow label={ASSET.evidence.document}>{name === undefined ? null : <ValueName display={name} />}</DetailRow>
              <DetailRow label={ASSET.evidence.stage}>
                <RegisterValue display={displays.get(entry.stage)} />
              </DetailRow>
              <DetailRow label={ASSET.evidence.version}>
                <RegisterValue display={displays.get(entry.revision)} />
              </DetailRow>
              <DetailRow label={ASSET.evidence.written}>{written === undefined ? null : <Value display={written} layout="bare" evidenceLabel={copy.review.showExcerpt} />}</DetailRow>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

function History({ history, displays }: { readonly history: AssetResponse['view']['history']; readonly displays: Displays }) {
  if (history.length === 0) return <p className="text-[14px] text-(--sov-text-tertiary)">{ASSET.noValues}</p>;
  return (
    <div className="flex flex-col gap-5">
      {history.map((field) => {
        const label = fieldLabelOf(field.field, displays.get(field.field));
        return (
          <table key={field.field} className="w-full border-collapse text-[14px]">
            <caption className="pb-2 text-left text-[14px] font-semibold text-(--sov-text-primary)">{label}</caption>
            <thead>
              <tr className="border-b border-(--sov-border) text-left text-(--sov-text-tertiary)">
                <th scope="col" className="py-2 pr-4 font-normal">
                  {ASSET.historyColumns.value}
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  {ASSET.historyColumns.role}
                </th>
                <th scope="col" className="py-2 font-normal">
                  {ASSET.historyColumns.when}
                </th>
              </tr>
            </thead>
            <tbody>
              {field.entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-2 text-(--sov-text-tertiary)">
                    {ASSET.noHistory}
                  </td>
                </tr>
              ) : (
                field.entries.map((entry) => {
                  const value = displays.get(entry.display);
                  return (
                    <tr key={entry.display} className="border-b border-(--sov-border) align-top last:border-b-0">
                      <td className="py-2 pr-4">{value === undefined ? null : <Value display={value} layout="bare" />}</td>
                      <td className="py-2 pr-4 text-(--sov-text-primary)">{ROLES[entry.role] ?? entry.role}</td>
                      <td className="py-2 text-(--sov-text-primary)">
                        <CalendarDate date={new Date(entry.at)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}

function Record({ data, displays, onChanged }: { readonly data: AssetResponse; readonly displays: Displays; readonly onChanged: () => Promise<void> }) {
  const { projectId } = useWizard();
  const writes = useFieldWrites(projectId, onChanged);
  const view = data.view;
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-6 xl:grid-cols-2" data-asset-record={view.assetId}>
      <div className="flex min-w-0 flex-col gap-6">
        <Section heading={ASSET.sections.fields}>
          <AssetFields fields={[view.tag, ...view.fields]} displays={displays} writes={writes} />
        </Section>
        <Section heading={ASSET.sections.points}>
          <RegisterValue display={displays.get(view.points)} />
        </Section>
        <Section heading={ASSET.sections.evidence}>
          <Evidence evidence={view.evidence} displays={displays} />
        </Section>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Section heading={ASSET.sections.documents}>
          <AssetDocuments documents={view.documents} displays={displays} />
        </Section>
        <Section heading={ASSET.sections.history}>
          <History history={view.history} displays={displays} />
        </Section>
      </div>
    </div>
  );
}

export function AssetPage() {
  const { projectId } = useWizard();
  const params = useParams();
  const assetId = params.assetId !== undefined && UUID_PATTERN.test(params.assetId) ? params.assetId : 'not-an-asset';
  const { state, data, displays, reload } = useWorkspaceView('workspace.asset', { params: { assetId } });
  const tag = data === undefined ? undefined : displays.get(data.view.tag);
  const missing = state.status === 'failed' && data === undefined && state.error instanceof ApiError && (state.error.status === 404 || state.error.status === 400);

  // A focus the page moves itself (WCAG 2.4.3): the page's main region when it opens.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="sov-page-header">
        <Link className="sov-page-header__back" to={pagePath(projectId, 'equipment')}>
          <Icon icon={ArrowLeft} size="small" />
          <span>{copy.workspace.back.equipment}</span>
        </Link>
        <div className="sov-page-header__row">
          <div className="sov-page-header__titles">
            <h1 className="sov-page-header__title [&_.sov-badge]:align-middle [&_.sov-badge]:tracking-normal [&_.sov-value-name]:inline-flex [&_.sov-value-name]:flex-wrap [&_.sov-value-name]:items-center [&_.sov-value-name]:gap-3">{tag === undefined ? copy.titles.asset : <ValueName display={tag} />}</h1>
            <p className="sov-page-header__subtitle">{ASSET.subtitle}</p>
          </div>
        </div>
      </header>
      {state.status === 'loading' && data === undefined ? (
        <div className="border-t border-(--sov-border) py-5" data-loading-frame="asset">
          <Loading label={copy.app.loading} align="start" />
        </div>
      ) : null}
      {missing ? (
        <p role="alert" className="text-[15px] text-(--sov-text-primary)">
          {ASSET.notFound}
        </p>
      ) : null}
      {state.status === 'failed' && data === undefined && !missing ? <LoadFailed message={ASSET.loadFailed} onRetry={() => void reload()} /> : null}
      {data === undefined ? null : <Record data={data} displays={displays} onChanged={() => reload({ quiet: true })} />}
    </div>
  );
}
