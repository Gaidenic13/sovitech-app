/**
 * The printed preliminary proposal (phase 5, the print builder; PRD R-118; US-REPORTS-01 to US-REPORTS-03; the
 * contract's `proposals.print`; docs/adr/0050-exports-print-route-and-pdf.md decision 1): what the print route shows
 * and the API prints to PDF, read from one stored snapshot as the API served it, with no action anywhere (paper has
 * no button).
 *
 * - **On every page** of the demo project: the demo line, repeated at the top of each printed page by the kit's
 *   PrintFrame (rule 10, "Labelled everywhere"; G10-13); on any other project, none (G10-10).
 * - **The cover**: "Preliminary proposal", the subtitle, the project's name (bound), the generation date (bound), and,
 *   for an earlier version, that it is kept as it was generated (US-PROPOSAL-11 AC3). No logo until the approver
 *   accepts the render test's review entry for `logo.svg` (ADR 0050 decision 7; proposal P-5-PRINT-LOGO-UNREADABLE),
 *   and never a typeset wordmark in its place (OD-2); no photo, tagline or "CONFIDENTIAL" (7.2.9, 7.1.1-E1).
 * - **The proposal's sections**, in the stored proposal's order (docs/adr/0049 decision 4): where it stands (the
 *   investment output that carries the stage, through the Price component reading the stage the server derived from
 *   stored records: rule 10; "Still reading <n> files…": rule 7); investment, with the systems not in scope listed
 *   once under their own sub-heading, each named by its system, as the stored proposal names them (G10-7); control
 *   points by type with rule 11's interface points named; energy; operating cost and payback; measures; the systems
 *   in scope; life safety, only for a rule 11 sentence no other section printed (each prints once, as on screen:
 *   G2-7); what the estimate is based on (the inputs as the snapshot used them, a compact two-column table: DR-12);
 *   and AI-drafted paragraphs when there are any (prose with value tokens rendered as their values, R-115). Each value
 *   through the kit (Value, Price, "Not available yet", StatusLine) with its one badge on its figure's line and its
 *   range, source line and status lines inline (2.8 "Prominence"; G10-5); every missing value as its missing wording,
 *   never 0, a dash or a blank (rule 1).
 * - **The appendix**, on a new page: every value the proposal shows, one row each across the page, each with its source
 *   line, its badge as its verification and, for calculated and estimated values, the method lines the server serves
 *   (formula, version, assumptions, range: rule 9), its evidence excerpts printed in full, as stored ("[erased]" after
 *   erasure, G13-12); then "What we still need", the open items, once (rule 7, "In the proposal document. Open items
 *   appear once"; 2.8 "Prominence": the appendix lists "the open items"). The headline does not repeat them.
 * - **One name per value** (`valueNames`): wherever a row lists a value, the body and the appendix name it the same way
 *   (an output by the catalogue, an investment output with no figure by the 2.8 stage label the server serves to name
 *   it, an indicator by the catalogue, an input by what it measures, as the server serves it). Only the systems' rows
 *   under their own headings (the systems in scope, those not in scope) are named by the system alone, as the stored
 *   proposal names them.
 *
 * Fixed copy from the catalogue (`print.*`, `proposal.*`, `outputs.*`, `systems.*`, `step8.*`); everything else from
 * the display objects. A value id the view names with no display object is left out, never invented.
 */
import { Price, PrintFrame, PrintValue, StatusLine, ValueName } from '@sovitech/ui';
import type { DisplayObject, ProposalOutput, ProposalPrintResponse } from '@sovitech/view-model/browser';
import type { ReactNode } from 'react';
import { copy } from '../../copy';
import { indexDisplays, type Displays } from '../../wizard/use-step-view';
import './print.css';

const OUTPUT_NAMES: Readonly<Record<string, string | undefined>> = copy.outputs;
const SYSTEM_NAMES: Readonly<Record<string, { readonly title: string } | undefined>> = copy.systems;
const REASONS: Readonly<Record<string, string | undefined>> = copy.step8.forYouReason;

