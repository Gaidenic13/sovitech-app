/**
 * The stored preliminary proposal (UD-06; PRD R-110 to R-113, R-115, R-116 "Until decided", R-127; US-PROPOSAL-03,
 * US-PROPOSAL-04, US-PROPOSAL-05 AC1, US-PROPOSAL-06, US-PROPOSAL-08, US-PROPOSAL-10, US-PROPOSAL-11 AC3,
 * US-PROPOSAL-13; the contract's `proposals.view`; docs/adr/0048, 0049), read from one snapshot, as generated.
 *
 * Undesigned (dashboards 8.10, D-06): drawn per the frontend-design skill within the brand's dark variant. A proposal
 * is a document to read, so the page reads like one: the head says where the proposal stands, then one column of
 * hairline-ruled sections, each a heading and its rows (a name on the left, its served value on the right), with the
 * versions in a narrow rail beside it. The one bold element is the head's investment figure in the page-title role;
 * everything else stays quiet: no card grid, no fill but the brand surface, no colour but the brand's.
 *
 * - **The head** (UD-01's content, R-116 "Until decided": no separate Overview page; rule 10 stage 2): the investment
 *   output that carries the stage through the one Price component, its stage label read from stored records (never a
 *   parameter: R-127, G10-9), as a range or "Not available yet" naming what is missing with the owner's Add action
 *   (G7-2b); "Superseded: inputs changed on <date>" beside it where a stored quotation record went stale (G10-2);
 *   the open items' count, "<n> things for you to check", with the way to them (rule 7: the items themselves appear
 *   once, in "What we still need"); "Still reading <n> files. Your estimate will update when they finish." while
 *   analysis that was running at Generate is still running (rule 7; G7-18), bound. No dialog anywhere.
 * - **The sections**, in the contract's order: Investment (each output named by its served stage label, its
 *   exclusions: G10-7), Control points (by type, never one priced total: G9-3; rule 11's interface points named with
 *   no figure: G11-12), Energy, Operating cost and payback (operating cost, payback, NPV, IRR; no ROI), Measures,
 *   System scope (each system's decision as the snapshot used it, Fire Safety's monitoring-only sentence; the systems
 *   left out are listed once more only under Investment's "Not in scope", named by their system: G10-7, DR-2), Life
 *   safety, what the estimate is based on (the inputs as used, under the snapshot's own value ids: never a newer value,
 *   US-PROPOSAL-03 AC3; one list in the order served: DR-12), "What we still need" (once: rule 7; each item named by
 *   its field, then why it is asked: DR-1), and AI-drafted paragraphs only where the API stored some (none without a
 *   key: R-115), rendered by code with each value token as its own value.
 * - Every Add the API served shows under its line, in served order (DR-1; rule 7; R-012), each described by the name
 *   of the row it sits in (the output's stage label, the indicator, the open item's field), so the same "Add <field>"
 *   under several outputs reads as the one for that output.
 * - Every value through Value, StatusLine, NotAvailableYet or Price (./values.tsx); a figure whose inputs changed
 *   carries the served "Out of date, recalculating" among its lines (2.4; G9-10), and the page adds no wording of its
 *   own to it. Nothing here is a figure the web made.
 * - **Versions** (US-PROPOSAL-11 AC3): every stored version, newest first, each by its generation date (bound), the
 *   one on screen marked; an earlier version says so and links to the latest.
 */
import { Button, StatusLine, Value, ValueName } from '@sovitech/ui';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { DisplayObject, ProposalOutput, ProposalResponse } from '@sovitech/view-model/browser';
import { copy } from '../copy';
import { systemTitle } from '../workspace/pages/system-scope/systems';
import type { Displays } from '../wizard/use-step-view';
import { ProposalPrice, Shown, isNotAvailable, separateStage, type AddAction } from './values';

type View = ProposalResponse['view'];
type OpenItems = View['whatWeStillNeed'];

const OUTPUT_NAMES: Readonly<Record<string, string | undefined>> = copy.outputs;
const REASON_HEADINGS: Readonly<Partial<Record<string, string>>> = copy.step8.forYouReason;

/** The path of a stored version (`/projects/:projectId/proposals/:snapshotId`). */
export function versionPath(projectId: string, snapshotId: string): string {
  return `/projects/${projectId}/proposals/${snapshotId}`;
}

/** The landing (`/projects/:projectId/proposal`): the latest stored version. */
export function landingPath(projectId: string): string {
  return `/projects/${projectId}/proposal`;
}