type Proposal = ProposalPrintResponse['view']['proposal'];
type OpenItems = ProposalPrintResponse['view']['appendix']['openItems'];
type Segments = Proposal['drafted'][number]['segments'];
/** What a row names a value by: nothing where the value element names itself (a line, a figure with its stage). */
type NameOf = (valueId: string) => ReactNode | undefined;

export interface PrintDocumentProps {
  /** The print view as the API served it (`proposals.print`). */
  readonly response: ProposalPrintResponse;
}

/** A served value by its id, printed; nothing when the view names an id it was not served. */
function Shown({ displays, id, label }: { readonly displays: Displays; readonly id: string; readonly label?: ReactNode }) {
  const display = displays.get(id);
  if (display === undefined) return null;
  return <PrintValue display={display} {...(label === undefined ? {} : { label })} />;
}

/** A row: the value's name, then its element; or the element alone where it names itself. */
function Row({ name, children, attributes }: { readonly name?: ReactNode; readonly children: ReactNode; readonly attributes?: Readonly<Record<string, string>> }) {
  return (
    <li className="sov-print__row" {...attributes}>
      {name === undefined ? null : <div className="sov-print__name">{name}</div>}
      <div>{children}</div>
    </li>
  );
}

/** A section with its heading. */
function Section({ id, heading, children }: { readonly id: string; readonly heading: string; readonly children: ReactNode }) {
  return (
    <section className="sov-print__section" aria-labelledby={`print-${id}`} data-print-section={id}>
      <h2 id={`print-${id}`}>{heading}</h2>
      {children}
    </section>
  );
}

/** A catalogue system's name ("Fire Safety"), for the rows the systems' own headings introduce. */
function systemName(systemId: string): string | undefined {
  return SYSTEM_NAMES[systemId]?.title;
}

/**
 * What the served value measures (rule 8, "Every value states what it measures"), as the kit's Value names it by
 * default: the measure's label, then its qualifier label after a comma, the qualifier marked as the registry's text.
 */