/** The id of the "What we still need" section, the target of the head's link. */
export const WHAT_WE_STILL_NEED_ID = 'proposal-what-we-still-need';

function Section({ heading, intro, children, id }: { readonly heading: string; readonly intro?: string; readonly children: ReactNode; readonly id?: string }) {
  const headingId = useId();
  return (
    <section id={id} tabIndex={id === undefined ? undefined : -1} aria-labelledby={headingId} className="flex scroll-mt-6 flex-col gap-3 focus:outline-none" data-proposal-section="">
      <h2 id={headingId} className="sov-heading-section">
        {heading}
      </h2>
      {intro === undefined ? null : <p className="sov-text-body">{intro}</p>}
      {children}
    </section>
  );
}

/**
 * One row of a section: a name on the left (or none: the value names itself), its value on the right. `nameId` names
 * the name's element, which the row's Add buttons point at (DR-1).
 */
function Row({ name, nameId, children, attributes }: { readonly name?: ReactNode; readonly nameId?: string; readonly children: ReactNode; readonly attributes?: Readonly<Record<string, string>> }) {
  return (
    <li
      className={`${name === undefined ? '' : 'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6'} items-start border-t border-(--sov-border) py-4`}
      {...attributes}
    >
      {name === undefined ? null : (
        <div id={nameId} className="sov-text-body text-(--sov-text-primary) [&>.sov-status-line]:text-(--sov-text-primary)">
          {name}
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </li>
  );
}

function Rows({ children }: { readonly children: ReactNode }) {
  return <ul className="flex list-none flex-col">{children}</ul>;
}

/** An output of a section: an investment output named by its served stage label through Price; any other named by the catalogue. */
function OutputRow({ output, displays, onAdd }: { readonly output: ProposalOutput; readonly displays: Displays; readonly onAdd: (action: AddAction) => void }) {
  const nameId = useId();
  const attributes = { 'data-output': output.output, 'data-availability': output.availability, ...(output.outOfDate ? { 'data-out-of-date': '' } : {}) };
  if (output.price !== null) {
    // Named by its served stage label where the figure does not carry it; with no figure, by the 2.8 stage label the
    // API serves to name it (`label`; G10-11: "named only by 2.8's stage labels ... each with its 'Not available yet'
    // line"); else by what the served figure measures (its `measure` label, the API's words).
    const stage = separateStage(output.price, displays, 'name');
    const label = output.label === undefined ? undefined : displays.get(output.label);
    const measured = displays.get(output.price.figure)?.measure?.label;
    const name = stage !== undefined ? <StatusLine display={stage} /> : label !== undefined ? <StatusLine display={label} /> : measured;
    return (
      <Row attributes={attributes} nameId={nameId} {...(name === undefined ? {} : { name })}>
        <ProposalPrice price={output.price} displays={displays} onAdd={onAdd} {...(name === undefined ? {} : { describedBy: nameId })} />
      </Row>
    );
  }
  return (
    <Row attributes={attributes} nameId={nameId} name={OUTPUT_NAMES[output.output] ?? copy.review.outputUnnamed}>
      <Shown display={displays.get(output.display)} label={null} onAdd={onAdd} describedBy={nameId} />
    </Row>
  );
}

/** What an open item concerns, by the field's own name as served (its measure's label, with its qualifier label). */
function FieldName({ display }: { readonly display: DisplayObject }): ReactNode {
  const measure = display.measure;
  if (measure === undefined) return null;
  if (measure.qualifierLabel === undefined) return measure.label;
  return (
    <>
      {measure.label}
      {', '}
      <span className="sov-field-value__qualifier" data-copy-kind="registry-qualifier">
        {measure.qualifierLabel}
      </span>
    </>
  );
}

/**
 * One open item (DR-1): the field it concerns as its primary text, why the owner is asked ("Your estimate needs this")
 * as its secondary line, then its value as served, and each Add the API served for it, described by the field's name.
 */
function OpenItem({ item, displays, onAdd }: { readonly item: OpenItems['items'][number]; readonly displays: Displays; readonly onAdd: (action: AddAction) => void }) {
  const nameId = useId();
  const display = displays.get(item.concerns);
  const heading = REASON_HEADINGS[item.reason];
  const named = display?.measure !== undefined;
  const adds = display?.actions?.filter((action): action is AddAction => action.kind === 'add') ?? [];
  return (
    <li className="flex flex-col gap-2 rounded-(--sov-radius-surface) border border-(--sov-border) px-4 py-3" data-open-item={item.reason}>
      {!named && heading === undefined ? null : (
        <div className="flex flex-col gap-0.5">
          {display === undefined || !named ? null : (
            <p id={nameId} className="sov-text-body text-(--sov-text-primary)" data-open-item-name="">
              <FieldName display={display} />
            </p>
          )}
          {heading === undefined ? null : (
            <p className="sov-text-small" data-open-item-reason="">
              {heading}
            </p>
          )}
        </div>
      )}
      <Shown display={display} onAdd={onAdd} {...(named ? { label: null, describedBy: nameId } : {})} />
      {/* A value that is not "Not available yet" (which carries its own Adds) still leads to its way in: every served Add. */}
      {adds.length === 0 || display === undefined || isNotAvailable(display) ? null : (
        <div className="sov-value__actions">
          {adds.map((action) => (
            <Button key={action.field.fieldKey} variant="link" icon={Plus} aria-describedby={named ? nameId : undefined} onClick={() => onAdd(action)}>
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}

/** The open items, once (rule 7: "In the proposal document. Open items appear once, in a 'What we still need' section"). */
function OpenItemsBlock({ items, displays, onAdd }: { readonly items: OpenItems; readonly displays: Displays; readonly onAdd: (action: AddAction) => void }) {
  const count = items.count === null ? undefined : displays.get(items.count);
  const more = items.more === null ? undefined : displays.get(items.more);
  return (
    <div className="grid grid-cols-2 items-start gap-10 border-t border-(--sov-border) pt-4">
      <div className="flex flex-col gap-3" data-open-items="owner">
        <h3 className="sov-heading-group">{copy.step8.forYou}</h3>
        {count === undefined ? <p className="sov-text-body">{copy.step8.forYouEmpty}</p> : <StatusLine display={count} />}
        {items.items.length === 0 ? null : (
          <ul className="flex list-none flex-col gap-3">
            {items.items.map((item) => (
              <OpenItem key={item.itemId} item={item} displays={displays} onAdd={onAdd} />
            ))}
          </ul>
        )}
        {more === undefined ? null : <StatusLine display={more} />}
      </div>
      <div className="flex flex-col gap-3" data-open-items="engineer">
        <h3 className="sov-heading-group">{copy.step8.sovitechWillCheck}</h3>
        {items.sovitechWillCheck.length === 0 ? (
          <p className="sov-text-body">{copy.proposal.nothingToCheck}</p>
        ) : (
          <ul className="flex list-none flex-col gap-2">
            {items.sovitechWillCheck.map((valueId) => {
              const display = displays.get(valueId);
              return display === undefined ? null : (
                <li key={valueId}>
                  <StatusLine display={display} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** An indicator's row, named by the catalogue; its Adds point at that name (DR-1). */
function IndicatorRow({ indicator, displays, onAdd }: { readonly indicator: View['indicators'][number]; readonly displays: Displays; readonly onAdd: (action: AddAction) => void }) {
  const nameId = useId();
  return (
    <Row name={copy.proposal.indicators[indicator.indicator]} nameId={nameId} attributes={{ 'data-indicator': indicator.indicator }}>
      <Shown display={displays.get(indicator.display)} label={null} onAdd={onAdd} describedBy={nameId} />
    </Row>
  );
}

/** The head (UD-01's content): where the proposal stands. */
function Head({ view, displays, onAdd }: { readonly view: View; readonly displays: Displays; readonly onAdd: (action: AddAction) => void }) {
  const { headline } = view;
  const stage = separateStage(headline.investment.price, displays, 'headline');
  const count = headline.openItems.count === null ? undefined : displays.get(headline.openItems.count);
  const stillReading = headline.stillReading === null ? undefined : displays.get(headline.stillReading);
  return (
    <section aria-labelledby="proposal-head" className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-10 border-y border-(--sov-border) py-8" data-proposal-head="">
      <div className="flex min-w-0 flex-col gap-3" data-output={headline.investment.output}>
        <h2 id="proposal-head" className="sov-heading-group">
          {copy.proposal.sections.headline}
        </h2>
        {stage === undefined ? null : <StatusLine display={stage} />}
        <ProposalPrice price={headline.investment.price} displays={displays} size="headline" onAdd={onAdd} describedBy="proposal-head" />
      </div>
      <div className="flex min-w-0 flex-col gap-3 border-l border-(--sov-border) pl-10">
        {count === undefined ? <p className="sov-text-body">{copy.step8.forYouEmpty}</p> : <StatusLine display={count} />}
        <div>
          <Button
            variant="link"
            onClick={() => {
              const target = document.getElementById(WHAT_WE_STILL_NEED_ID);
              target?.scrollIntoView?.({ block: 'start' });
              target?.focus({ preventScroll: true });
            }}
          >
            {copy.proposal.seeWhatWeStillNeed}
          </Button>
        </div>
        {stillReading === undefined ? null : <StatusLine display={stillReading} />}
      </div>
    </section>
  );
}

/** The versions rail (US-PROPOSAL-11 AC3): newest first, each by its generation date, the one on screen marked. */
function Versions({ projectId, view, displays }: { readonly projectId: string; readonly view: View; readonly displays: Displays }) {
  return (
    <nav aria-label={copy.proposal.versionsHeading} className="flex flex-col gap-3" data-proposal-versions="">
      <h2 className="sov-heading-group">{copy.proposal.versionsHeading}</h2>
      <ol className="flex list-none flex-col border-t border-(--sov-border)">
        {view.versions.map((version, index) => {
          const date = displays.get(version.generatedOn);
          const current = version.snapshotId === view.snapshotId;
          return (
            <li key={version.snapshotId} className="border-b border-(--sov-border)">
              <Link
                to={versionPath(projectId, version.snapshotId)}
                aria-current={current ? 'page' : undefined}
                className={`flex items-start justify-between gap-3 px-3 py-3 text-[14px] transition-colors duration-150 hover:bg-(--sov-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring) ${current ? 'border-l-2 border-(--sov-accent) bg-(--sov-surface-selected) font-semibold text-(--sov-text-primary)' : 'border-l-2 border-transparent text-(--sov-text-tertiary)'}`}
              >
                <span className="flex min-w-0 flex-col gap-1">
                  {date === undefined ? null : <ValueName display={date} showBadge={false} />}
                  {index === 0 ? <span className="sov-text-caption">{copy.proposal.latestVersion}</span> : null}
                </span>
                {current ? (
                  <span className="flex shrink-0 items-center gap-1 sov-text-caption text-(--sov-text-primary)">
                    <Check size={14} strokeWidth={1.5} aria-hidden="true" focusable="false" />
                    {copy.proposal.versionShown}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface StoredProposalProps {
  readonly projectId: string;
  readonly view: View;
  readonly displays: Displays;
  /** An owner input's Add action: opens step 8's inline ask for that field (R-012 "Until decided"; US-INTAKE-22 AC6). */
  readonly onAdd: (fieldKey: string) => void;
}

/** The stored proposal's head, sections and versions (see the header). The page around it draws the title and its actions. */
export function StoredProposal({ projectId, view, displays, onAdd }: StoredProposalProps) {
  const add = (action: AddAction) => onAdd(action.field.fieldKey);
  const generatedOn = displays.get(view.generatedOn);
  // Rule 11's sentences once each: the interface points are named in the points section (R-112), a system's sentence on
  // its scope row; the life-safety section holds any other (none is left out: each shows somewhere).
  const shownElsewhere = new Set<string>([view.points.interfacePoints, ...view.scope.systems.flatMap((system) => (system.sentence === null ? [] : [system.sentence]))]);
  const lifeSafety = view.lifeSafety.filter((valueId) => !shownElsewhere.has(valueId));
  const rows = (outputs: readonly ProposalOutput[]) => outputs.map((output) => <OutputRow key={output.output} output={output} displays={displays} onAdd={add} />);
  return (
    <div className="flex flex-col gap-8" data-stored-proposal={view.snapshotId}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {generatedOn === undefined ? null : <Value display={generatedOn} label={copy.proposal.generatedOn} layout="compact" />}
      </div>
      {view.latest ? null : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) px-5 py-4" data-earlier-version="">
          <p className="sov-text-body text-(--sov-text-primary)">{copy.proposal.earlierVersion}</p>
          <Link to={landingPath(projectId)} className="sov-button" data-variant="link" data-size="default" data-icon="true" data-copy-kind="action-label">
            <span>{copy.proposal.openLatest}</span>
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
          </Link>
        </div>
      )}
      <Head view={view} displays={displays} onAdd={add} />
      <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-12">
        <div className="flex min-w-0 flex-col gap-12">
          <Section heading={copy.proposal.sections.investment}>
            <Rows>{rows(view.investment.outputs)}</Rows>
            {view.investment.exclusions.length === 0 ? null : (
              <div className="flex flex-col gap-2 pt-2" data-investment-exclusions="">
                <h3 className="sov-heading-group">{copy.proposal.sections.exclusions}</h3>
                <Rows>
                  {view.investment.exclusions.map((valueId) => {
                    // An excluded system's decision as the snapshot used it, named by its system (G10-7).
                    const system = view.scope.systems.find((entry) => entry.decision === valueId);
                    return (
                      <Row key={valueId} {...(system === undefined ? {} : { name: systemTitle(system.systemId) })} attributes={{ 'data-excluded': system?.systemId ?? '' }}>
                        <Shown display={displays.get(valueId)} {...(system === undefined ? {} : { label: null })} />
                      </Row>
                    );
                  })}
                </Rows>
              </div>
            )}
          </Section>
          <Section heading={copy.proposal.sections.points}>
            <Rows>
              {rows(view.points.outputs)}
              <Row attributes={{ 'data-interface-points': '' }}>
                <Shown display={displays.get(view.points.interfacePoints)} />
              </Row>
            </Rows>
          </Section>
          <Section heading={copy.proposal.sections.energy}>
            <Rows>{rows(view.energy.outputs)}</Rows>
          </Section>
          <Section heading={copy.proposal.sections.indicators}>
            <Rows>
              {view.indicators.map((indicator) => (
                <IndicatorRow key={indicator.indicator} indicator={indicator} displays={displays} onAdd={add} />
              ))}
            </Rows>
          </Section>
          <Section heading={copy.proposal.sections.measures}>
            <Rows>{rows(view.measures.outputs)}</Rows>
          </Section>
          <Section heading={copy.proposal.sections.scope}>
            <Rows>
              {view.scope.systems.map((system) => {
                const sentence = system.sentence === null ? undefined : displays.get(system.sentence);
                return (
                  <Row
                    key={system.systemId}
                    attributes={{
                      'data-system': system.systemId,
                      ...(system.lifeSafety ? { 'data-life-safety': '' } : {}),
                      ...(view.scope.exclusions.includes(system.systemId) ? { 'data-excluded': '' } : {}),
                    }}
                    name={
                      <div className="flex flex-col gap-1">
                        <span>{systemTitle(system.systemId)}</span>
                        {sentence === undefined ? null : sentence.kind === 'line' ? <StatusLine display={sentence} size="small" /> : <Shown display={sentence} />}
                      </div>
                    }
                  >
                    <Shown display={displays.get(system.decision)} label={null} onAdd={add} />
                  </Row>
                );
              })}
            </Rows>
          </Section>
          {lifeSafety.length === 0 ? null : (
            <Section heading={copy.proposal.sections.lifeSafety}>
              <ul className="flex list-none flex-col gap-3 border-t border-(--sov-border) pt-4">
                {lifeSafety.map((valueId) => (
                  <li key={valueId}>
                    <Shown display={displays.get(valueId)} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section heading={copy.proposal.sections.basis} intro={copy.proposal.basisIntro}>
            {view.basis.length === 0 ? (
              <p className="sov-text-body border-t border-(--sov-border) pt-4">{copy.proposal.basisNone}</p>
            ) : (
              // One list in the order served (DR-12): each input's name on the left, its value with its badge right-aligned,
              // so every row and its hairline line up. The row layout draws its own padding and hairline (step 3's list).
              <ul className="flex list-none flex-col border-t border-(--sov-border)" data-proposal-basis="">
                {view.basis.map((valueId) => (
                  <li key={valueId} className="min-w-0">
                    <Shown display={displays.get(valueId)} layout="row" onAdd={add} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section heading={copy.proposal.sections.whatWeStillNeed} id={WHAT_WE_STILL_NEED_ID}>
            <OpenItemsBlock items={view.whatWeStillNeed} displays={displays} onAdd={add} />
          </Section>
          {view.drafted.length === 0 ? null : (
            <Section heading={copy.proposal.sections.drafted}>
              <div className="flex flex-col gap-4 border-t border-(--sov-border) pt-4">
                {view.drafted.map((paragraph) => (
                  <p key={paragraph.slot} className="sov-text-body max-w-[72ch]" data-drafted={paragraph.slot}>
                    {paragraph.segments.map((segment, index) => {
                      if (segment.kind === 'prose') return <span key={`prose-${String(index)}`}>{segment.text}</span>;
                      const display = displays.get(segment.valueId);
                      return display === undefined ? null : <ValueName key={`value-${String(index)}`} display={display} />;
                    })}
                  </p>
                ))}
              </div>
            </Section>
          )}
        </div>
        <div className="sticky top-6 flex flex-col gap-8">
          <Versions projectId={projectId} view={view} displays={displays} />
        </div>
      </div>
    </div>
  );
}