function measureName(display: DisplayObject): ReactNode | undefined {
  const measure = display.measure;
  if (measure === undefined) return undefined;
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
 * The one naming of the document's rows (DR-12): an output by the catalogue; an investment output with no figure by the
 * 2.8 stage label the server serves to name it (G10-11), and one with a figure by nothing (its Price shows the stage
 * the server read from stored records); an indicator by the catalogue; any other value, an input as the snapshot used
 * it, by what it measures, as served. The body and the appendix both name through it, so a value reads the same in
 * both.
 */
function valueNames(proposal: Proposal, displays: Displays): NameOf {
  const names = new Map<string, ReactNode | undefined>();
  for (const output of [...proposal.investment.outputs, ...proposal.points.outputs, ...proposal.energy.outputs, ...proposal.measures.outputs]) {
    if (output.price === null) {
      names.set(output.display, OUTPUT_NAMES[output.output] ?? copy.review.outputUnnamed);
      continue;
    }
    const label = output.label === undefined ? undefined : displays.get(output.label);
    names.set(output.display, label === undefined ? undefined : <StatusLine display={label} />);
  }
  for (const entry of proposal.indicators) names.set(entry.display, copy.proposal.indicators[entry.indicator]);
  return (valueId) => {
    if (names.has(valueId)) return names.get(valueId);
    const display = displays.get(valueId);
    return display === undefined ? undefined : measureName(display);
  };
}

/** An investment output through the one Price component (rule 10: the stage only from stored records). */
function PriceRow({ displays, output, nameOf }: { readonly displays: Displays; readonly output: ProposalOutput; readonly nameOf: NameOf }) {
  const price = output.price;
  const figure = displays.get(price?.figure ?? output.display);
  if (figure === undefined) return null;
  const superseded = price?.superseded === null || price?.superseded === undefined ? undefined : displays.get(price.superseded);
  const name = nameOf(output.display);
  return (
    <Row {...(name === undefined ? {} : { name })}>
      <Price display={figure} {...(superseded === undefined ? {} : { superseded })} />
    </Row>
  );
}

/** An output that is not an investment figure: named by the catalogue, its display beside it. */
function OutputRow({ displays, output, nameOf }: { readonly displays: Displays; readonly output: ProposalOutput; readonly nameOf: NameOf }) {
  if (output.price !== null) return <PriceRow displays={displays} output={output} nameOf={nameOf} />;
  if (!displays.has(output.display)) return null;
  return (
    <Row name={nameOf(output.display)}>
      <Shown displays={displays} id={output.display} label={null} />
    </Row>
  );
}

function OutputRows({ displays, outputs, nameOf, children }: { readonly displays: Displays; readonly outputs: readonly ProposalOutput[]; readonly nameOf: NameOf; readonly children?: ReactNode }) {
  return (
    <ul className="sov-print__rows">
      {outputs.map((output) => (
        <OutputRow key={output.output} displays={displays} output={output} nameOf={nameOf} />
      ))}
      {children}
    </ul>
  );
}

/** Value ids that each name themselves (a line, a value with its measure's label), one row each. */
function ValueRows({ displays, ids }: { readonly displays: Displays; readonly ids: readonly string[] }) {
  return (
    <ul className="sov-print__rows">
      {ids
        .filter((id) => displays.has(id))
        .map((id) => (
          <Row key={id}>
            <Shown displays={displays} id={id} />
          </Row>
        ))}
    </ul>
  );
}

/**
 * What the estimate is based on, as a compact two-column table (DR-12): each input's name in the first column and its
 * element in the second, the badge on its figure's line and its source and status lines under it. A value with no
 * name (a line) takes the whole row.
 */
function BasisTable({ displays, ids, nameOf }: { readonly displays: Displays; readonly ids: readonly string[]; readonly nameOf: NameOf }) {
  return (
    <ul className="sov-print__table">
      {ids.map((id) => {
        const display = displays.get(id);
        if (display === undefined) return null;
        const name = nameOf(id);
        return (
          <li key={id} className="sov-print__table-row">
            {name === undefined ? null : <div className="sov-print__name">{name}</div>}
            <div className="sov-print__cell" data-whole-row={name === undefined ? 'true' : undefined}>
              <PrintValue display={display} label={null} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The appendix's rows: every value the proposal shows, across the page's width (a figure, its range and its badge on
 * one line), each named as the body names it (`valueNames`), with its source line, its badge, its method lines and its
 * excerpts in full; an investment figure through the Price component.
 */
function AppendixRows({ displays, ids, nameOf, prices }: { readonly displays: Displays; readonly ids: readonly string[]; readonly nameOf: NameOf; readonly prices: ReadonlySet<string> }) {
  return (
    <ul className="sov-print__rows">
      {ids.map((id) => {
        const display = displays.get(id);
        if (display === undefined) return null;
        const name = nameOf(id);
        return (
          <Row key={id} {...(name === undefined ? {} : { name })}>
            {prices.has(id) ? <Price display={display} /> : <PrintValue display={display} label={null} excerpts />}
          </Row>
        );
      })}
    </ul>
  );
}

/** "What we still need": the open items once (rule 7), each with who acts, as step 8 plans them. */
function OpenItemsList({ displays, items }: { readonly displays: Displays; readonly items: OpenItems }) {
  const forYou = items.items.filter((item) => displays.has(item.concerns));
  const engineer = items.sovitechWillCheck.filter((id) => displays.has(id));
  const count = items.count === null ? undefined : displays.get(items.count);
  const more = items.more === null ? undefined : displays.get(items.more);
  const nothing = forYou.length === 0 && engineer.length === 0 && count === undefined;
  return (
    <>
      <h3>{copy.step8.forYou}</h3>
      {count === undefined ? null : <StatusLine display={count} />}
      {nothing || forYou.length === 0 ? (
        <p className="sov-print__lead">{copy.step8.forYouEmpty}</p>
      ) : (
        <ul className="sov-print__rows">
          {forYou.map((item) => {
            const reason = REASONS[item.reason];
            return (
              <Row key={item.itemId}>
                {reason === undefined ? null : <p className="sov-print__reason">{reason}</p>}
                <Shown displays={displays} id={item.concerns} />
              </Row>
            );
          })}
        </ul>
      )}
      {more === undefined ? null : <StatusLine display={more} />}
      {engineer.length === 0 ? null : (
        <>
          <h3>{copy.step8.sovitechWillCheck}</h3>
          <ValueRows displays={displays} ids={engineer} />
        </>
      )}
    </>
  );
}

/** An AI-drafted paragraph: its prose as stored (the validator refused any digit), each token as its value (R-115). */
function Drafted({ displays, segments }: { readonly displays: Displays; readonly segments: Segments }) {
  return (
    <p className="sov-print__drafted">
      {segments.map((segment, index) => {
        if (segment.kind === 'prose') return <span key={`prose-${String(index)}`}>{segment.text}</span>;
        const display: DisplayObject | undefined = displays.get(segment.valueId);
        return display === undefined ? null : <ValueName key={`value-${String(index)}`} display={display} />;
      })}
    </p>
  );
}

export function PrintDocument({ response }: PrintDocumentProps) {
  const displays = indexDisplays(response.displayObjects);
  const { proposal, cover, appendix } = response.view;
  const sections = copy.proposal.sections;
  const nameOf = valueNames(proposal, displays);
  const headline = proposal.headline;
  const headlineFigure = displays.get(headline.investment.price.figure);
  const headlineSuperseded = headline.investment.price.superseded === null ? undefined : displays.get(headline.investment.price.superseded);
  const stillReading = headline.stillReading === null ? undefined : displays.get(headline.stillReading);
  const scopeIn = proposal.scope.systems.filter((system) => displays.has(system.decision));
  const exclusions = proposal.investment.exclusions.filter((id) => displays.has(id));
  const prices = new Set(proposal.investment.outputs.flatMap((output) => (output.price === null ? [] : [output.price.figure])));
  // Rule 11's sentences once each, as the stored proposal shows them (G2-7): the interface points in the points
  // section (R-112), a system's sentence on its scope row; the life-safety section holds any other, and is left out
  // when none is left (none is dropped: each prints somewhere).
  const printedElsewhere = new Set<string>([
    ...(displays.has(proposal.points.interfacePoints) ? [proposal.points.interfacePoints] : []),
    ...scopeIn.flatMap((system) => (system.sentence !== null && displays.has(system.sentence) ? [system.sentence] : [])),
  ]);
  const lifeSafety = proposal.lifeSafety.filter((id) => !printedElsewhere.has(id) && displays.has(id));
  return (
    <main id="main" className="sov-print" data-proposal-print="">
      <PrintFrame demoLine={response.project.demoLine}>
        <header className="sov-print__cover" data-print-section="cover">
          <h1>{copy.proposal.title}</h1>
          <p className="sov-print__subtitle">{copy.print.coverSubtitle}</p>
          <div className="sov-print__project">
            <Shown displays={displays} id={cover.projectName} label={null} />
          </div>
          <Shown displays={displays} id={proposal.generatedOn} label={copy.proposal.generatedOn} />
          {proposal.latest ? null : <p className="sov-print__note">{copy.proposal.earlierVersion}</p>}
        </header>

        <Section id="headline" heading={sections.headline}>
          <ul className="sov-print__rows">
            {headlineFigure === undefined ? null : (
              <Row>
                <Price display={headlineFigure} {...(headlineSuperseded === undefined ? {} : { superseded: headlineSuperseded })} />
              </Row>
            )}
            {stillReading === undefined ? null : (
              <Row>
                <StatusLine display={stillReading} />
              </Row>
            )}
          </ul>
        </Section>

        <Section id="investment" heading={sections.investment}>
          <OutputRows displays={displays} outputs={proposal.investment.outputs} nameOf={nameOf} />
          {exclusions.length === 0 ? null : (
            <div className="sov-print__group" data-print-exclusions="">
              <h3>{sections.exclusions}</h3>
              <ul className="sov-print__rows">
                {exclusions.map((id) => {
                  // An excluded system's decision as the snapshot used it, named by its system (G10-7), as on screen.
                  const system = proposal.scope.systems.find((entry) => entry.decision === id);
                  const name = system === undefined ? undefined : systemName(system.systemId);
                  return (
                    <Row key={id} {...(name === undefined ? {} : { name })} attributes={{ 'data-excluded': system?.systemId ?? '' }}>
                      <Shown displays={displays} id={id} {...(name === undefined ? {} : { label: null })} />
                    </Row>
                  );
                })}
              </ul>
            </div>
          )}
        </Section>

        <Section id="points" heading={sections.points}>
          <OutputRows displays={displays} outputs={proposal.points.outputs} nameOf={nameOf}>
            {displays.has(proposal.points.interfacePoints) ? (
              <Row attributes={{ 'data-interface-points': '' }}>
                <Shown displays={displays} id={proposal.points.interfacePoints} />
              </Row>
            ) : null}
          </OutputRows>
        </Section>

        <Section id="energy" heading={sections.energy}>
          <OutputRows displays={displays} outputs={proposal.energy.outputs} nameOf={nameOf} />
        </Section>

        <Section id="indicators" heading={sections.indicators}>
          <ul className="sov-print__rows">
            {proposal.indicators
              .filter((entry) => displays.has(entry.display))
              .map((entry) => (
                <Row key={entry.indicator} name={nameOf(entry.display)}>
                  <Shown displays={displays} id={entry.display} label={null} />
                </Row>
              ))}
          </ul>
        </Section>

        <Section id="measures" heading={sections.measures}>
          <OutputRows displays={displays} outputs={proposal.measures.outputs} nameOf={nameOf} />
        </Section>

        <Section id="scope" heading={sections.scope}>
          <ul className="sov-print__rows">
            {scopeIn.map((system) => (
              <Row key={system.systemId} name={systemName(system.systemId)} attributes={{ 'data-system': system.systemId }}>
                <Shown displays={displays} id={system.decision} label={null} />
                {system.sentence === null ? null : <Shown displays={displays} id={system.sentence} />}
              </Row>
            ))}
          </ul>
        </Section>

        {lifeSafety.length === 0 ? null : (
          <Section id="life-safety" heading={sections.lifeSafety}>
            <ValueRows displays={displays} ids={lifeSafety} />
          </Section>
        )}

        <Section id="basis" heading={sections.basis}>
          {proposal.basis.some((id) => displays.has(id)) ? (
            <>
              <p className="sov-print__lead">{copy.proposal.basisIntro}</p>
              <BasisTable displays={displays} ids={proposal.basis} nameOf={nameOf} />
            </>
          ) : (
            <p className="sov-print__lead">{copy.proposal.basisNone}</p>
          )}
        </Section>

        {proposal.drafted.length === 0 ? null : (
          <Section id="drafted" heading={sections.drafted}>
            {proposal.drafted.map((paragraph) => (
              <Drafted key={paragraph.slot} displays={displays} segments={paragraph.segments} />
            ))}
          </Section>
        )}

        <div className="sov-print__appendix">
          <Section id="appendix" heading={copy.print.appendixHeading}>
            <p className="sov-print__lead">{copy.print.appendixIntro}</p>
            <AppendixRows displays={displays} ids={appendix.values} nameOf={nameOf} prices={prices} />
          </Section>
          <Section id="open-items" heading={copy.print.openItemsHeading}>
            <OpenItemsList displays={displays} items={appendix.openItems} />
          </Section>
        </div>
      </PrintFrame>
    </main>
  );
}
